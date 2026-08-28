// === BEHAVIOURAL DETECTION & ABUSE LIMITS ===
//
// Everything in nftSecurity.ts matches known patterns. That works until an
// attacker reads the patterns and words around them.
//
// This file doesn't look at what a message says. It looks at what an account
// DOES — how fast, how new, how similar to everyone else who just joined. You
// can reword a scam. It is much harder to change the shape of the behaviour,
// because the behaviour is what makes the attack profitable.

import { stateGet, stateSet, stateIncr } from "./state";

// ---------------------------------------------------------------------------
// 1. WEBHOOK RATE LIMITING
// ---------------------------------------------------------------------------
//
// Telegram will push every update to us, and on Vercel every update costs an
// invocation. Someone who wants to run up your bill just has to flood a group.
//
// This is a circuit breaker, not moderation: it sheds load before the expensive
// work starts. Deliberately generous — real chat should never reach it.

const GLOBAL_UPDATES_PER_MINUTE = 600;   // across everything
const CHAT_UPDATES_PER_MINUTE = 240;     // one group
const USER_UPDATES_PER_MINUTE = 60;      // one account

export interface WebhookVerdict {
  allow: boolean;
  reason?: string;
}

export async function checkWebhookLimits(
  chatId: number | undefined,
  userId: number | undefined,
): Promise<WebhookVerdict> {
  const minute = Math.floor(Date.now() / 60000);

  try {
    const globalCount = await stateIncr(`w:rl:global:${minute}`, 120);
    if (globalCount > GLOBAL_UPDATES_PER_MINUTE) {
      return { allow: false, reason: "global update flood" };
    }

    if (chatId) {
      const chatCount = await stateIncr(`w:rl:chat:${chatId}:${minute}`, 120);
      if (chatCount > CHAT_UPDATES_PER_MINUTE) {
        return { allow: false, reason: `chat ${chatId} flood` };
      }
    }

    if (userId) {
      const userCount = await stateIncr(`w:rl:user:${userId}:${minute}`, 120);
      if (userCount > USER_UPDATES_PER_MINUTE) {
        return { allow: false, reason: `user ${userId} flood` };
      }
    }
  } catch {
    // If the limiter itself fails, let the message through. A broken counter
    // must never become a broken bot.
    return { allow: true };
  }

  return { allow: true };
}

// ---------------------------------------------------------------------------
// 2. BEHAVIOURAL PROFILE
// ---------------------------------------------------------------------------

interface Behaviour {
  firstSeen: number;
  messages: number;
  links: number;
  mentions: number;
  forwards: number;
  media: number;
  recentHashes: string[];   // shape of recent messages, for repetition
  lastMessageAt: number;
  distinctChats: number[];  // same account posting across several groups
}

const EMPTY: Behaviour = {
  firstSeen: 0, messages: 0, links: 0, mentions: 0, forwards: 0, media: 0,
  recentHashes: [], lastMessageAt: 0, distinctChats: [],
};

const behaviourKey = (userId: number | string) => `w:behav:${userId}`;
const BEHAVIOUR_TTL = 30 * 24 * 60 * 60;

/** Cheap structural fingerprint — length band, link/mention counts, digit density. */
function shapeOf(text: string): string {
  const len = Math.min(9, Math.floor(text.length / 40));
  const links = (text.match(/https?:\/\/|t\.me\//gi) || []).length;
  const mentions = (text.match(/@\w+/g) || []).length;
  const digits = Math.round(((text.match(/\d/g) || []).length / Math.max(1, text.length)) * 10);
  return `${len}-${links}-${mentions}-${digits}`;
}

export interface AnomalyVerdict {
  score: number;        // 0-100
  reasons: string[];
  action: "none" | "flag" | "restrict";
}

/**
 * Record this message and judge the account's behaviour.
 * Nothing here reads the meaning of the text — only its shape and timing.
 */
export async function assessBehaviour(opts: {
  userId: number;
  chatId: number;
  text: string;
  isForward: boolean;
  hasMedia: boolean;
  accountIsNew: boolean;
  isTrusted: boolean;
}): Promise<AnomalyVerdict> {
  const { userId, chatId, text, isForward, hasMedia, accountIsNew, isTrusted } = opts;
  const now = Date.now();
  const reasons: string[] = [];
  let score = 0;

  const b = await stateGet<Behaviour>(behaviourKey(userId), { ...EMPTY, firstSeen: now });
  if (!b.firstSeen) b.firstSeen = now;

  const hasLink = /https?:\/\/|t\.me\//i.test(text);
  const mentionCount = (text.match(/@\w+/g) || []).length;

  b.messages++;
  if (hasLink) b.links++;
  if (mentionCount) b.mentions += mentionCount;
  if (isForward) b.forwards++;
  if (hasMedia) b.media++;

  b.recentHashes.push(shapeOf(text));
  if (b.recentHashes.length > 12) b.recentHashes.shift();

  if (!b.distinctChats.includes(chatId)) b.distinctChats.push(chatId);
  if (b.distinctChats.length > 20) b.distinctChats.shift();

  const ageMs = now - b.firstSeen;
  const gap = b.lastMessageAt ? now - b.lastMessageAt : Infinity;
  b.lastMessageAt = now;

  await stateSet(behaviourKey(userId), b, BEHAVIOUR_TTL);

  // Trusted regulars are exempt. The point is to catch accounts with no history.
  if (isTrusted) return { score: 0, reasons: [], action: "none" };

  // --- signals ---

  // A link inside the first minute of a first-ever message. Real people say
  // hello first. This is the single strongest signal in the whole file.
  if (hasLink && b.messages <= 2 && ageMs < 60_000) {
    score += 45;
    reasons.push("first message contains a link");
  }

  // Almost everything this account has ever said contained a link.
  if (b.messages >= 4 && b.links / b.messages > 0.7) {
    score += 30;
    reasons.push(`${Math.round((b.links / b.messages) * 100)}% of their messages carry links`);
  }

  // Same message shape over and over — the signature of a copy-paste script,
  // even when the wording is rotated to beat keyword filters.
  if (b.recentHashes.length >= 5) {
    const unique = new Set(b.recentHashes.slice(-6)).size;
    if (unique <= 2) {
      score += 25;
      reasons.push("repeating message structure");
    }
  }

  // Machine-fast posting.
  if (gap < 800 && b.messages > 3) {
    score += 20;
    reasons.push("posting faster than a person types");
  }

  // Brand-new account behaving like a distributor.
  if (accountIsNew && (hasLink || isForward)) {
    score += 25;
    reasons.push("new account posting links or forwards");
  }

  // Mention spraying below the mass-mention threshold, repeatedly.
  if (b.messages >= 3 && b.mentions / b.messages >= 3) {
    score += 20;
    reasons.push("persistent mention spraying");
  }

  // Forward-only account — a relay, not a member.
  if (b.messages >= 5 && b.forwards / b.messages > 0.8) {
    score += 15;
    reasons.push("posts almost nothing but forwards");
  }

  // Same account working several groups at once.
  if (b.distinctChats.length >= 4 && b.messages < 30) {
    score += 15;
    reasons.push(`active in ${b.distinctChats.length} groups with little history`);
  }

  score = Math.min(100, score);
  const action = score >= 60 ? "restrict" : score >= 35 ? "flag" : "none";
  return { score, reasons, action };
}

// ---------------------------------------------------------------------------
// 3. COORDINATED JOIN DETECTION
// ---------------------------------------------------------------------------
//
// Raid detection counts joins. This looks at whether the accounts that joined
// then behaved as one — several new arrivals posting the same shape of message
// inside a short window. That is a campaign, not a coincidence.

const campaignKey = (chatId: number | string) => `w:campaign:${chatId}`;
const CAMPAIGN_WINDOW_MS = 10 * 60 * 1000;

export async function checkCoordinatedPosting(
  chatId: number,
  userId: number,
  text: string,
): Promise<{ detected: boolean; count: number } | null> {
  const shape = shapeOf(text);
  if (!/https?:\/\/|t\.me\//i.test(text)) return null; // only links matter here

  const now = Date.now();
  const entries = await stateGet<{ userId: number; shape: string; at: number }[]>(
    campaignKey(chatId), [],
  );

  const recent = entries.filter(e => now - e.at < CAMPAIGN_WINDOW_MS);
  recent.push({ userId, shape, at: now });
  await stateSet(campaignKey(chatId), recent.slice(-40), 30 * 60);

  const matching = recent.filter(e => e.shape === shape);
  const distinctUsers = new Set(matching.map(e => e.userId));

  if (distinctUsers.size >= 3) {
    return { detected: true, count: distinctUsers.size };
  }
  return null;
}
