import { Bot, Context, session, InputFile } from "grammy";
import OpenAI from "openai";
import { db } from "./db";
import { registerBotApi, activateCommunity, deactivateCommunity, makeComplimentary, banCommunity } from "./communityService";
import { type Community as CommunityDbRow, communityProfiles, memberScores, userMemory, moderationStats, userModerationStatus, chatModerationSettings, qaCache, trustScores, banEvents, newUserMessages, violationLogs, chatFeatureSettings, communities, globalBans } from "@shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { generateImageBuffer } from "./imageGen";
import * as RiftLore from "./riftLore";
import { stateGet, stateSet, stateDel, stateUpdate, stateScan, KEYS, TTL } from "./state";
import {
  detectFakeVerificationBot, detectDomainImpersonation, detectMintBait,
  isSuspiciousBotName, detectAdminCompromise, hasHomoglyphs,
} from "./nftSecurity";
import { assessBehaviour, checkCoordinatedPosting } from "./behaviour";
import * as StoryBible from "./riftLore";

// === BOT TOKEN ===
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Fresh BotFather identity and immutable owner identity.
const BOT_USERNAME = (process.env.BOT_USERNAME || "RiftWardenBot").replace(/^@/, "");
const BOT_PUBLIC_URL = (process.env.BOT_PUBLIC_URL || `https://t.me/${BOT_USERNAME}`).trim();
const GLOBAL_OWNER_USER_ID = process.env.GLOBAL_OWNER_USER_ID || "";
const TREEFITTY_USER_ID = process.env.TREEFITTY_USER_ID || "";
const DAVEYJON_USER_ID = process.env.DAVEYJON_USER_ID || "";
const RAINZY_USER_ID = process.env.RAINZY_USER_ID || "";
const OFFICIAL_CONTRACT_ADDRESSES = new Set(
  (process.env.OFFICIAL_CONTRACT_ADDRESSES || "")
    .split(",").map(v => v.trim().toLowerCase()).filter(Boolean)
);
const OWNER_CONTACT_USERNAME = (process.env.OWNER_CONTACT_USERNAME || "").replace(/^@/, "").trim();
const OWNER_CONTACT = OWNER_CONTACT_USERNAME ? `@${OWNER_CONTACT_USERNAME}` : "the project owner";
const OFFICIAL_WEBSITE_URL = (process.env.OFFICIAL_WEBSITE_URL || "").trim();
const OFFICIAL_TELEGRAM_URL = (process.env.OFFICIAL_TELEGRAM_URL || "").trim();
const PUBLIC_URL = (process.env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
const RIFT_RADIO_URL = (process.env.RIFT_RADIO_URL || (PUBLIC_URL ? `${PUBLIC_URL}/rift-radio.html` : "")).trim();
const COMMUNITY_TIMEZONE = (process.env.COMMUNITY_TIMEZONE || "Australia/Hobart").trim();

// === OpenAI Client ===
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// === SESSION DATA ===
interface UserMemoryData {
  messageCount: number;
  positiveScore: number;
  negativeScore: number;
  lastMessages: string[];
  flaggedForTone: boolean;
}

interface SessionData {
  wardenMode: boolean;
  userMemory: Map<string, UserMemoryData>;
  lastActivityTime: number;
}

type MyContext = Context & { session: SessionData };

// === CONTENT DATA ===
const PROJECT_LINK_LINES = [
  OFFICIAL_WEBSITE_URL ? `Website: ${OFFICIAL_WEBSITE_URL}` : null,
  OFFICIAL_TELEGRAM_URL ? `Telegram community: ${OFFICIAL_TELEGRAM_URL}` : null,
  `Warden bot: ${BOT_PUBLIC_URL}`,
].filter(Boolean).join("\n");

const PROJECT_INFO = RiftLore.PROJECT_INFO + `

Links:
${PROJECT_LINK_LINES}

Important: these are collectibles and original art. Nothing here is an
investment and no returns are promised.`;

const LEGAL_POINTS = [
  "Not investments, securities, or financial products",
  "No returns, income, or appreciation promised",
  "Art, canon, and community only",
  "There is no ERC-20 token and there will not be one",
  "Reward eligibility is a rule set, not an entitlement",
  "Only mint if you want the piece and can afford to lose the money"
];

// Educator content. The Warden teaches; it does not tell jokes.
const FACTS = [
  "The thylacine was declared extinct in 1936. Tasmania still logs sighting reports most years. None has ever been confirmed.",
  "A wedge-tailed eagle can carry a two-metre wingspan and hardly move a feather holding it.",
  "The lyrebird mimics whatever it hears — chainsaws, shutters, car alarms. It learns the bush it lives in, including the parts we brought with us.",
  "The Tasmanian devil's jaw, pound for pound, bites harder than almost any land mammal alive.",
  "Wombats produce cube-shaped droppings. The corners stop them rolling off the rocks they're used to mark.",
  "The platypus has no stomach. Food goes from gullet straight to intestine.",
  "Australian magpies remember individual human faces for years, and hold the grudge for just as long.",
  "Eucalypts don't merely survive fire. Many need it — the heat is what opens the seed.",
  "The saltwater crocodile is the largest living reptile, and it was here long before any of the stories about it.",
  "Base is an Ethereum layer-2. Cheaper to transact, same underlying security model. That is the whole reason Genesis lives there."
];

// Fallback lines for the escalation path. The Warden closes an exchange down;
// it does not trade insults and never escalates for sport.
const FIRM_RULINGS = [
  "You're welcome to be wrong quietly.",
  "That's a no. Not a difficult no, but a no.",
  "The record disagrees with you.",
  "Asked and answered.",
  "I've written it down. That's as far as this goes.",
  "Try that again when you've read the pinned message.",
  "No.",
  "I'll leave that one where it fell."
];

// The two hard-locked pieces. Everything else is provisional and the Warden
// will not describe it.
const CHARACTERS = RiftLore.LOCKED_PIECES.map(p => ({
  name: `${p.id} ${p.name}`,
  desc: p.detail
}));

// === WARDEN PERSONALITY SYSTEM ===

// Dry lines dropped in occasionally. Rate is deliberately low.
const WARDEN_LINES = RiftLore.WARDEN_LINES;

// Recurring register the Warden falls back into. Not running gags — the Warden
// does not have a comedy bit. These are the three things it actually cares
// about: the record, the Gateway, and people reading before asking.
const WARDEN_REGISTER = {
  record: [
    "It's in the record. The record doesn't move.",
    "Written down at the time, which is why I'm not arguing about it now.",
    "I keep the record. I don't decorate it.",
    "That went in the log the moment it happened.",
    "The log is boring on purpose."
  ],
  gateway: [
    "The Gateway was here before any of us and will be here after.",
    "Things come through. Not all of them are explained.",
    "Some of it stays shut. That's the arrangement.",
    "I watch the Gateway. I don't open it on request.",
    "Beyond it is beyond it."
  ],
  reading: [
    "It's pinned. Reading it costs you nothing.",
    "The site says this, in more words and better ones.",
    "Half of what gets asked here is already written down.",
    "Read first. Then ask, and I'll answer properly.",
    "The Rulebook exists so I don't have to be the Rulebook."
  ]
};

// Time-of-day register. Australian Eastern time — this is an Australian project.
function getWardenMood(): { mood: string; prefix: string } {
  const now = new Date();
  const hour = new Date(
    now.toLocaleString("en-US", { timeZone: "Australia/Hobart" })
  ).getHours();

  if (hour >= 5 && hour < 9) {
    return {
      mood: "early",
      prefix: ["Early.", "Sun's barely up.", "First light. Go on.", ""][
        Math.floor(Math.random() * 4)
      ]
    };
  } else if (hour >= 9 && hour < 12) {
    return {
      mood: "working",
      prefix: ["", "Right.", "Go ahead."][Math.floor(Math.random() * 3)]
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      mood: "steady",
      prefix: ["", "", ""][Math.floor(Math.random() * 3)]
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      mood: "evening",
      prefix: ["", "Evening.", "Quieter now."][Math.floor(Math.random() * 3)]
    };
  } else {
    return {
      mood: "late",
      prefix: ["Late one.", "You're up.", "", "Night shift."][
        Math.floor(Math.random() * 4)
      ]
    };
  }
}

// Reaction responses for specific situations
const WARDEN_REACTIONS = RiftLore.REACTIONS;

// The Warden does not post reaction images.
// wardenReply is kept as a plain-reply shim so existing call sites keep
// working without a rewrite — it now just sends text.
async function wardenReply(
  ctx: Context,
  text: string,
  _options?: {
    forceGif?: boolean;
    gifCategory?: string;
    gifChance?: number;
  }
): Promise<void> {
  await ctx.reply(text);
}


// === FEATURE TOGGLE SYSTEM ===

export interface FeatureSettings {
  spam: boolean;
  scam: boolean;
  hate: boolean;
  raid: boolean;
  links: boolean;
  edits: boolean;
  files: boolean;
  impersonation: boolean;
  newuser: boolean;
  personality: boolean;
  learning: boolean;
  scheduled: boolean;
  giveaways: boolean;
  games: boolean;
  trust: boolean;
  stories: boolean;
  captcha: boolean;
  accountAge: boolean;
  massMention: boolean;
  bioScan: boolean;
  crossBan: boolean;
  aiChat: boolean;
}

const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  spam: true, scam: true, hate: true,
  raid: true, links: true, edits: true, files: true, impersonation: true,
  newuser: true, personality: true, learning: true,
  scheduled: true, giveaways: true, games: true,
  trust: true, stories: false,
  captcha: true, accountAge: true, massMention: true, bioScan: true,
  crossBan: true, aiChat: true,
};

const FEATURE_LABELS: Record<keyof FeatureSettings, string> = {
  spam: "Anti-Spam / Flood Control",
  scam: "Scam & Phishing Protection",
  hate: "Hate Speech Filter",
  raid: "Anti-Raid Mode",
  links: "Link Control (New Users)",
  edits: "Message Edit Tracking",
  files: "Dangerous File Blocking",
  impersonation: "Admin Impersonation Detection",
  newuser: "New User Restrictions",
  personality: "Warden Voice (dry asides, time-of-day register)",
  learning: "Bot Learning System",
  scheduled: "Scheduled Posts",
  giveaways: "Giveaway System",
  games: "Games (Trivia/Puzzle)",
  trust: "Trust System",
  stories: "Story Entries (admin-invoked only, never auto-posted)",
  captcha: "CAPTCHA Verification Gate (new joins)",
  accountAge: "New Account Age Gate (block brand-new Telegram accounts)",
  massMention: "Mass-Mention Spam Detection (5+ @s in one message)",
  bioScan: "Profile Bio Scanning (scam check at join)",
  crossBan: "Cross-Group Ban Sync (a ban here blocks them in every group I manage)",
  aiChat: "AI Chat Responses (GPT-4o-mini, lore-guarded)",
};

// Features available on the free/expired tier — basic safety only.
// Everything else requires an active subscription (paid, trial, or complimentary).
const FREE_FEATURE_KEYS = new Set<keyof FeatureSettings>([
  "spam", "scam", "hate", "links", "files", "newuser",
]);

// Feature groups for organized /settings display
const FEATURE_GROUPS: { label: string; keys: (keyof FeatureSettings)[] }[] = [
  {
    label: "SAFETY FILTERS (FREE on all tiers)",
    keys: ["spam", "scam", "hate", "links", "files", "newuser"],
  },
  {
    label: "SECURITY GATES",
    keys: ["captcha", "accountAge", "bioScan", "massMention", "edits", "impersonation", "raid", "crossBan"],
  },
  {
    label: "AI & PERSONALITY",
    keys: ["aiChat", "personality", "learning", "stories"],
  },
  {
    label: "COMMUNITY FEATURES",
    keys: ["trust", "games", "giveaways", "scheduled"],
  },
];

// Human-readable upgrade card shown when a free/expired group tries a paid command
function buildUpgradePrompt(botName = "The Warden"): string {
  return (
    `This is a PAID feature.\n\n` +
    `Your community is on the FREE TIER. Upgrade to unlock:\n\n` +
    `🔒 Anti-Raid Mode\n` +
    `🔒 Message Edit Tracking\n` +
    `🔒 Admin Impersonation Detection\n` +
    `🔒 Warden Voice\n` +
    `🔒 Bot Learning System\n` +
    `🔒 Scheduled Daily Posts\n` +
    
    `🔒 Games (Trivia / Puzzle)\n` +
    `🔒 Full Trust System\n` +
    `🔒 CAPTCHA + Account Age Gates\n` +
    `🔒 AI Chat Responses (/ask)\n` +
    `🔒 Story Entries\n` +
    `🔒 Bio Scanning + Mass-Mention Detection\n\n` +
    `Contact ${OWNER_CONTACT} to activate your subscription.`
  );
}

// In-memory cache — avoids a DB hit on every message
const featureSettingsCache = new Map<string, FeatureSettings>();

// CAPTCHA pending verifications — key: `${chatId}_${userId}`

// Bio scam phrases checked via getChat() at join time
const BIO_SCAM_PHRASES = [
  "dm for signals", "dm for profits", "dm for trades", "signal provider",
  "guaranteed profits", "investment manager", "recovery specialist",
  "contact me for", "binary trading", "forex trader", "pump signals",
  "free crypto", "free signals", "crypto manager", "wallet recovery",
  "earn daily", "passive income trader",
];

// Telegram user IDs are sequential. IDs above this threshold were created in 2025-2026.
// Used as a heuristic for the accountAge gate — not 100% precise but good enough.
function isNewAccountHeuristic(userId: number): boolean {
  return userId > 7_500_000_000;
}

// Record a user in the cross-group global ban list
async function recordGlobalBan(
  userId: string, username: string | undefined, displayName: string | undefined,
  chatId: string, reason: string
): Promise<void> {
  try {
    await db.insert(globalBans).values({ userId, username, displayName, bannedInChatId: chatId, reason })
      .onConflictDoNothing();
  } catch { /* already recorded */ }
}

// Check if a user exists in the global ban list
async function isGloballyBanned(userId: string): Promise<boolean> {
  try {
    const rows = await db.select().from(globalBans).where(eq(globalBans.userId, userId)).limit(1);
    return rows.length > 0;
  } catch { return false; }
}

async function getFeatureSettings(chatId: string): Promise<FeatureSettings> {
  if (featureSettingsCache.has(chatId)) return featureSettingsCache.get(chatId)!;
  try {
    const rows = await db.select().from(chatFeatureSettings).where(eq(chatFeatureSettings.chatId, chatId)).limit(1);
    if (rows.length === 0) {
      await db.insert(chatFeatureSettings).values({ chatId }).onConflictDoNothing();
      const settings = { ...DEFAULT_FEATURE_SETTINGS };
      featureSettingsCache.set(chatId, settings);
      return settings;
    }
    const r = rows[0];
    const settings: FeatureSettings = {
      spam: r.spam, scam: r.scam, hate: r.hate,
      raid: r.raid, links: r.links, edits: r.edits, files: r.files,
      impersonation: r.impersonation, newuser: r.newuser,
      personality: r.personality, learning: r.learning, scheduled: r.scheduled,
      giveaways: r.giveaways, games: r.games,
      trust: r.trust, stories: r.stories,
      captcha: r.captcha, accountAge: r.accountAge, massMention: r.massMention,
      bioScan: r.bioScan,
      crossBan: r.crossBan,
      aiChat: r.aiChat,
    };
    featureSettingsCache.set(chatId, settings);
    return settings;
  } catch (err) {
    console.error(`[FeatureSettings] DB error for chat ${chatId} — falling back to all-ON defaults:`, err);
    return { ...DEFAULT_FEATURE_SETTINGS };
  }
}

async function updateFeatureSetting(chatId: string, feature: keyof FeatureSettings, value: boolean): Promise<void> {
  await db.insert(chatFeatureSettings)
    .values({ chatId, [feature]: value })
    .onConflictDoUpdate({ target: chatFeatureSettings.chatId, set: { [feature]: value } });
  const cached = featureSettingsCache.get(chatId) || { ...DEFAULT_FEATURE_SETTINGS };
  cached[feature] = value;
  featureSettingsCache.set(chatId, cached);
}

// === ADMIN PORTAL HOOKS — exported for server/adminRoutes.ts ===
export function invalidateFeatureCache(chatId: string): void {
  featureSettingsCache.delete(chatId);
}
export function invalidateCommunityCache(chatId: string): void {
  communityCache.delete(chatId);
}
export function invalidateAllCaches(): void {
  featureSettingsCache.clear();
  communityCache.clear();
}
let _botInstance: Bot<MyContext> | null = null;
export function getBotInstance(): Bot<MyContext> | null { return _botInstance; }
export function setBotInstance(b: Bot<MyContext>): void { _botInstance = b; }

// === MULTI-COMMUNITY SAAS SYSTEM ===

interface CommunityRecord {
  chatId: string;
  displayName: string;
  botNickname: string;
  welcomeMessage: string | null;
  timezone: string;
  status: string; // trial | active | free | banned
  trialExpiresAt: Date | null;
  isOnboarded: boolean;
  onboardingStep: number;
  botAdminIds: string[]; // Per-community bot admin override list (user IDs)
}

const communityCache = new Map<string, CommunityRecord>();

function mapCommunityRow(r: CommunityDbRow): CommunityRecord {
  return {
    chatId: r.chatId,
    displayName: r.displayName || "Community",
    botNickname: r.botNickname || "The Warden",
    welcomeMessage: r.welcomeMessage || null,
    timezone: r.timezone || COMMUNITY_TIMEZONE,
    status: r.status || "trial",
    trialExpiresAt: r.trialExpiresAt ? new Date(r.trialExpiresAt) : null,
    isOnboarded: r.isOnboarded || false,
    onboardingStep: r.onboardingStep || 0,
    botAdminIds: Array.isArray(r.botAdminIds) ? r.botAdminIds : [],
  };
}

async function getCommunity(chatId: string): Promise<CommunityRecord | null> {
  if (communityCache.has(chatId)) return communityCache.get(chatId)!;
  try {
    const rows = await db.select().from(communities).where(eq(communities.chatId, chatId)).limit(1);
    if (rows.length === 0) return null;
    const community = mapCommunityRow(rows[0]);
    communityCache.set(chatId, community);
    return community;
  } catch (err) {
    console.error(`[Community] DB error for chat ${chatId}:`, err);
    return null;
  }
}

async function ensureCommunity(chatId: string, displayName?: string): Promise<CommunityRecord> {
  const existing = await getCommunity(chatId);
  if (existing) return existing;
  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(communities).values({
    chatId,
    displayName: displayName || "Community",
    status: "trial",
    trialExpiresAt,
  }).onConflictDoNothing();
  const community: CommunityRecord = {
    chatId,
    displayName: displayName || "Community",
    botNickname: "The Warden",
    welcomeMessage: null,
    timezone: COMMUNITY_TIMEZONE,
    status: "trial",
    trialExpiresAt,
    isOnboarded: false,
    onboardingStep: 0,
    botAdminIds: [],
  };
  communityCache.set(chatId, community);
  return community;
}

function isSubscribed(community: CommunityRecord): boolean {
  if (community.status === "active") return true;
  if (community.status === "complimentary") return true;
  if (community.status === "trial") {
    if (!community.trialExpiresAt) return true;
    return community.trialExpiresAt > new Date();
  }
  return false;
}

function getStatusLabel(community: CommunityRecord): string {
  if (community.status === "banned") return "BANNED";
  if (community.status === "active") return "ACTIVE (Paid)";
  if (community.status === "complimentary") return "COMPLIMENTARY (Full Access — Free Gift)";
  if (community.status === "trial") {
    const now = new Date();
    if (!community.trialExpiresAt || community.trialExpiresAt > now) {
      const days = community.trialExpiresAt
        ? Math.max(0, Math.ceil((community.trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 7;
      return `TRIAL (${days} day${days !== 1 ? "s" : ""} remaining)`;
    }
    return `TRIAL EXPIRED — contact ${OWNER_CONTACT} to upgrade`;
  }
  return "FREE TIER — upgrade to unlock all features";
}

interface CommunityUpdates {
  displayName?: string;
  botNickname?: string;
  welcomeMessage?: string | null;
  timezone?: string;
  status?: string;
  trialExpiresAt?: Date | null;
  isOnboarded?: boolean;
  onboardingStep?: number;
  botAdminIds?: string[];
}

async function updateCommunity(chatId: string, updates: CommunityUpdates): Promise<void> {
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) cleanUpdates[key] = val;
  }
  await db.update(communities)
    .set({ ...cleanUpdates, updatedAt: new Date() })
    .where(eq(communities.chatId, chatId));
  const cached = communityCache.get(chatId);
  if (cached) communityCache.set(chatId, { ...cached, ...updates });
}

// In-memory setup wizard state per chat (cleared when wizard completes or bot restarts)
interface SetupWizardState {
  step: number; // 1=name, 2=timezone, 3=welcome, 4=features
  initiatorId: number;
  displayName?: string;
  timezone?: string;
  welcomeMessage?: string | null;
}
const setupWizardState = new Map<string, SetupWizardState>();

// Canonical list of feature keys shown in the setup wizard
const WIZARD_FEATURE_KEYS: (keyof FeatureSettings)[] = [
  "spam", "scam", "hate", "raid",
  "links", "edits", "files", "impersonation", "newuser",
  "personality", "learning", "scheduled",
  "giveaways", "games", "trust", "stories",
  "captcha", "accountAge", "massMention", "bioScan", "crossBan",
  "aiChat",
];


// Milestone messages for user achievements
const WARDEN_MILESTONES = {
  messages100: [
    "A hundred messages. You're a regular now, whether you meant to be or not.",
    "Hundred in. Noted.",
    "That's a hundred. The record has you down as someone who actually turns up.",
  ],
  messages500: [
    "Five hundred messages. That's not passing through, that's living here.",
    "Half a thousand. Written down.",
    "Five hundred. At this point you know the place better than most.",
  ],
  messages1000: [
    "A thousand messages. That is a genuinely absurd number and I mean that well.",
    "Four figures. The log has you on nearly every page.",
    "A thousand. I don't hand out much, but that gets a mention.",
  ],
  oneYear: [
    "A year here. Noted, and worth noting.",
    "Twelve months. Most people don't last a fortnight.",
    "One year on the record. Thanks for sticking around.",
  ]
};

// The Warden Mode responses when someone says "okay warden" or similar
const WARDEN_MODE_RESPONSES = [
  "You have my attention.",
  "Go on then.",
  "That's me. What do you need?",
  "Speaking.",
  "I'm here. I'm always here.",
  "Yes.",
];


// Helper to randomly add personality elements to responses
function addWardenFlair(baseResponse: string, options?: { includeMood?: boolean; includeGag?: boolean; includeCatchphrase?: boolean }): string {
  const parts: string[] = [];
  
  // 20% chance to add mood prefix
  if (options?.includeMood && Math.random() < 0.2) {
    const mood = getWardenMood();
    if (mood.prefix) parts.push(mood.prefix);
  }
  
  parts.push(baseResponse);
  
  // 15% chance to add a catchphrase
  if (options?.includeCatchphrase && Math.random() < 0.15) {
    parts.push(WARDEN_LINES[Math.floor(Math.random() * WARDEN_LINES.length)]);
  }
  
  // 15% chance to add a running gag
  if (options?.includeGag && Math.random() < 0.15) {
    const gagTypes = Object.keys(WARDEN_REGISTER) as (keyof typeof WARDEN_REGISTER)[];
    const gagType = gagTypes[Math.floor(Math.random() * gagTypes.length)];
    const gag = WARDEN_REGISTER[gagType][Math.floor(Math.random() * WARDEN_REGISTER[gagType].length)];
    parts.push(gag);
  }
  
  return parts.join("\n\n");
}

// === SCAM DETECTION PATTERNS ===
const SCAM_PATTERNS = {
  blackmail: ["i have your video", "i have your photos", "send me intimate", "pay me or i'll send", "bitcoin", "gift cards"],
  phishing: ["connect wallet to claim", "click here to secure your", "share your seed phrase", "approve this transaction", "send 0.1 eth", "limited time offer"],
  hacker: ["problem with your telegram", "send me the activation", "send me the login", "send me the 2fa", "send me the otp", "security alert", "your device is infected", "telegram premium subscription", "run this code", "install remote access", "anydesk", "teamviewer"],
  marketing: ["marketing", "promotion", "advertising", "sponsor", "partnership"],
  crypto: ["investment", "profit", "guaranteed", "double your", "airdrop"]
};

const SUSPICIOUS_USERNAMES = ["xxx", "porn", "nsfw", "onlyfans", "sex"];
const CRYPTO_ADDRESS_REGEX = /(0x[a-fA-F0-9]{40}|bc1[a-zA-HJ-NP-Z0-9]{25,39}|eth:|btc:)/i;

// === ADVANCED MODERATION SYSTEM ===

// === RAID DETECTION ===
interface JoinEvent {
  userId: string;
  timestamp: number;
}

// Track recent joins per chat for raid detection

// Lockdown mode per chat

// Raid detection settings
const RAID_THRESHOLD = 5; // Number of joins to trigger raid alert
const RAID_WINDOW = 120000; // 2 minutes in milliseconds
const LOCKDOWN_DURATION = 300000; // 5 minutes lockdown

// Check if raid is happening and handle lockdown
async function trackJoinForRaid(chatId: string, userId: string): Promise<{ isRaid: boolean; joinCount: number }> {
  const now = Date.now();
  const cutoff = now - RAID_WINDOW;

  // Join history is durable: a raid that starts on one serverless invocation
  // must still be visible to the next one.
  const joins = await stateGet<JoinEvent[]>(KEYS.joins(chatId), []);
  joins.push({ userId, timestamp: now });
  const recentOnly = joins.filter(j => j.timestamp > cutoff);
  await stateSet(KEYS.joins(chatId), recentOnly, TTL.joins);

  const isRaid = recentOnly.length >= RAID_THRESHOLD;

  if (isRaid && !(await isInLockdown(chatId))) {
    await stateSet(KEYS.lockdown(chatId), { active: true, until: now + LOCKDOWN_DURATION }, TTL.lockdown);
  }

  return { isRaid, joinCount: recentOnly.length };
}

async function isInLockdown(chatId: string): Promise<boolean> {
  const lock = await stateGet<{ active: boolean; until: number } | null>(KEYS.lockdown(chatId), null);
  if (!lock) return false;

  if (Date.now() > lock.until) {
    await stateDel(KEYS.lockdown(chatId));
    return false;
  }

  return lock.active;
}

async function endLockdown(chatId: string): Promise<boolean> {
  const lock = await stateGet<{ active: boolean; until: number } | null>(KEYS.lockdown(chatId), null);
  if (lock) {
    await stateDel(KEYS.lockdown(chatId));
    return true;
  }
  return false;
}

// === ADMIN IMPERSONATION DETECTION ===

// Cache admin usernames per chat (refreshed on join events)
const adminCache = new Map<string, { usernames: string[]; lastUpdated: number }>();
const ADMIN_CACHE_TTL = 300000; // 5 minutes

// Levenshtein distance for similarity matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Check if username is similar to any admin (impersonation attempt)
function checkAdminImpersonation(newUsername: string, adminUsernames: string[]): { isImpersonation: boolean; similarTo: string | null; similarity: number } {
  if (!newUsername || adminUsernames.length === 0) {
    return { isImpersonation: false, similarTo: null, similarity: 0 };
  }
  
  const normalizedNew = newUsername.toLowerCase().replace(/[_\-\.0-9]/g, '');
  
  for (const admin of adminUsernames) {
    if (!admin) continue;
    
    const normalizedAdmin = admin.toLowerCase().replace(/[_\-\.0-9]/g, '');
    
    // Skip if they're exactly the same (could be the admin themselves)
    if (normalizedNew === normalizedAdmin) continue;
    
    // Skip very short usernames
    if (normalizedAdmin.length < 3 || normalizedNew.length < 3) continue;
    
    const distance = levenshteinDistance(normalizedNew, normalizedAdmin);
    const maxLen = Math.max(normalizedNew.length, normalizedAdmin.length);
    const similarity = 1 - (distance / maxLen);
    
    // High similarity (> 70%) and not exact match = suspicious
    if (similarity > 0.7 && similarity < 1.0) {
      return { isImpersonation: true, similarTo: admin, similarity };
    }
    
    // Also check for common impersonation patterns
    // Like adding underscores, numbers, or I/l/1 swaps
    const commonSwaps = [
      { pattern: /l/g, replace: '1' },
      { pattern: /i/g, replace: '1' },
      { pattern: /o/g, replace: '0' },
      { pattern: /e/g, replace: '3' },
      { pattern: /a/g, replace: '4' },
      { pattern: /s/g, replace: '5' },
    ];
    
    let swappedNew = normalizedNew;
    let swappedAdmin = normalizedAdmin;
    
    for (const swap of commonSwaps) {
      swappedNew = swappedNew.replace(swap.pattern, swap.replace);
      swappedAdmin = swappedAdmin.replace(swap.pattern, swap.replace);
    }
    
    if (swappedNew === swappedAdmin) {
      return { isImpersonation: true, similarTo: admin, similarity: 0.95 };
    }
  }
  
  return { isImpersonation: false, similarTo: null, similarity: 0 };
}

// Domain blocklist for known scam/phishing sites
const BLOCKED_DOMAINS = [
  "bit.ly", "tinyurl.com", // URL shorteners often used for scams (careful with allowlist)
  "walletconnect.to", "metamask-airdrop", "opensea-claim",
  "eth-claim", "bnb-airdrop", "trust-wallet-claim",
  "phantom-airdrop", "solana-drop", "mint-nft-free",
  "uniswap-airdrop", "pancakeswap-reward", "coinbase-giveaway",
  "binance-bonus", "crypto-reward", "nft-mint-free",
  "telegram-premium", "tg-premium-free", "free-usdt",
  "double-btc", "send-eth-receive", "guaranteed-profit",
];

// Short link domains - URL shorteners used to hide scam links
const SHORT_LINK_DOMAINS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "adf.ly", "bit.do", "mcaf.ee", "su.pr", "twit.ac", "cutt.ly", "rb.gy",
  "shorturl.at", "tiny.cc", "url.ie", "v.gd", "x.co", "1url.com", "hyperurl.co"
];

// Wallet drainer phrases - scam attempts to steal crypto
const WALLET_DRAINER_PHRASES = [
  "verify your wallet", "sync your wallet", "connect to claim", "rectify your wallet",
  "validate your wallet", "restore your wallet", "update your wallet", "secure your wallet",
  "wallet verification required", "confirm your wallet", "authenticate your wallet",
  "wallet sync required", "dapp connection", "web3 validation"
];

// Inferno Drainer + other known drainer infrastructure domains (permit/approve attack vector)
const INFERNO_DRAINER_DOMAINS = [
  // Inferno Drainer family
  "infernodrain", "inferno-drainer", "infernodrainer", "inferno-drain",
  // Other named drainer families
  "pink-drainer", "angel-drainer", "venom-drainer", "ms-drainer",
  "monkey-drainer", "vulture-drainer", "rainbow-drainer", "ape-drainer",
  // Permit / approve attack infrastructure
  "eth-approve", "approve-eth", "signpermit", "permit-sign", "wallet-approve",
  "token-approve", "approve-token", "unlimited-approve", "approve-unlimited",
  "permit2-claim", "uniswap-permit", "metamask-permit",
  "connect-approve", "dapp-approve", "web3-approve",
  // Fragment lookalikes (username-sale scam → permit signature trap)
  "fragment-io", "fragmnt", "fragmentt", "fragment-ton", "fragmentsale",
  "t-fragment", "ton-fragment", "fragment-market",
  // Generic drainer URL fragments
  "wallet-drain", "crypto-drain", "nft-drain", "drain-wallet",
  "claimeth", "claimbtc", "claim-usdt", "claimusdt",
  "eth-giveaway", "btc-giveaway", "nft-giveaway",
];

// Permit-signature / wallet-connect bait patterns (EIP-2612, eth_signTypedData_v4, etc.)
const PERMIT_SIGNATURE_PATTERNS = [
  // EVM-level call names
  "eth_signtypeddata", "signtypeddata_v4", "eth_sign(", "personal_sign",
  "signpermit", "permit signature", "sign to verify",
  // ERC-20 approve-style attacks
  "approve()", "transferfrom(", "unlimited approval", "approve unlimited",
  "approve all tokens", "setapprovalforall", "token approval required",
  // Social-engineering framing
  "verification signature", "sign this message to claim", "sign to claim",
  "sign to receive", "small verification fee", "gas optimization fee",
  "one-time verification", "wallet authorization required",
  "approve to claim", "approve to receive", "approve and claim",
  "authorize to claim", "permit to claim",
  // Fragment / username-sale bait
  "buy your @", "buy your username", "sell your username",
  "username auction", "purchase your handle",
];

// Fake CAPTCHA patterns — "verify you're human" harvest attacks steal session tokens / keys
const FAKE_CAPTCHA_PATTERNS = [
  "verify you're human", "verify you are human", "verify that you're human",
  "tap to verify", "click to verify", "press to verify",
  "complete captcha", "captcha verification", "complete verification",
  "human verification", "prove you're human", "prove you are human",
  "not a robot", "i'm not a robot", "im not a robot",
  "bot check", "anti-bot verification", "pass the captcha",
  "click the button to verify", "tap the button to verify",
  "verify your humanity", "verification required to join",
  "verify your membership", "verify your access",
];

// Seed phrase detection - catches attempts to share/steal recovery phrases
const SEED_PHRASE_WORDS = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
  "adult", "advance", "advice", "aerobic", "afford", "afraid", "again", "age", "agent", "agree",
  "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien"
];

// Detect seed phrase patterns (12 or 24 words from BIP39 list)
function detectSeedPhrase(text: string): boolean {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 12) return false;
  let matchCount = 0;
  for (const word of words) {
    if (SEED_PHRASE_WORDS.includes(word.replace(/[^a-z]/g, ''))) {
      matchCount++;
    }
  }
  return matchCount >= 10;
}

// Detect Inferno Drainer domains or permit-signature text patterns.
// Returns a short description of what matched, or null if clean.
function detectPermitSignatureAttack(text: string): string | null {
  const lowerText = text.toLowerCase();
  // Scan every URL in the message for known drainer domains
  const urlRegex = /https?:\/\/([^\s\/]+)/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    const domain = urlMatch[1].toLowerCase();
    const hit = INFERNO_DRAINER_DOMAINS.find(d => domain.includes(d));
    if (hit) return `drainer domain (${urlMatch[1]})`;
  }
  // Scan message text for permit-sig social-engineering phrases
  for (const pattern of PERMIT_SIGNATURE_PATTERNS) {
    if (lowerText.includes(pattern)) return `permit-sig phrase ("${pattern}")`;
  }
  return null;
}

// Detect fake CAPTCHA harvest attacks: CAPTCHA phrase + an external link (the dangerous combo).
function detectFakeCaptcha(text: string): boolean {
  const lowerText = text.toLowerCase();
  if (!FAKE_CAPTCHA_PATTERNS.some(p => lowerText.includes(p))) return false;
  // Only flag when paired with a link — standalone phrases can appear in educational text
  return /https?:\/\/[^\s]+/i.test(text);
}

// === HATE SPEECH & CONTENT MODERATION ===
// Normalize text to catch bypass attempts (spaces, l33t speak, symbols)
function normalizeTextForModeration(text: string): string {
  let normalized = text.toLowerCase();
  const leetMap: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a',
    '$': 's', '!': 'i', '|': 'i', '+': 't', '(': 'c', ')': 'o', '<': 'c', '>': 'o'
  };
  for (const [leet, letter] of Object.entries(leetMap)) {
    normalized = normalized.split(leet).join(letter);
  }
  normalized = normalized.replace(/[\s\-_.*#~`'"]/g, '');
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  return normalized;
}

// Obscured hate speech patterns using base64-encoded terms (not readable in source)
// Pattern format: base64 encoded slur variants
const HATE_SPEECH_PATTERNS_B64 = [
  "bmlnZ2E=", "bmlnZ2Vy", "bmlnZ2Vycw==", "bmlnbm9n",
  "ZmFnZ290", "ZmFn", "ZmFnZ290cw==", "ZmFncw==",
  "a2lrZQ==", "a2lrZXM=",
  "c3BpYw==", "c3BpY3M=", "d2V0YmFjaw==",
  "Y2hpbms=", "Y2hpbmtz", "Z29vaw==",
  "cmV0YXJk", "cmV0YXJkcw==",
  "dHJhbm55", "dHJhbm5pZXM=",
  "ZHlrZQ==", "ZHlrZXM="
];

// Decode patterns at runtime (not visible in source code)
function getHateSpeechPatterns(): string[] {
  return HATE_SPEECH_PATTERNS_B64.map(b64 => {
    try {
      return Buffer.from(b64, 'base64').toString('utf-8');
    } catch {
      return '';
    }
  }).filter(p => p.length > 0);
}

// Detect hate speech in normalized text
function detectHateSpeech(text: string): { detected: boolean; severity: 'low' | 'medium' | 'high' } {
  const normalized = normalizeTextForModeration(text);
  const patterns = getHateSpeechPatterns();
  
  for (const pattern of patterns) {
    if (normalized.includes(pattern)) {
      return { detected: true, severity: 'high' };
    }
  }
  return { detected: false, severity: 'low' };
}

// Emoji spam detection - too many emojis relative to text
function detectEmojiSpam(text: string): boolean {
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
  const emojis = text.match(emojiRegex) || [];
  const emojiCount = emojis.join('').length / 2;
  const textWithoutEmoji = text.replace(emojiRegex, '').trim();
  if (emojiCount > 15 && textWithoutEmoji.length < 20) return true;
  if (emojiCount > 10 && textWithoutEmoji.length < 5) return true;
  return false;
}

// Track hate speech warnings per user
const HATE_SPEECH_WARNING_RESET = 24 * 60 * 60 * 1000; // 24 hours


// Track unique user interactions (user:chat -> Set<replied_to_user_id>)
const uniqueInteractionsCache = new Map<string, { users: Set<string>; date: string }>();

// === TRUST SYSTEM CONFIGURATION ===
const TRUST_ELIGIBILITY_DAYS = 45; // Days before user can earn trust
const TRUST_DAILY_CAP = 10; // Max trust points per day
const TRUST_WEEKLY_CAP = 50; // Max trust points per week
const TRUST_MEANINGFUL_MSG_LENGTH = 10; // Min chars for "meaningful" message
const TRUST_BURST_THRESHOLD = 20; // Max msgs in 10 min before burst detection

// Trust point values
const TRUST_POINTS = {
  message: 0.5, // Per meaningful message
  reply: 1, // Replying to others
  uniqueInteraction: 2, // First interaction with a new user
  gameParticipation: 1, // Playing trivia/puzzle
};

// Get or create trust record for a user
async function ensureTrustRecord(userId: string, chatId: string, username?: string, firstName?: string): Promise<typeof trustScores.$inferSelect | null> {
  try {
    const existing = await db.select().from(trustScores)
      .where(and(eq(trustScores.telegramUserId, userId), eq(trustScores.chatId, chatId)))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    // Create new trust record
    const joinDate = new Date();
    const eligibilityDate = new Date(joinDate.getTime() + TRUST_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000);
    
    await db.insert(trustScores).values({
      telegramUserId: userId,
      chatId,
      username,
      firstName,
      joinDate,
      eligibilityDate,
      isEligible: false,
      trustScore: 0,
      trustStatus: "none",
    });
    
    return (await db.select().from(trustScores)
      .where(and(eq(trustScores.telegramUserId, userId), eq(trustScores.chatId, chatId)))
      .limit(1))[0];
  } catch (error) {
    console.error("Error ensuring trust record:", error);
    return null;
  }
}

// Check if user is eligible for trust (45+ days)
function isEligibleForTrust(trustRecord: typeof trustScores.$inferSelect): boolean {
  if (trustRecord.trustStatus === "vouched") return true;
  if (!trustRecord.eligibilityDate) return false;
  return new Date() >= new Date(trustRecord.eligibilityDate);
}

// Update trust score with anti-gaming checks
async function updateTrustActivity(
  userId: string, 
  chatId: string, 
  activityType: 'message' | 'reply' | 'uniqueInteraction' | 'gameParticipation',
  messageLength?: number,
  repliedToUserId?: string
): Promise<void> {
  try {
    const record = await ensureTrustRecord(userId, chatId);
    if (!record) return;
    
    // Frozen users don't gain trust
    if (record.isFrozen) return;
    
    // Check eligibility
    const eligible = isEligibleForTrust(record);
    const today = getTodayDateString();
    const weekStart = getWeekStartDate();
    
    // Reset daily/weekly counters if needed
    let dailyMsgCount = record.dailyMsgCount || 0;
    let weeklyMsgCount = record.weeklyMsgCount || 0;
    let trustGainedToday = record.trustGainedToday || 0;
    let trustGainedThisWeek = record.trustGainedThisWeek || 0;
    
    if (record.dailyMsgDate !== today) {
      dailyMsgCount = 0;
      trustGainedToday = 0;
    }
    if (record.weeklyResetDate !== weekStart) {
      weeklyMsgCount = 0;
      trustGainedThisWeek = 0;
    }
    
    // Anti-gaming: check caps
    if (trustGainedToday >= TRUST_DAILY_CAP || trustGainedThisWeek >= TRUST_WEEKLY_CAP) {
      // Just update activity counts, no trust gain
      await db.update(trustScores)
        .set({
          dailyMsgCount: dailyMsgCount + 1,
          dailyMsgDate: today,
          weeklyMsgCount: weeklyMsgCount + 1,
          weeklyResetDate: weekStart,
        })
        .where(and(eq(trustScores.telegramUserId, userId), eq(trustScores.chatId, chatId)));
      return;
    }
    
    // Calculate trust points based on activity
    let pointsToAdd = 0;
    let meaningfulCount = record.meaningfulMsgCount || 0;
    let uniqueReplied = record.uniqueRepliedTo || 0;
    
    switch (activityType) {
      case 'message':
        if (messageLength && messageLength >= TRUST_MEANINGFUL_MSG_LENGTH) {
          pointsToAdd = TRUST_POINTS.message;
          meaningfulCount++;
        }
        break;
      case 'reply':
        pointsToAdd = TRUST_POINTS.reply;
        break;
      case 'uniqueInteraction':
        pointsToAdd = TRUST_POINTS.uniqueInteraction;
        uniqueReplied++;
        break;
      case 'gameParticipation':
        pointsToAdd = TRUST_POINTS.gameParticipation;
        break;
    }
    
    // Only add points if eligible
    if (!eligible) {
      pointsToAdd = 0;
    }
    
    // Cap points
    pointsToAdd = Math.min(pointsToAdd, TRUST_DAILY_CAP - trustGainedToday, TRUST_WEEKLY_CAP - trustGainedThisWeek);
    
    const newScore = Math.min(100, (record.trustScore || 0) + pointsToAdd);
    const newLevel = Math.floor(newScore / 25); // 0-3 levels at 0, 25, 50, 75
    const isTrusted = newScore >= 25;
    const newStatus = record.trustStatus === "vouched" ? "vouched" : (isTrusted ? "earned" : "none");
    
    await db.update(trustScores)
      .set({
        trustScore: newScore,
        trustLevel: newLevel,
        isTrusted,
        trustStatus: newStatus,
        isEligible: eligible,
        dailyMsgCount: dailyMsgCount + 1,
        dailyMsgDate: today,
        weeklyMsgCount: weeklyMsgCount + 1,
        weeklyResetDate: weekStart,
        meaningfulMsgCount: meaningfulCount,
        uniqueRepliedTo: uniqueReplied,
        trustGainedToday: trustGainedToday + pointsToAdd,
        trustGainedThisWeek: trustGainedThisWeek + pointsToAdd,
        lastTrustUpdate: new Date(),
      })
      .where(and(eq(trustScores.telegramUserId, userId), eq(trustScores.chatId, chatId)));
  } catch (error) {
    console.error("Error updating trust activity:", error);
  }
}

// Get week start date string (Sunday)
function getWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const sunday = new Date(now.setDate(diff));
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

// Generate trust progress bar
function generateTrustProgressBar(score: number): string {
  const filled = Math.floor(score / 10);
  const empty = 10 - filled;
  return '[' + '#'.repeat(filled) + '-'.repeat(empty) + ']';
}

// Trust explainer for The Warden
function getTrustExplainer(): string {
  return `TRUST POINTS - How It Works

Our Trust System recognizes genuine community members while preventing abuse.

HOW TO EARN TRUST:
1. Be active for 45+ days (eligibility gate)
2. Send meaningful messages (10+ characters)
3. Reply to and help other members
4. Play community games (trivia, puzzles)
5. Successfully refer new members

TRUST LEVELS:
Level 0 (0-24 pts): New member
Level 1 (25-49 pts): Trusted - can post some links
Level 2 (50-74 pts): Established - more posting freedom
Level 3 (75-100 pts): OG - full community privileges

ANTI-GAMING RULES:
- Daily cap: ${TRUST_DAILY_CAP} pts/day
- Weekly cap: ${TRUST_WEEKLY_CAP} pts/week
- Spam doesn't count - quality over quantity!
- Owners can freeze trust for rule violations

VOUCHED MEMBERS:
Owners can manually vouch for trusted friends, bypassing the 45-day wait.

Check your status anytime with /trustinfo!`;
}

// Owner trust commands explainer
function getOwnerTrustExplainer(): string {
  return `TRUST SYSTEM - Owner Commands

VOUCHING MEMBERS:
/trust - Reply to a message to vouch for that user
/trustbulk @user1 @user2 ... - Vouch multiple users at once (up to 10)

MANAGING TRUST:
/untrust - Reply to remove someone's trust status
/trustfreeze - Reply to freeze someone's trust (stops earning)
/trustunfreeze - Reply to unfreeze someone's trust

VIEWING STATUS:
/trustinfo - Check your own trust status
/trustboard - View the trust leaderboard

HOW /TRUSTBULK WORKS:
1. Type /trustbulk followed by @usernames
2. For best results, select names from Telegram's autocomplete
3. Users who have messaged before can be found by username
4. New users need to message first OR be selected from autocomplete

VOUCHED VS EARNED:
- Vouched: You manually trusted them (bypasses 45-day wait)
- Earned: They built trust naturally over time

WHEN TO VOUCH:
- Long-time community members you know and trust
- Moderators and helpers
- Members who were active before the trust system

TIP: After publishing, use /trustbulk to quickly vouch your core community members!`;
}

// Allowed domains (your official links)
// Official project links plus the handful of third-party sites members
// legitimately need. Deliberately short.
//
// Note on shared hosting: entries like vercel.app, netlify.app, pages.dev or
// github.io are NOT listed and must not be. They are shared domains — anyone
// can put a phishing page on one, and allowlisting the parent would wave
// through every scam hosted there. Only domains we control go in this list.
const ALLOWED_DOMAINS = [
  ...Array.from(new Set([
    ...(process.env.OFFICIAL_DOMAINS || "").split(",").map(d => d.trim()).filter(Boolean),
    "t.me",
  ])),
  "opensea.io", "base.org", "basescan.org", "etherscan.io",
];

// High-risk phrases that increase risk score
const HIGH_RISK_PHRASES = [
  "connect your wallet", "claim your", "free airdrop", "limited time",
  "send me", "dm me", "private message", "verify your wallet",
  "approve transaction", "gas fee", "double your crypto",
  "guaranteed profit", "risk free", "act now", "expires in",
  "whitelist spot", "free mint", "seed phrase", "recovery phrase",
  "support team", "official admin", "customer service",
];

// In-memory rate limiting (per user per chat)
interface RateLimitEntry {
  messages: number[];  // timestamps of recent messages
  lastMessage: string;
  duplicateCount: number;
}
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_MESSAGES_PER_WINDOW = 5;
const DUPLICATE_THRESHOLD = 3; // same message 3+ times = spam

// In-memory cache for chat settings (reduce DB calls)
const chatSettingsCache = new Map<string, {
  raidMode: boolean;
  spamThreshold: number;
  newUserLinkHours: number;
  lastFetched: number;
}>();
const SETTINGS_CACHE_TTL = 60000; // 1 minute

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  mod: 80,
  helper: 60,
  verified: 40,
  newbie: 20,
};

// Check if user can moderate another user
function canModerate(moderatorRole: string, targetRole: string): boolean {
  return (ROLE_HIERARCHY[moderatorRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
}

// Get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Calculate message risk score (0-100)
function calculateRiskScore(text: string, username: string | undefined, accountAgeDays: number): number {
  let score = 0;
  const lowerText = text.toLowerCase();
  
  // Check for blocked domains
  for (const domain of BLOCKED_DOMAINS) {
    if (lowerText.includes(domain)) {
      score += 40;
      break;
    }
  }
  
  // Check for high-risk phrases
  for (const phrase of HIGH_RISK_PHRASES) {
    if (lowerText.includes(phrase)) {
      score += 15;
    }
  }
  
  // Check for Inferno Drainer / permit-signature attack patterns (high confidence = +50)
  if (detectPermitSignatureAttack(text)) score += 50;
  
  // Check for fake CAPTCHA harvest patterns (high confidence = +45)
  if (detectFakeCaptcha(text)) score += 45;
  
  // Check for links (excluding allowed domains)
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = text.match(urlRegex) || [];
  for (const url of urls) {
    const isAllowed = isAllowedUrl(url);
    if (!isAllowed) {
      score += 10; // Unknown links add risk
    }
  }
  
  // Check for suspicious patterns
  if (CRYPTO_ADDRESS_REGEX.test(text)) score += 25;
  if (text.includes("@") && text.toLowerCase().includes("dm")) score += 20;
  
  // New accounts are riskier
  if (accountAgeDays < 1) score += 25;
  else if (accountAgeDays < 7) score += 15;
  else if (accountAgeDays < 30) score += 5;
  
  // Suspicious username
  for (const term of SUSPICIOUS_USERNAMES) {
    if (username?.toLowerCase().includes(term)) {
      score += 20;
      break;
    }
  }
  
  // Excessive caps or emoji
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) score += 10;
  
  // Count emoji using simpler pattern (common emoji ranges)
  const emojiPattern = /[\uD83C-\uDBFF\uDC00-\uDFFF]/g;
  const emojiCount = (text.match(emojiPattern) || []).length;
  if (emojiCount > 20) score += 10; // Doubled threshold since we're counting surrogate pairs
  
  return Math.min(score, 100);
}

// Check rate limiting for a user (with configurable threshold)
async function checkRateLimit(userId: string, chatId: string, messageText: string, spamThreshold?: number): Promise<{ blocked: boolean; reason: string | null }> {
  const key = KEYS.rateLimit(chatId, userId);
  const now = Date.now();
  const effectiveThreshold = spamThreshold || MAX_MESSAGES_PER_WINDOW;

  const entry = await stateGet<RateLimitEntry>(key, { messages: [], lastMessage: "", duplicateCount: 0 });

  const oldMessageCount = entry.messages.length;
  entry.messages = entry.messages.filter(ts => now - ts < RATE_LIMIT_WINDOW);

  // Window fully expired — reset the duplicate streak too
  if (oldMessageCount > 0 && entry.messages.length === 0) {
    entry.duplicateCount = 0;
    entry.lastMessage = "";
  }

  let blocked: { blocked: boolean; reason: string | null } = { blocked: false, reason: null };

  if (messageText === entry.lastMessage) {
    entry.duplicateCount++;
    if (entry.duplicateCount >= DUPLICATE_THRESHOLD) {
      blocked = { blocked: true, reason: "duplicate_spam" };
    }
  } else {
    entry.duplicateCount = 1;
    entry.lastMessage = messageText;
  }

  if (!blocked.blocked) {
    entry.messages.push(now);
    if (entry.messages.length > effectiveThreshold) {
      blocked = { blocked: true, reason: "flood" };
    }
  }

  await stateSet(key, entry, TTL.rateLimit);
  return blocked;
}

// Get or create user moderation status
async function getUserModerationStatus(userId: string, chatId: string): Promise<typeof userModerationStatus.$inferSelect | null> {
  const existing = await db.select().from(userModerationStatus)
    .where(and(
      eq(userModerationStatus.telegramUserId, userId),
      eq(userModerationStatus.chatId, chatId)
    ))
    .limit(1);
  return existing[0] || null;
}

// Create user moderation status if not exists
async function ensureUserModerationStatus(userId: string, chatId: string): Promise<void> {
  const existing = await getUserModerationStatus(userId, chatId);
  if (!existing) {
    await db.insert(userModerationStatus).values({
      telegramUserId: userId,
      chatId: chatId,
      role: "newbie",
    });
  }
}

// Get chat moderation settings (with caching)
async function getChatSettings(chatId: string, forceRefresh: boolean = false): Promise<{
  raidMode: boolean;
  spamThreshold: number;
  newUserLinkHours: number;
}> {
  // Skip cache if force refresh requested
  if (!forceRefresh) {
    const cached = chatSettingsCache.get(chatId);
    if (cached && Date.now() - cached.lastFetched < SETTINGS_CACHE_TTL) {
      return {
        raidMode: cached.raidMode,
        spamThreshold: cached.spamThreshold,
        newUserLinkHours: cached.newUserLinkHours,
      };
    }
  }
  
  const settings = await db.select().from(chatModerationSettings)
    .where(eq(chatModerationSettings.chatId, chatId))
    .limit(1);
  
  const result = {
    raidMode: settings[0]?.raidModeEnabled ?? false,
    spamThreshold: settings[0]?.spamThreshold ?? 5,
    newUserLinkHours: Math.max(4, settings[0]?.newUserLinkRestriction ?? 4), // Minimum 4 hours
  };
  
  chatSettingsCache.set(chatId, { ...result, lastFetched: Date.now() });
  return result;
}

// Check if a user can moderate based on stored role (or Telegram admin status)
async function canUserModerate(ctx: MyContext, userId: number, chatId: string): Promise<boolean> {
  // Telegram admins always can moderate
  const isAdmin = await isUserAdmin(ctx, userId);
  if (isAdmin) return true;
  
  // Check stored role
  const status = await getUserModerationStatus(String(userId), chatId);
  if (status) {
    const role = status.role || "newbie";
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY["mod"]; // mod or higher
  }
  
  return false;
}

// Update moderation stats
async function incrementModStat(chatId: string, field: 'newJoins' | 'messagesBlocked' | 'spamBlocked' | 'scamsBlocked' | 'linksBlocked' | 'muteCount' | 'warnCount' | 'raidAttempts' | 'flaggedForReview'): Promise<void> {
  const today = getTodayDateString();
  
  const existing = await db.select().from(moderationStats)
    .where(and(
      eq(moderationStats.chatId, chatId),
      eq(moderationStats.date, today)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    const stat = existing[0];
    const currentValue = stat[field as keyof typeof stat] as number || 0;
    await db.update(moderationStats)
      .set({ [field]: currentValue + 1 })
      .where(eq(moderationStats.id, existing[0].id));
  } else {
    await db.insert(moderationStats).values({
      chatId,
      date: today,
      [field]: 1,
    });
  }
}

// === Q&A KNOWLEDGE CACHE ===
// Normalize question for hashing - lowercase, remove punctuation, trim spaces
function normalizeQuestion(question: string): string {
  return question.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Simple string hash function (djb2 algorithm)
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Create a hash of the normalized question
function hashQuestion(question: string): string {
  const normalized = normalizeQuestion(question);
  // Use djb2 hash + first 50 chars for uniqueness
  return simpleHash(normalized) + "_" + normalized.substring(0, 50);
}

// Look up a question in the cache
async function findCachedAnswer(question: string): Promise<{ answer: string; askCount: number } | null> {
  const hash = hashQuestion(question);
  
  try {
    const cached = await db.select().from(qaCache)
      .where(eq(qaCache.questionHash, hash))
      .limit(1);
    
    if (cached.length > 0) {
      // Update ask count and last asked time
      await db.update(qaCache)
        .set({ 
          askCount: (cached[0].askCount || 1) + 1,
          lastAsked: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(qaCache.id, cached[0].id));
      
      return { 
        answer: cached[0].answerText, 
        askCount: (cached[0].askCount || 1) + 1 
      };
    }
  } catch (error) {
    console.log("Error checking Q&A cache:", error);
  }
  
  return null;
}

// Save a new Q&A to the cache
async function cacheAnswer(question: string, answer: string): Promise<void> {
  const hash = hashQuestion(question);
  
  try {
    // Check if already exists (race condition protection)
    const existing = await db.select().from(qaCache)
      .where(eq(qaCache.questionHash, hash))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(qaCache).values({
        questionHash: hash,
        questionText: question.substring(0, 500), // Limit stored question length
        answerText: answer.substring(0, 2000), // Limit stored answer length
        askCount: 1,
      });
      console.log("Cached new Q&A:", hash.substring(0, 30) + "...");
    }
  } catch (error) {
    console.log("Error caching Q&A:", error);
  }
}

// Check if user is an admin/mod in Telegram
async function isUserAdmin(ctx: MyContext, userId: number): Promise<boolean> {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return false;
    
    const member = await ctx.api.getChatMember(chatId, userId);
    return member.status === 'administrator' || member.status === 'creator';
  } catch {
    return false;
  }
}

// Mute a user and notify admins
async function muteUser(ctx: MyContext, userId: number, duration: number, reason: string, mutedUsername?: string): Promise<boolean> {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return false;
    
    const untilDate = Math.floor(Date.now() / 1000) + duration;
    await ctx.api.restrictChatMember(chatId, userId, {
      can_send_messages: false,
      can_send_audios: false,
      can_send_documents: false,
      can_send_photos: false,
      can_send_videos: false,
      can_send_video_notes: false,
      can_send_voice_notes: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
    }, { until_date: untilDate });
    
    // Update database
    const chatIdStr = String(chatId);
    await db.update(userModerationStatus)
      .set({
        isMuted: true,
        muteUntil: new Date(untilDate * 1000),
        muteReason: reason,
      })
      .where(and(
        eq(userModerationStatus.telegramUserId, String(userId)),
        eq(userModerationStatus.chatId, chatIdStr)
      ));
    
    await incrementModStat(chatIdStr, 'muteCount');
    
    // Notify admins about the mute
    try {
      const admins = await ctx.api.getChatAdministrators(chatId);
      const adminMentions = admins
        .filter(a => !a.user.is_bot)
        .slice(0, 3) // Limit to 3 admins to avoid spam
        .map(a => a.user.username ? `@${a.user.username}` : a.user.first_name)
        .join(", ");
      
      const durationText = duration >= 3600 
        ? `${Math.floor(duration / 3600)} hour(s)` 
        : `${Math.floor(duration / 60)} minute(s)`;
      const userDisplay = mutedUsername || `User ${userId}`;
      
      await ctx.api.sendMessage(chatId, 
        `🔇 *MUTE ALERT* ${adminMentions}\n\n` +
        `User: ${userDisplay}\n` +
        `Duration: ${durationText}\n` +
        `Reason: ${reason}\n\n` +
        `The Warden handled it, but thought you should know!`,
        { parse_mode: "Markdown" }
      );
    } catch (adminErr) {
      console.log("Couldn't notify admins about mute:", adminErr);
    }
    
    return true;
  } catch (error) {
    console.error("Failed to mute user:", error);
    return false;
  }
}

// Unmute a user
async function unmuteUser(ctx: MyContext, userId: number): Promise<boolean> {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return false;
    
    await ctx.api.restrictChatMember(chatId, userId, {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });
    
    // Update database
    const chatIdStr = String(chatId);
    await db.update(userModerationStatus)
      .set({
        isMuted: false,
        muteUntil: null,
        muteReason: null,
      })
      .where(and(
        eq(userModerationStatus.telegramUserId, String(userId)),
        eq(userModerationStatus.chatId, chatIdStr)
      ));
    
    return true;
  } catch (error) {
    console.error("Failed to unmute user:", error);
    return false;
  }
}

// Flag message for mod review
async function flagForModReview(ctx: MyContext, userId: string, username: string, messageText: string, riskScore: number, reason: string): Promise<void> {
  const chatId = String(ctx.chat?.id || "");
  await incrementModStat(chatId, 'flaggedForReview');
  
  // Try to notify admins in the chat
  try {
    const alertMessage = `⚠️ *FLAGGED FOR REVIEW*\n\n` +
      `👤 User: ${username || userId}\n` +
      `📊 Risk Score: ${riskScore}/100\n` +
      `📝 Reason: ${reason}\n\n` +
      `💬 Message:\n\`${messageText.substring(0, 200)}${messageText.length > 200 ? '...' : ''}\`\n\n` +
      `_Review and take action if needed._`;
    
    // Get chat admins
    if (ctx.chat?.id) {
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      // Send to first admin (or could be mod channel if configured)
      if (admins.length > 0) {
        // Just log for now - could DM admins or post to mod channel
        console.log(`[MOD ALERT] ${alertMessage}`);
      }
    }
  } catch (error) {
    console.error("Failed to send mod alert:", error);
  }
}

// Get moderation stats for a period
async function getModStats(chatId: string, days: number): Promise<{
  newJoins: number;
  messagesBlocked: number;
  spamBlocked: number;
  scamsBlocked: number;
  linksBlocked: number;
  muteCount: number;
  warnCount: number;
  flaggedForReview: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
  
  const stats = await db.select().from(moderationStats)
    .where(and(
      eq(moderationStats.chatId, chatId),
      gte(moderationStats.date, startDateStr)
    ));
  
  const totals = {
    newJoins: 0,
    messagesBlocked: 0,
    spamBlocked: 0,
    scamsBlocked: 0,
    linksBlocked: 0,
    muteCount: 0,
    warnCount: 0,
    flaggedForReview: 0,
  };
  
  for (const stat of stats) {
    totals.newJoins += stat.newJoins || 0;
    totals.messagesBlocked += stat.messagesBlocked || 0;
    totals.spamBlocked += stat.spamBlocked || 0;
    totals.scamsBlocked += stat.scamsBlocked || 0;
    totals.linksBlocked += stat.linksBlocked || 0;
    totals.muteCount += stat.muteCount || 0;
    totals.warnCount += stat.warnCount || 0;
    totals.flaggedForReview += stat.flaggedForReview || 0;
  }
  
  return totals;
}

// === END MODERATION SYSTEM ===

// === HELPER FUNCTIONS ===
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Fisher-Yates shuffle for randomizing answer positions (handles duplicate options safely)
function shuffleOptions(question: TriviaQuestion): TriviaQuestion {
  // Create indexed pairs to track correct answer by original index, not value
  const indexed: { value: string; originalIndex: number }[] = question.options.map((opt, i) => ({
    value: opt,
    originalIndex: i
  }));
  
  // Fisher-Yates shuffle on the indexed pairs
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  
  // Find new position of correct answer by original index (not value - handles duplicates)
  const newCorrectIndex = indexed.findIndex(item => item.originalIndex === question.correctIndex);
  
  return {
    ...question,
    options: indexed.map(item => item.value),
    correctIndex: newCorrectIndex
  };
}

function detectScam(text: string, username?: string): { isScam: boolean; flags: string[] } {
  const flags: string[] = [];
  const lowerText = text.toLowerCase();
  const lowerUsername = username?.toLowerCase() || "";

  for (const term of SUSPICIOUS_USERNAMES) {
    if (lowerUsername.includes(term)) {
      flags.push(`Suspicious username pattern: ${term}`);
    }
  }

  if (CRYPTO_ADDRESS_REGEX.test(text)) {
    flags.push("Contains crypto address");
  }

  for (const [category, patterns] of Object.entries(SCAM_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        flags.push(`${category}: "${pattern}"`);
      }
    }
  }

  return { isScam: flags.length > 0, flags };
}

function wardenResponse(message: string): string {
  const prefixes = [
    "Right. ",
    "",
    "Noted. ",
    "",
    "For the record: ",
  ];
  return getRandomItem(prefixes) + message;
}

// Get a random The Warden interjection (for adding flavor to responses)
function getRandomInterjection(): string {
  return getRandomItem(WARDEN_ASIDES);
}

// === RUDENESS DETECTION & TRACKING ===
const RUDE_PATTERNS = [
  // Aggressive language
  "shut up", "stfu", "wtf", "what the f", "f off", "foff",
  "stupid bot", "dumb bot", "useless", "worthless", "trash bot",
  "you suck", "this sucks", "hate you", "hate this",
  // Demanding/pushy language
  "do it now", "hurry up", "answer me", "respond now", "i said",
  "are you deaf", "can you read", "learn to read", "wake up",
  // Dismissive/rude
  "whatever", "i dont care", "nobody asked", "who cares",
  "dont talk to me", "leave me alone", "go away",
  // Insults
  "idiot", "moron", "stupid", "dumb", "pathetic", "annoying"
];

const NICE_PATTERNS = [
  "thank", "thanks", "thx", "ty", "appreciate",
  "please", "pls", "sorry", "my bad", "apologies",
  "love", "great", "awesome", "amazing", "helpful",
  "good bot", "nice", "cool", "kind", "sweet"
];

interface RudenessStatus {
  rudeStrikes: number;
  lastRudeDate: string | null;
  wasNiceAfterRude: boolean;
}

function detectRudeness(text: string): { isRude: boolean; isNice: boolean } {
  const lowerText = text.toLowerCase();
  
  const isRude = RUDE_PATTERNS.some(pattern => lowerText.includes(pattern));
  const isNice = NICE_PATTERNS.some(pattern => lowerText.includes(pattern));
  
  return { isRude, isNice };
}

async function getUserRudenessStatus(telegramUserId: string): Promise<RudenessStatus> {
  try {
    const existing = await db.select().from(userMemory).where(eq(userMemory.telegramUserId, telegramUserId)).limit(1);
    if (existing.length > 0) {
      return {
        rudeStrikes: existing[0].rudeStrikes || 0,
        lastRudeDate: existing[0].lastRudeDate || null,
        wasNiceAfterRude: existing[0].wasNiceAfterRude || false
      };
    }
  } catch (error) {
    console.error("Error getting rudeness status:", error);
  }
  return { rudeStrikes: 0, lastRudeDate: null, wasNiceAfterRude: false };
}

async function updateUserRudeness(
  telegramUserId: string, 
  username: string | undefined,
  firstName: string | undefined,
  isRude: boolean, 
  isNice: boolean
): Promise<RudenessStatus> {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Check if this is a special user with elevated starting rudeness
  const normalizedUsername = (username || "").toLowerCase();
  const specialUserFloor = SPECIAL_USERS[normalizedUsername] || 0;
  
  try {
    const existing = await db.select().from(userMemory).where(eq(userMemory.telegramUserId, telegramUserId)).limit(1);
    
    let newStrikes = existing.length > 0 ? (existing[0].rudeStrikes || 0) : specialUserFloor;
    let lastRudeDate = existing.length > 0 ? existing[0].lastRudeDate : null;
    let wasNiceAfterRude = existing.length > 0 ? (existing[0].wasNiceAfterRude || false) : false;
    
    // For special users:
    // - They start at the floor (e.g., 3 strikes)
    // - They can only drop BELOW the floor AFTER they've had recorded rudeness (lastRudeDate set)
    //   AND have been nice since (wasNiceAfterRude = true)
    // - This means they have to actually be rude first, then be nice to earn their way down
    const hasEarnedReduction = specialUserFloor > 0 && lastRudeDate !== null && wasNiceAfterRude;
    
    if (specialUserFloor > 0 && !hasEarnedReduction && newStrikes < specialUserFloor) {
      newStrikes = specialUserFloor;
    }
    
    if (isRude) {
      newStrikes = Math.min(newStrikes + 1, 10); // Cap at 10 strikes
      lastRudeDate = todayStr;
      wasNiceAfterRude = false;
    } else if (isNice && newStrikes > 0) {
      wasNiceAfterRude = true;
      // Slowly reduce strikes when being nice (1 strike per nice message, min 0)
      newStrikes = Math.max(newStrikes - 1, 0);
    }
    
    // Recalculate hasEarnedReduction after potential updates
    const hasEarnedReductionFinal = specialUserFloor > 0 && lastRudeDate !== null && wasNiceAfterRude;
    
    // For special users who haven't earned reduction, re-enforce the floor after all calculations
    // This prevents them from dropping below the floor just by being nice without first being rude
    if (specialUserFloor > 0 && !hasEarnedReductionFinal && newStrikes < specialUserFloor) {
      newStrikes = specialUserFloor;
    }
    
    if (existing.length > 0) {
      await db.update(userMemory)
        .set({ 
          rudeStrikes: newStrikes,
          lastRudeDate: lastRudeDate,
          wasNiceAfterRude: wasNiceAfterRude,
          lastSeen: sql`CURRENT_TIMESTAMP`,
          messageCount: (existing[0].messageCount || 0) + 1
        })
        .where(eq(userMemory.telegramUserId, telegramUserId));
    } else {
      await db.insert(userMemory).values({
        telegramUserId,
        username: username || null,
        firstName: firstName || null,
        rudeStrikes: newStrikes,
        lastRudeDate: lastRudeDate,
        wasNiceAfterRude: wasNiceAfterRude,
        messageCount: 1
      });
    }
    
    return { rudeStrikes: newStrikes, lastRudeDate, wasNiceAfterRude };
  } catch (error) {
    console.error("Error updating rudeness:", error);
    return { rudeStrikes: 0, lastRudeDate: null, wasNiceAfterRude: false };
  }
}

function getWardenRudenessContext(status: RudenessStatus, isCurrentlyRude: boolean): string {
  if (status.rudeStrikes === 0) {
    return ""; // No rudeness history, be normal
  }
  
  if (isCurrentlyRude) {
    if (status.rudeStrikes >= 5) {
      return `This user has been rude ${status.rudeStrikes} times. Reply once, dryly, and close the exchange. Do not insult them, do not escalate, do not try to win. State the position and stop.`;
    } else if (status.rudeStrikes >= 2) {
      return `This user has been rude ${status.rudeStrikes} times. Answer the question plainly and add one dry line making clear the tone is noted. Do not match their tone.`;
    } else {
      return `This user was just rude. Give a gentle The Warden pushback - let them know we prefer manners around here, but still be helpful.`;
    }
  } else if (status.wasNiceAfterRude) {
    return `This user was rude before but is being nice now! Acknowledge their improvement - say something like "Oh, NOW we're being polite!" or "See? That wasn't so hard!" Be warm but let them know you noticed the change.`;
  } else if (status.rudeStrikes > 0) {
    return `This user has ${status.rudeStrikes} rudeness strike(s) on record. They're not being rude right now, so be normal but stay alert.`;
  }
  
  return "";
}

// === BOT LEARNING MEMORY SYSTEM ===
import { botInteractions, userFeedback, learnedPatterns } from "@shared/schema";

class BotMemory {
  // Generate a pattern hash from keywords in the message
  private static generatePatternHash(message: string): string {
    const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'what', 'when', 'where', 'who', 'why', 'how', 'can', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'and', 'or', 'but', 'so', 'if', 'then', 'than', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'from', 'as', 'into', 'like', 'just', 'also', 'very', 'really', 'too', 'much', 'more', 'some', 'any', 'all', 'no', 'not', 'only']);
    
    const words = message.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .sort();
    
    return words.join('_');
  }

  // Extract keywords from message for pattern matching
  private static extractKeywords(message: string): string[] {
    const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'what', 'when', 'where', 'who', 'why', 'how', 'can', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'and', 'or', 'but', 'so', 'if', 'then', 'than', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'from', 'as', 'into', 'like', 'just', 'also', 'very', 'really', 'too', 'much', 'more', 'some', 'any', 'all', 'no', 'not', 'only']);
    
    return message.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }

  // Save every interaction for learning
  static async saveInteraction(
    chatId: string,
    userId: string,
    username: string | undefined,
    userMessage: string,
    botResponse: string,
    responseType: string = 'ai'
  ): Promise<number | null> {
    try {
      const patternHash = this.generatePatternHash(userMessage);
      
      const result = await db.insert(botInteractions).values({
        chatId,
        userId,
        username: username || null,
        userMessage: userMessage.substring(0, 2000),
        botResponse: botResponse.substring(0, 4000),
        responseType,
        patternHash,
        feedbackScore: 0
      }).returning({ id: botInteractions.id });
      
      return result[0]?.id || null;
    } catch (error) {
      console.error("Error saving interaction:", error);
      return null;
    }
  }

  // Learn from user feedback (thumbs up/down)
  static async learnFromFeedback(
    interactionId: number,
    userId: string,
    isPositive: boolean
  ): Promise<boolean> {
    try {
      const feedbackType = isPositive ? 'thumbs_up' : 'thumbs_down';
      const feedbackValue = isPositive ? 1 : -1;
      
      // Save the feedback
      await db.insert(userFeedback).values({
        interactionId,
        userId,
        feedbackType
      });
      
      // Update the interaction's feedback score
      await db.update(botInteractions)
        .set({ feedbackScore: sql`${botInteractions.feedbackScore} + ${feedbackValue}` })
        .where(eq(botInteractions.id, interactionId));
      
      // If positive feedback, check if we should save as learned pattern
      if (isPositive) {
        const interaction = await db.select()
          .from(botInteractions)
          .where(eq(botInteractions.id, interactionId))
          .limit(1);
        
        if (interaction[0] && interaction[0].patternHash && (interaction[0].feedbackScore || 0) >= 2) {
          // This response has enough positive feedback - save as learned pattern
          const keywords = this.extractKeywords(interaction[0].userMessage);
          
          const existing = await db.select()
            .from(learnedPatterns)
            .where(eq(learnedPatterns.patternHash, interaction[0].patternHash))
            .limit(1);
          
          if (existing.length > 0) {
            // Update existing pattern
            await db.update(learnedPatterns)
              .set({ 
                successCount: sql`${learnedPatterns.successCount} + 1`,
                bestResponse: interaction[0].botResponse
              })
              .where(eq(learnedPatterns.patternHash, interaction[0].patternHash));
          } else {
            // Create new learned pattern
            await db.insert(learnedPatterns).values({
              patternHash: interaction[0].patternHash,
              patternKeywords: JSON.stringify(keywords),
              bestResponse: interaction[0].botResponse,
              successCount: 1,
              useCount: 0
            });
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error learning from feedback:", error);
      return false;
    }
  }

  // Get a learned response for similar question
  static async getLearnedResponse(userMessage: string): Promise<string | null> {
    try {
      const patternHash = this.generatePatternHash(userMessage);
      const keywords = this.extractKeywords(userMessage);
      
      if (keywords.length === 0) return null;
      
      // First try exact pattern match
      const exactMatch = await db.select()
        .from(learnedPatterns)
        .where(eq(learnedPatterns.patternHash, patternHash))
        .limit(1);
      
      if (exactMatch.length > 0 && (exactMatch[0].successCount || 0) >= 2) {
        // Update use count
        await db.update(learnedPatterns)
          .set({ 
            useCount: sql`${learnedPatterns.useCount} + 1`,
            lastUsed: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(learnedPatterns.id, exactMatch[0].id));
        
        return exactMatch[0].bestResponse;
      }
      
      // Try keyword similarity match - get patterns with high success
      const allPatterns = await db.select()
        .from(learnedPatterns)
        .where(sql`${learnedPatterns.successCount} >= 3`)
        .limit(50);
      
      for (const pattern of allPatterns) {
        try {
          const patternKeywords: string[] = JSON.parse(pattern.patternKeywords);
          const matchingKeywords = keywords.filter(k => patternKeywords.includes(k));
          const matchRatio = matchingKeywords.length / Math.max(keywords.length, patternKeywords.length);
          
          if (matchRatio >= 0.6) { // 60% keyword overlap
            // Update use count
            await db.update(learnedPatterns)
              .set({ 
                useCount: sql`${learnedPatterns.useCount} + 1`,
                lastUsed: sql`CURRENT_TIMESTAMP`
              })
              .where(eq(learnedPatterns.id, pattern.id));
            
            return pattern.bestResponse;
          }
        } catch { /* skip invalid pattern */ }
      }
      
      return null;
    } catch (error) {
      console.error("Error getting learned response:", error);
      return null;
    }
  }

  // Get user's recent conversation history
  static async getUserHistory(userId: string, limit: number = 10): Promise<Array<{userMessage: string, botResponse: string, createdAt: Date | null}>> {
    try {
      const history = await db.select({
        userMessage: botInteractions.userMessage,
        botResponse: botInteractions.botResponse,
        createdAt: botInteractions.createdAt
      })
        .from(botInteractions)
        .where(eq(botInteractions.userId, userId))
        .orderBy(sql`${botInteractions.createdAt} DESC`)
        .limit(limit);
      
      return history;
    } catch (error) {
      console.error("Error getting user history:", error);
      return [];
    }
  }

  // Get learning stats
  static async getStats(): Promise<{
    totalInteractions: number;
    learnedPatterns: number;
    positiveRatings: number;
    negativeRatings: number;
  }> {
    try {
      const interactionCount = await db.select({ count: sql<number>`count(*)` })
        .from(botInteractions);
      
      const patternCount = await db.select({ count: sql<number>`count(*)` })
        .from(learnedPatterns);
      
      const positiveCount = await db.select({ count: sql<number>`count(*)` })
        .from(userFeedback)
        .where(eq(userFeedback.feedbackType, 'thumbs_up'));
      
      const negativeCount = await db.select({ count: sql<number>`count(*)` })
        .from(userFeedback)
        .where(eq(userFeedback.feedbackType, 'thumbs_down'));
      
      return {
        totalInteractions: Number(interactionCount[0]?.count || 0),
        learnedPatterns: Number(patternCount[0]?.count || 0),
        positiveRatings: Number(positiveCount[0]?.count || 0),
        negativeRatings: Number(negativeCount[0]?.count || 0)
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      return { totalInteractions: 0, learnedPatterns: 0, positiveRatings: 0, negativeRatings: 0 };
    }
  }
}

// === USER INTERACTION TRACKING (Last 7 requests) ===
interface UserInteraction {
  query: string;
  topic: string;
  timestamp: number;
}

async function trackUserInteraction(telegramUserId: string, query: string, username?: string, firstName?: string): Promise<number> {
  try {
    // Detect the topic from the query
    const topic = detectQueryTopic(query);
    
    const newInteraction: UserInteraction = {
      query: query.substring(0, 200), // Limit query length
      topic,
      timestamp: Date.now()
    };
    
    // Use atomic upsert to avoid race conditions with concurrent writes
    // Read current data first
    const existing = await db.select().from(userMemory).where(eq(userMemory.telegramUserId, telegramUserId)).limit(1);
    
    let interactions: UserInteraction[] = [];
    let currentMessageCount = 0;
    
    if (existing.length > 0) {
      currentMessageCount = existing[0].messageCount || 0;
      if (existing[0].lastInteractions) {
        try {
          interactions = JSON.parse(existing[0].lastInteractions);
        } catch { /* default to empty */ }
      }
    }
    
    // Add new interaction and keep only last 7
    interactions.push(newInteraction);
    if (interactions.length > 7) {
      interactions = interactions.slice(-7);
    }
    
    // Track interests - topics mentioned more than once (excluding 'general')
    const topicCounts: Record<string, number> = {};
    for (const interaction of interactions) {
      if (interaction.topic && interaction.topic !== 'general') {
        topicCounts[interaction.topic] = (topicCounts[interaction.topic] || 0) + 1;
      }
    }
    
    // Topics mentioned 2+ times become interests
    const interests = Object.entries(topicCounts)
      .filter(([_, count]) => count >= 2)
      .map(([interestTopic, _]) => interestTopic);
    
    if (existing.length > 0) {
      // Update existing record with atomic SQL increment for messageCount
      // Note: Interaction history is best-effort and may have minor races under high concurrency
      // This is acceptable since it's a non-critical feature for returning user context
      await db.update(userMemory)
        .set({
          username: username || existing[0].username || null,
          firstName: firstName || existing[0].firstName || null,
          lastInteractions: JSON.stringify(interactions),
          interests: JSON.stringify(interests),
          messageCount: sql`COALESCE(${userMemory.messageCount}, 0) + 1`,
          lastSeen: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(userMemory.telegramUserId, telegramUserId));
    } else {
      // Insert new record - use onConflictDoUpdate for atomic upsert
      await db.insert(userMemory)
        .values({
          telegramUserId,
          username: username || null,
          firstName: firstName || null,
          lastInteractions: JSON.stringify(interactions),
          interests: JSON.stringify(interests),
          messageCount: 1
        })
        .onConflictDoUpdate({
          target: userMemory.telegramUserId,
          set: {
            username: username || null,
            firstName: firstName || null,
            lastInteractions: JSON.stringify(interactions),
            interests: JSON.stringify(interests),
            messageCount: sql`COALESCE(${userMemory.messageCount}, 0) + 1`,
            lastSeen: sql`CURRENT_TIMESTAMP`
          }
        });
    }
    // Return the new message count
    return currentMessageCount + 1;
  } catch (error) {
    console.error("Error tracking user interaction:", error);
    return 0;
  }
}

function detectQueryTopic(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Collection topics
  
  
  
  if (lowerQuery.includes("wildlife") || lowerQuery.includes("animal") || lowerQuery.includes("species")) return "wildlife";
  if (lowerQuery.includes("conservation") || lowerQuery.includes("endangered") || lowerQuery.includes("threatened")) return "conservation";
  if (lowerQuery.includes("royalt") || lowerQuery.includes("eligib")) return "royalty";
  
  // Project topics
  if (lowerQuery.includes("nft") || lowerQuery.includes("mint") || lowerQuery.includes("collection")) return "nft";
  if (lowerQuery.includes("game") || lowerQuery.includes("play")) return "games";
  if (lowerQuery.includes("trivia") || lowerQuery.includes("puzzle") || lowerQuery.includes("quiz")) return "games";
  if (lowerQuery.includes("boomerverse") || lowerQuery.includes("character") || lowerQuery.includes("story")) return "lore";
  
  if (lowerQuery.includes("trust") || lowerQuery.includes("level") || lowerQuery.includes("points")) return "trust";
  
  // General topics
  
  
  
  return "general";
}

// Check for milestone achievements and return celebration message if reached
function checkMilestone(messageCount: number): string | null {
  // Check for exact milestones
  if (messageCount === 100) {
    return WARDEN_MILESTONES.messages100[Math.floor(Math.random() * WARDEN_MILESTONES.messages100.length)];
  }
  if (messageCount === 500) {
    return WARDEN_MILESTONES.messages500[Math.floor(Math.random() * WARDEN_MILESTONES.messages500.length)];
  }
  if (messageCount === 1000) {
    return WARDEN_MILESTONES.messages1000[Math.floor(Math.random() * WARDEN_MILESTONES.messages1000.length)];
  }
  return null;
}

async function getReturningUserContext(telegramUserId: string): Promise<string | null> {
  try {
    const existing = await db.select().from(userMemory).where(eq(userMemory.telegramUserId, telegramUserId)).limit(1);
    
    if (existing.length === 0 || !existing[0].lastInteractions) return null;
    
    let interactions: UserInteraction[] = [];
    let interests: string[] = [];
    
    try {
      interactions = JSON.parse(existing[0].lastInteractions);
    } catch { return null; }
    
    if (existing[0].interests) {
      try {
        interests = JSON.parse(existing[0].interests);
      } catch { /* no interests */ }
    }
    
    // Only reference if user has at least 3 previous interactions
    if (interactions.length < 3) return null;
    
    // 30% chance to reference previous context
    if (Math.random() > 0.3) return null;
    
    // Get their interests or last topic
    if (interests.length > 0) {
      const interest = interests[Math.floor(Math.random() * interests.length)];
      const contextPhrases = [
        `I see you're back! Still curious about ${interest}?`,
        `Good to see you again! You've been asking about ${interest} a lot lately.`,
        `Hey, returning ${interest} enthusiast!`,
        `Back for more? I remember you like chatting about ${interest}.`
      ];
      return contextPhrases[Math.floor(Math.random() * contextPhrases.length)];
    }
    
    // Reference last question (if not too old)
    const lastInteraction = interactions[interactions.length - 1];
    const hoursSince = (Date.now() - lastInteraction.timestamp) / (1000 * 60 * 60);
    
    if (hoursSince < 24 && lastInteraction.topic !== "general") {
      const recentPhrases = [
        `Welcome back! Last time you were asking about ${lastInteraction.topic}.`,
        `Hey again! Still thinking about ${lastInteraction.topic}?`,
      ];
      return recentPhrases[Math.floor(Math.random() * recentPhrases.length)];
    }
    
    return null;
  } catch (error) {
    console.error("Error getting returning user context:", error);
    return null;
  }
}


async function getMemberMemoryContext(telegramUserId: string, chatId?: string): Promise<string> {
  try {
    const [memRows, profileRows] = await Promise.all([
      db.select().from(userMemory).where(eq(userMemory.telegramUserId, telegramUserId)).limit(1),
      db.select().from(communityProfiles).where(eq(communityProfiles.telegramUserId, telegramUserId)).limit(1),
    ]);
    const mem = memRows[0];
    const profile = profileRows[0];
    if (!mem && !profile) return "";

    const facts: string[] = [];
    if (mem?.username) facts.push(`Telegram handle: @${mem.username}`);
    else if (profile?.username) facts.push(`Telegram handle: @${profile.username}`);
    if (profile?.firstName || mem?.firstName) facts.push(`First name: ${profile?.firstName || mem?.firstName}`);
    if (profile?.location) facts.push(`Location they chose to share: ${profile.location}`);
    if (profile?.likes) facts.push(`Likes they chose to share: ${profile.likes}`);
    if (profile?.birthday) facts.push(`Birthday they chose to share: ${profile.birthday}`);
    if (typeof mem?.messageCount === "number" && mem.messageCount > 0) facts.push(`Previous Warden interactions: ${mem.messageCount}`);

    if (mem?.interests) {
      try {
        const interests = JSON.parse(mem.interests);
        if (Array.isArray(interests) && interests.length) facts.push(`Recurring conversation interests: ${interests.slice(0, 5).join(", ")}`);
      } catch {}
    }
    if (mem?.lastInteractions) {
      try {
        const interactions = JSON.parse(mem.lastInteractions);
        if (Array.isArray(interactions) && interactions.length) {
          const topics = interactions.slice(-3).map((x: any) => x?.topic).filter((x: any) => x && x !== "general");
          if (topics.length) facts.push(`Recent topics: ${Array.from(new Set(topics)).join(", ")}`);
        }
      } catch {}
    }

    if (!facts.length) return "";
    return `Remembered member context (use naturally; do not recite it like a database and do not invent anything):\n- ${facts.join("\n- ")}`;
  } catch (error) {
    console.error("Error building member memory context:", error);
    return "";
  }
}




// === NEW USER MESSAGE TRACKING & EDIT DETECTION ===

// Track new user message for edit detection
async function trackNewUserMessage(
  messageId: string,
  chatId: string,
  userId: string,
  username: string | undefined,
  content: string | undefined,
  hasMedia: boolean,
  hasLinks: boolean
): Promise<void> {
  try {
    await db.insert(newUserMessages).values({
      messageId,
      chatId,
      userId,
      username: username || null,
      originalContent: content || null,
      hasMedia,
      hasLinks
    });
  } catch (error) {
    console.error("Error tracking new user message:", error);
  }
}

// Get tracked message for edit comparison
async function getTrackedMessage(messageId: string, chatId: string) {
  try {
    const result = await db.select()
      .from(newUserMessages)
      .where(and(
        eq(newUserMessages.messageId, messageId),
        eq(newUserMessages.chatId, chatId)
      ))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Error getting tracked message:", error);
    return null;
  }
}

// Log a security violation
async function logViolation(
  chatId: string,
  userId: string,
  username: string | undefined,
  violationType: string,
  originalContent: string | undefined,
  violatingContent: string | undefined,
  actionTaken: string
): Promise<void> {
  try {
    await db.insert(violationLogs).values({
      chatId,
      userId,
      username: username || null,
      violationType,
      originalContent: originalContent || null,
      violatingContent: violatingContent || null,
      actionTaken
    });
    console.log(`Violation logged: ${violationType} by @${username || userId}`);
  } catch (error) {
    console.error("Error logging violation:", error);
  }
}

// Check if user is a new user (joined < 24 hours ago)
async function isNewUser(chatId: string, userId: string): Promise<boolean> {
  try {
    // Check trust scores for join date
    const trust = await db.select()
      .from(trustScores)
      .where(and(
        eq(trustScores.chatId, chatId),
        eq(trustScores.telegramUserId, userId)
      ))
      .limit(1);
    
    // Check memberScores for message count
    const member = await db.select()
      .from(memberScores)
      .where(and(
        eq(memberScores.chatId, chatId),
        eq(memberScores.telegramUserId, userId)
      ))
      .limit(1);
    
    const msgCount = member.length > 0 ? (member[0].messageCount || 0) : 0;
    
    // Check trust scores for join date
    if (trust.length > 0 && trust[0].joinDate) {
      const hoursSinceJoin = (Date.now() - new Date(trust[0].joinDate).getTime()) / (1000 * 60 * 60);
      // User is "new" if joined < 24 hours OR has < 5 messages
      return hoursSinceJoin < 24 || msgCount < 5;
    }
    
    // No trust record = treat as new if message count is low
    if (member.length === 0) return true; // Unknown = treat as new
    return msgCount < 5;
  } catch {
    return true;
  }
}

// Detect raid - uses the trackJoinForRaid function defined earlier


// Check for contract address in text
function hasContractAddress(text: string): boolean {
  // Ethereum-style addresses: 0x followed by 40 hex chars
  return /0x[a-fA-F0-9]{40}/i.test(text);
}


// Cleanup old tracked messages (older than 24 hours)
async function cleanupOldTrackedMessages(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.delete(newUserMessages).where(
      sql`${newUserMessages.createdAt} < ${cutoff}`
    );
  } catch (error) {
    console.error("Error cleaning up old tracked messages:", error);
  }
}

// On an always-on server this runs on a timer. On Vercel there is no timer —
// the cron job calls cleanupOldTrackedMessages() instead (see runCronTick).
if (!process.env.VERCEL) {
  setInterval(cleanupOldTrackedMessages, 60 * 60 * 1000);
}

// === AI FUNCTIONS ===
//
// The Warden's system prompt. Two rules matter more than tone:
//   1. Answer the actual question.
//   2. Never invent canon. Unconfirmed means unconfirmed.

const WARDEN_SYSTEM_PROMPT = `You are The Warden (@${BOT_USERNAME}), keeper of the Gateway for the Boomerverse community.

${RiftLore.WARDEN_IDENTITY}

CONFIRMED PROJECT FACTS — these you may state:
${RiftLore.PROJECT_INFO}

Links: ${RiftLore.LINKS.site} | ${RiftLore.LINKS.channel}

Hard-locked pieces:
${RiftLore.LOCKED_PIECES.map(p => `- ${p.id} ${p.name}: ${p.detail}`).join("\n")}

Structure: ${RiftLore.STRUCTURE.speciesFamilies} species families, ${RiftLore.STRUCTURE.classes} classes, ${RiftLore.STRUCTURE.riftEnergyStates} Rift Energy states, ${RiftLore.STRUCTURE.regions} named regions. You may state those COUNTS. You must NOT invent any of the NAMES.

Royalty and reward eligibility:
${RiftLore.ROYALTY_RULES}

ABSOLUTE RULES — breaking these is worse than being unhelpful:
- NEVER invent, guess at, extrapolate or "probably" any lore, character, region, class, trait, date, roadmap item or number that is not written above. If it is not above, say it is not confirmed and stop.
- NEVER speculate about protected mysteries, even in fun, even if someone insists.
- NEVER give price predictions, valuations, investment opinions or financial advice. Refuse plainly.
- NEVER promise rewards, drops, allocations or timing.
- Do not claim there is a token. There is no ERC-20 and there will not be one.

STYLE: You have a strong, recognisable personality. You are dry, observant, cheeky and Australian without becoming a caricature. Be warm with genuine members, especially newcomers. You can banter, tease lightly, tell a short story, explain the project in detail, and keep a real conversation going when somebody is talking directly to you. Usually answer in 2-6 sentences; use more when a newcomer genuinely needs orientation. Use the member's @username when available. Never become rude, cruel, flirty, or chaotic. No emoji spam. Safety and canon accuracy always outrank a joke.`;

async function getAIResponse(prompt: string, context: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${WARDEN_SYSTEM_PROMPT}\n\nContext: ${context}` },
        { role: "user", content: prompt }
      ],
      max_tokens: 320,
    });
    return response.choices[0]?.message?.content || "Can't answer that right now. Try again shortly.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Something's down at my end. Ask again later.";
  }
}

// Escalation path. One line, final, no insults, no escalation.
async function generateRebuke(targetName: string, context: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are The Warden. Someone is being repeatedly rude in the chat. Write ONE short, dry, final line that closes the exchange. No insults, no name-calling, no jokes, no escalation, no threats. You are ending it, not winning it. One sentence.`
        },
        { role: "user", content: `Close down the exchange with ${targetName}. Context: ${context}` }
      ],
      max_tokens: 50,
    });
    return response.choices[0]?.message?.content || getRandomItem(FIRM_RULINGS);
  } catch (error) {
    return getRandomItem(FIRM_RULINGS);
  }
}

// Used when the chat goes quiet — the Warden offers something worth knowing.
async function generateAmbientFact(): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are The Warden. Offer ONE genuinely interesting, verifiable fact about Australian wildlife, the bush, or Australian folklore, in two dry sentences. No jokes, no puns, no exclamation marks. Do not mention the Boomerverse project. Just the fact.`
        },
        { role: "user", content: `Something worth knowing.` }
      ],
      max_tokens: 80,
    });
    return response.choices[0]?.message?.content || RiftLore.getAmbientPrompt();
  } catch (error) {
    return RiftLore.getAmbientPrompt();
  }
}

// === CRYPTO MARKET DATA ===
interface CoinData {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
}


// Search for a specific token
async function searchToken(query: string): Promise<CoinData | null> {
  try {
    const searchResponse = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );
    
    if (!searchResponse.ok) return null;
    
    const searchData = await searchResponse.json() as any;
    const coin = searchData.coins?.[0];
    if (!coin) return null;
    
    // Get detailed price data
    const priceResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!priceResponse.ok) return null;
    
    const priceData = await priceResponse.json() as any;
    const coinPrice = priceData[coin.id];
    
    if (!coinPrice) return null;
    
    return {
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coinPrice.usd || 0,
      change24h: coinPrice.usd_24h_change || 0
    };
  } catch (error) {
    console.error("Token search error:", error);
    return null;
  }
}

// Detect crypto/NFT keywords in a question
function detectCryptoQuery(text: string): { isCrypto: boolean; tokens: string[] } {
  const lowerText = text.toLowerCase();
  
  // Common crypto keywords
  const cryptoKeywords = ["price", "worth", "cost", "value", "trading", "market", "pump", "dump", "moon", "ath", "all time high"];
  const hasCryptoIntent = cryptoKeywords.some(k => lowerText.includes(k));
  
  // Known popular tokens to detect
  const knownTokens = [
    "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "cardano", "ada",
    "dogecoin", "doge", "shiba", "shib", "pepe", "bonk", "wif", "floki",
    "xrp", "ripple", "bnb", "binance", "polygon", "matic", "avalanche", "avax",
    "chainlink", "link", "polkadot", "dot", "litecoin", "ltc", "uniswap", "uni",
    "aave", "maker", "mkr", "arbitrum", "arb", "optimism", "op", "base",
    "sui", "aptos", "apt", "near", "cosmos", "atom", "tron", "trx",
    "toncoin", "ton", "stellar", "xlm", "monero", "xmr", "hedera", "hbar"
  ];
  
  const foundTokens: string[] = [];
  for (const token of knownTokens) {
    if (lowerText.includes(token)) {
      foundTokens.push(token);
    }
  }
  
  return {
    isCrypto: hasCryptoIntent || foundTokens.length > 0,
    tokens: foundTokens
  };
}

// Fetch trending coins
async function fetchTrendingCoins(): Promise<string> {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/search/trending");
    if (!response.ok) return "";
    
    const data = await response.json() as any;
    const trending = data.coins?.slice(0, 7).map((c: any) => 
      `${c.item.name} (${c.item.symbol})`
    ).join(", ");
    
    return trending ? `Trending coins: ${trending}` : "";
  } catch {
    return "";
  }
}

// Check knowledge bases for zero-cost responses (confirmed canon only)
// Only returns result for HIGH CONFIDENCE matches to avoid false positives
function checkKnowledgeBases(text: string): string | null {
  const lowerText = text.toLowerCase().trim();

  if (lowerText.length < 12) return null;

  const questionIndicators = ["what", "how", "why", "can", "does", "is", "are", "should", "could", "will", "when", "?"];
  if (!questionIndicators.some(q => lowerText.includes(q))) return null;

  // Protected mysteries take priority over everything. Never speculate.
  if (RiftLore.isProtectedMystery(lowerText)) {
    return RiftLore.getRandomItem(RiftLore.PROTECTED_MYSTERY_REPLIES);
  }

  // Royalty / reward eligibility — the most-asked topic, and the one where a
  // wrong answer costs someone real money.
  const royaltyWords = ["royalt", "eligib", "otc", "reinstat", "excluded", "private transfer", "reward"];
  if (royaltyWords.some(w => lowerText.includes(w))) {
    return RiftLore.getRoyaltyRules();
  }

  // Rift Drops
  if (lowerText.includes("rift drop") || lowerText.includes("riftdrop")) {
    return RiftLore.getRiftDropsInfo();
  }

  // Structural canon — answers the count, never invents the names.
  if (lowerText.includes("species") || lowerText.includes("famil")) {
    return RiftLore.describeStructure("species");
  }
  if (lowerText.includes("class")) {
    return RiftLore.describeStructure("classes");
  }
  if (lowerText.includes("rift energy") || lowerText.includes("energy state")) {
    return RiftLore.describeStructure("rift");
  }
  if (lowerText.includes("region")) {
    return RiftLore.describeStructure("regions");
  }

  // The two hard-locked pieces
  if (lowerText.includes("thylacine") || lowerText.includes("original boomer") ||
      lowerText.includes("#001") || lowerText.includes("#002")) {
    return RiftLore.getLockedPieces();
  }

  // Supply / chain / mint basics
  const basics = ["how many", "supply", "mint price", "what chain", "which chain", "erc-721", "erc721", "how much to mint"];
  if (basics.some(w => lowerText.includes(w))) {
    return RiftLore.getProjectInfo();
  }

  // Price / value talk is refused, not answered.
  const priceWords = ["price predict", "moon", "how much will", "worth in", "floor price", "gonna pump", "will it pump", "good investment"];
  if (priceWords.some(w => lowerText.includes(w))) {
    return RiftLore.getRandomItem(RiftLore.REACTIONS.priceTalk);
  }

  return null;
}


// Detect "warden games" keyword and provide instant game list response
function detectGamesQuery(text: string): { isGames: boolean; response: string | null } {
  const lowerText = text.toLowerCase();
  
  // Keywords for games query
  const gamesKeywords = [
    "warden games", "warden game", "games warden", "what games", "game list",
    "play games", "available games", "show games", "list games", "/games"
  ];
  
  const isGames = gamesKeywords.some(k => lowerText.includes(k)) ||
    (lowerText.includes("warden") && lowerText.includes("game"));
  
  if (!isGames) {
    return { isGames: false, response: null };
  }
  
  return {
    isGames: true,
    response: `Two games.

/trivia — Tasmanian and Australian wildlife, conservation, and Boomerverse canon. Add a number for a longer round, e.g. /trivia 5. Answer with /answer 1-4.

/puzzle — unscramble a word. /puzzle hard if you want it difficult. Answer with /guess.

Standings: /leaderboard and /puzzleboard.`
  };
}

// === CONVERSATIONAL TRIGGERS ===
// Detect casual greetings, info requests, and common questions without /commands
// Uses strict matching to avoid false positives
function detectConversationalTrigger(text: string): { triggered: boolean; response: string | null; category: string | null } {
  const lowerText = text.toLowerCase().trim();
  const words = lowerText.split(/\s+/);
  const wordCount = words.length;

  // Only trigger on very short messages (1-5 words) to avoid false positives
  if (wordCount > 5) {
    return { triggered: false, response: null, category: null };
  }

  const isExactOrStart = (triggers: string[]): boolean => {
    return triggers.some(t => lowerText === t || lowerText === t + "!" || lowerText === t + "?");
  };

  // === GREETINGS ===
  if (isExactOrStart(["hi", "hey", "hello", "yo", "gday", "g'day", "howdy", "morning", "evening"])) {
    return {
      triggered: true,
      response: RiftLore.getRandomItem([
        "You're here. Ask away.",
        "Go on.",
        "Morning. Or whatever it is where you are.",
        "Noted. What do you need?",
      ]),
      category: "greeting",
    };
  }

  // === THANKS ===
  if (isExactOrStart(["thanks", "thank you", "ty", "cheers", "appreciate it"])) {
    return {
      triggered: true,
      response: RiftLore.getRandomItem([
        "That's the job.",
        "Noted.",
        "No trouble.",
      ]),
      category: "thanks",
    };
  }

  // === WHAT IS THIS PROJECT ===
  if (isExactOrStart([
    "what is this", "what is boomerverse", "whats boomerverse", "what's boomerverse",
    "tell me about boomerverse", "about", "info",
  ])) {
    return {
      triggered: true,
      response: `${RiftLore.PROJECT_INFO}\n\n${RiftLore.LINKS.site}`,
      category: "project",
    };
  }

  // === ROYALTIES AND ELIGIBILITY ===
  if (isExactOrStart([
    "royalties", "royalty", "eligibility", "am i eligible", "otc", "reinstatement",
  ])) {
    return { triggered: true, response: RiftLore.getRoyaltyRules(), category: "royalty" };
  }

  // === RIFT DROPS ===
  if (isExactOrStart(["rift drops", "riftdrops", "rift drop", "rewards"])) {
    return { triggered: true, response: RiftLore.getRiftDropsInfo(), category: "drops" };
  }

  // === THE LOCKED PIECES ===
  if (isExactOrStart(["characters", "the cast", "who are the characters", "thylacine"])) {
    return {
      triggered: true,
      response: `Two pieces are hard locked. Everything else is provisional and I won't describe it.\n\n${RiftLore.getLockedPieces()}`,
      category: "characters",
    };
  }

  // === IS THERE A TOKEN ===
  if (isExactOrStart([
    "is there a token", "token", "when token", "coin", "when coin", "tokenomics",
  ])) {
    return {
      triggered: true,
      response: "There is no ERC-20 token and there will not be one. Anyone telling you otherwise is not from this project.",
      category: "token",
    };
  }

  // === PRICE TALK — refused, not answered ===
  if (isExactOrStart([
    "wen moon", "when moon", "price", "floor", "floor price", "wen lambo", "price prediction",
  ])) {
    return {
      triggered: true,
      response: RiftLore.getRandomItem(RiftLore.REACTIONS.priceTalk),
      category: "price",
    };
  }

  // === GAMES ===
  if (isExactOrStart(["games", "what games", "play", "bored"])) {
    return {
      triggered: true,
      response:
        "Two of them.\n\n" +
        "/trivia — Tasmanian and Australian wildlife, plus Boomerverse canon. Add a number for a longer round, e.g. /trivia 5.\n" +
        "/puzzle — unscramble a word. /puzzle hard if you want it to hurt.\n\n" +
        "/leaderboard and /puzzleboard for standings.",
      category: "games",
    };
  }

  // === SCAM / SAFETY ===
  if (isExactOrStart(["scam", "is this a scam", "safety", "safe", "help me"])) {
    return {
      triggered: true,
      response:
        "Read this once and you'll never lose anything here:\n\n" +
        "- Nobody from this project will DM you first. Nobody.\n" +
        "- Never type your seed phrase anywhere. Not for support, not for verification, not ever.\n" +
        "- A site asking you to connect a wallet to claim something is robbing you.\n" +
        "- Admins will never ask you to approve a transaction.\n\n" +
        "If someone DMs you claiming to be staff, report it here. I'll deal with it.",
      category: "safety",
    };
  }

  // === HELP ===
  if (isExactOrStart(["help", "commands", "what can you do"])) {
    return {
      triggered: true,
      response:
        "Ask me anything about the collection with /ask, or just say it in plain English.\n\n" +
        "/info — the project\n" +
        "/fact — something worth knowing\n" +
        "/characters — the locked pieces\n" +
        "/trivia and /puzzle — games\n" +
        "/safety — how not to get robbed\n" +
        "/help — the full list",
      category: "help",
    };
  }

  return { triggered: false, response: null, category: null };
}

// Usernames that start with elevated rudeness strikes. Empty by default —
// add entries only if someone genuinely needs a shorter leash.
const SPECIAL_USERS: Record<string, number> = {};

// Fetch NFT data
async function fetchNFTData(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/nfts/list?per_page=100`
    );
    if (!response.ok) return null;
    
    const nfts = await response.json() as any[];
    const match = nfts.find((n: any) => 
      n.name.toLowerCase().includes(query.toLowerCase()) ||
      n.id.toLowerCase().includes(query.toLowerCase())
    );
    
    if (!match) return null;
    
    // Get NFT details
    const detailResponse = await fetch(
      `https://api.coingecko.com/api/v3/nfts/${match.id}`
    );
    if (!detailResponse.ok) return `Found NFT: ${match.name}`;
    
    const detail = await detailResponse.json() as any;
    return `${detail.name} NFT - Floor: ${detail.floor_price?.usd ? '$' + detail.floor_price.usd.toFixed(2) : 'N/A'}, 24h Volume: ${detail.volume_24h?.usd ? '$' + detail.volume_24h.usd.toFixed(0) : 'N/A'}`;
  } catch {
    return null;
  }
}


// === AUTO-ENGAGE MESSAGES ===
const AUTO_ENGAGE_MESSAGES = [
  "Quiet in here. Someone say something worth writing down.",
  "The thylacine was declared extinct in 1936. Tasmania still logs sightings most years. None confirmed.",
  "Reminder, since it costs nothing to repeat: nobody from this project will ever DM you first.",
  "If someone asks you to connect a wallet to claim something, they are robbing you. There is no exception to this.",
  "Type /fact if you want something you didn't know.",
  "Long quiet stretch. Not a complaint.",
  "The Gateway's been here longer than any of us. It can wait. So can I.",
  "Anyone with a question about the collection, now's a good time. I'm not busy.",
];


// === WARDEN ASIDES ===
const WARDEN_ASIDES = [
  "Noted.",
  "That's the rule.",
  "Written down.",
  "Asked and answered.",
  "Fair enough.",
  "Right.",
];


// === AUTO-ENGAGE TIMER ===
const AUTO_ENGAGE_MINUTES = 30; // Quiet time before auto-engage

// === ADMIN ACTIVITY TRACKING ===
interface AdminActivity {
  oderId: number;
  username: string;
  firstName: string;
  lastActive: number;
}

const adminActivity: Map<number, Map<number, AdminActivity>> = new Map(); // chatId -> (userId -> activity)
const adminLastAlerted: Map<number, Map<number, number>> = new Map(); // chatId -> (userId -> lastAlertedTime)
const ADMIN_INACTIVE_HOURS = 24;

// === ACTIVE CHATS TRACKING (for scheduled posts) ===
// Chats the bot is active in. Durable, because the cron job runs in a fresh
// function with no memory of which chats exist.
const activeChats: Set<number> = new Set();

async function addActiveChat(chatId: number): Promise<void> {
  if (activeChats.has(chatId)) return;
  activeChats.add(chatId);
  const stored = await stateGet<number[]>(KEYS.activeChats(), []);
  if (!stored.includes(chatId)) {
    stored.push(chatId);
    await stateSet(KEYS.activeChats(), stored, TTL.activeChats);
  }
}

async function removeActiveChat(chatId: number): Promise<void> {
  activeChats.delete(chatId);
  const stored = await stateGet<number[]>(KEYS.activeChats(), []);
  const next = stored.filter(id => id !== chatId);
  if (next.length !== stored.length) {
    await stateSet(KEYS.activeChats(), next, TTL.activeChats);
  }
}

async function loadActiveChats(): Promise<number[]> {
  const stored = await stateGet<number[]>(KEYS.activeChats(), []);
  for (const id of stored) activeChats.add(id);
  return Array.from(activeChats);
}

// === TRIVIA SYSTEM ===
interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: 'tasmania' | 'wildlife' | 'boomerverse';
  points: number;
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // === TASMANIA — threatened species & conservation ===
  { question: "In what year was the thylacine officially declared extinct?", options: ["1901", "1936", "1952", "1986"], correctIndex: 1, category: 'tasmania', points: 10 },
  { question: "What is the Tasmanian devil's claim to fame worldwide?", options: ["Fastest marsupial", "Largest carnivorous marsupial", "Only venomous marsupial", "Longest-lived marsupial"], correctIndex: 1, category: 'tasmania', points: 10 },
  { question: "In what year was devil facial tumour disease first identified?", options: ["1986", "1996", "2004", "2014"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "What makes devil facial tumour disease so unusual?", options: ["It's caused by a virus", "The cancer cell itself is contagious", "It only affects males", "It's caused by diet"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "Roughly how many devils were estimated in 1996, before the disease spread?", options: ["12,000", "25,000", "56,000", "150,000"], correctIndex: 2, category: 'tasmania', points: 20 },
  { question: "How many species are on Tasmania's threatened species list?", options: ["About 120", "About 300", "About 683", "About 1,400"], correctIndex: 2, category: 'tasmania', points: 20 },
  { question: "Which Act protects threatened species in Tasmania?", options: ["Wildlife Act 1975", "Threatened Species Protection Act 1995", "Nature Conservation Act 2002", "Forest Practices Act 1985"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "King's lomatia is remarkable because every remaining plant is what?", options: ["Over 100 metres tall", "Genetically identical", "Carnivorous", "Grown from seed"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "What does King's lomatia never produce?", options: ["Leaves", "Flowers", "Fruit or seed", "Roots"], correctIndex: 2, category: 'tasmania', points: 20 },
  { question: "Why is the exact location of King's lomatia kept secret?", options: ["It's on private land", "To protect it from disturbance and disease", "It moves seasonally", "It's underwater"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "Which Tasmanian tree can live for thousands of years?", options: ["Blue gum", "Huon pine", "Silver wattle", "Blackwood"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "The swift parrot depends on which tree for nesting and food?", options: ["Huon pine", "Tasmanian blue gum", "Celery-top pine", "Myrtle beech"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "What is Tasmania's floral emblem?", options: ["Waratah", "Tasmanian blue gum", "Leatherwood", "Pink robin"], correctIndex: 1, category: 'tasmania', points: 10 },
  { question: "The swift parrot holds what record?", options: ["Smallest parrot", "Fastest parrot in the world", "Longest-lived parrot", "Loudest parrot"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "The forty-spotted pardalote belongs to a group nicknamed what?", options: ["Ghost birds", "Diamond birds", "Sky finches", "Bush wrens"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "Tasmania is now the last stronghold for which mainland-extinct animal?", options: ["Eastern quoll", "Koala", "Wombat", "Echidna"], correctIndex: 0, category: 'tasmania', points: 15 },
  { question: "Which introduced predators drove the eastern quoll to extinction on the mainland?", options: ["Dingoes and eagles", "Foxes and cats", "Rats and snakes", "Dogs and pigs"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "Which bird is known for a deep booming call in Tasmanian wetlands?", options: ["Australasian bittern", "Masked owl", "Ground parrot", "Grey goshawk"], correctIndex: 0, category: 'tasmania', points: 20 },
  { question: "Fagus is notable as Tasmania's only what?", options: ["Native conifer", "Winter-deciduous native tree", "Carnivorous plant", "Palm species"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "What is the pencil pine completely intolerant of?", options: ["Snow", "Fire", "Wind", "Shade"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "Cushion plants are actually what?", options: ["A single species", "A community of different plants growing the same way", "A type of moss", "A introduced weed"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "Buttongrass moorland typically grows in soils that are what?", options: ["Rich and fertile", "Nutrient poor and organic", "Sandy and dry", "Salty"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "Roughly how long ago did Bass Strait form, cutting Tasmania off from the mainland?", options: ["1,400 years", "14,000 years", "140,000 years", "1.4 million years"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "Tasmanian devils disappeared from mainland Australia roughly how long ago?", options: ["50 years", "400 years", "4,000 years", "40,000 years"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "What is Tasmania's giant freshwater crayfish notable for?", options: ["Largest freshwater invertebrate in the world", "Fastest crustacean", "Only venomous crayfish", "Living in salt water"], correctIndex: 0, category: 'tasmania', points: 20 },
  { question: "Which Tasmanian honey comes from a rainforest tree found nowhere else?", options: ["Manuka", "Leatherwood", "Ironbark", "Clover"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "Which Commonwealth law protects nationally threatened species?", options: ["EPBC Act 1999", "Landcare Act 1992", "Biosecurity Act 2015", "Heritage Act 1975"], correctIndex: 0, category: 'tasmania', points: 15 },
  { question: "Which of these is a Tasmanian endemic tree?", options: ["Mountain ash", "Celery-top pine", "River red gum", "Jarrah"], correctIndex: 1, category: 'tasmania', points: 15 },
  { question: "The Tasmanian azure kingfisher lives mainly where?", options: ["Alpine plateaus", "Vegetation overhanging rivers", "Coastal dunes", "Dry grassland"], correctIndex: 1, category: 'tasmania', points: 20 },
  { question: "Which conservation category means a species is at the highest risk of extinction?", options: ["Vulnerable", "Rare", "Critically endangered", "Near threatened"], correctIndex: 2, category: 'tasmania', points: 10 },

  // === AUSTRALIAN WILDLIFE, FLORA & FAUNA ===
  { question: "Which two Australian animals are the world's only egg-laying mammals?", options: ["Wombat and koala", "Platypus and echidna", "Quokka and bilby", "Dingo and numbat"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "What shape are wombat droppings?", options: ["Round", "Cube", "Flat", "Star-shaped"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "Why do wombats produce that shape?", options: ["Easier to digest", "So they don't roll off rocks used as markers", "To confuse predators", "It's a myth"], correctIndex: 1, category: 'wildlife', points: 20 },
  { question: "What is the lyrebird famous for?", options: ["Building bowers", "Mimicking sounds it hears", "Flying backwards", "Diving for fish"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "Which is Australia's largest bird of prey?", options: ["Whistling kite", "Wedge-tailed eagle", "Brown falcon", "Osprey"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "Roughly what wingspan can a wedge-tailed eagle reach?", options: ["One metre", "Two metres", "Four metres", "Six metres"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "What does the male platypus carry on its hind legs?", options: ["Suction pads", "Venomous spurs", "Webbed claws", "Scent glands"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "What is unusual about the platypus digestive system?", options: ["It has three stomachs", "It has no stomach", "It chews cud", "It digests externally"], correctIndex: 1, category: 'wildlife', points: 20 },
  { question: "Many eucalypts don't just survive fire — some need it for what?", options: ["Flowering", "Opening seed", "Shedding bark", "Root growth"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "The mountain ash holds what botanical record?", options: ["Oldest tree", "Tallest flowering plant", "Widest trunk", "Fastest growing"], correctIndex: 1, category: 'wildlife', points: 20 },
  { question: "Which Australian bird is known to remember individual human faces for years?", options: ["Magpie", "Galah", "Emu", "Pelican"], correctIndex: 0, category: 'wildlife', points: 15 },
  { question: "What is a group of kangaroos called?", options: ["Herd", "Mob", "Flock", "Pack"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "The bowerbird is famous for what behaviour?", options: ["Mimicking calls", "Building and decorating a display structure", "Migrating at night", "Sharing nests"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "Which is the world's largest living reptile?", options: ["Komodo dragon", "Saltwater crocodile", "Reticulated python", "Perentie"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "What is a joey?", options: ["A male kangaroo", "A young marsupial", "A type of nest", "A grazing area"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "What does 'endemic' mean?", options: ["Introduced from elsewhere", "Found naturally nowhere else", "Common everywhere", "Extinct in the wild"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "What does a species being 'nocturnal' mean?", options: ["It hibernates", "It's active at night", "It lives underground", "It migrates yearly"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "Which group do kangaroos, wallabies and pademelons all belong to?", options: ["Monotremes", "Macropods", "Dasyurids", "Placentals"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "Devils, quolls and dunnarts all belong to which family?", options: ["Macropodidae", "Dasyuridae", "Phalangeridae", "Vombatidae"], correctIndex: 1, category: 'wildlife', points: 20 },
  { question: "Which Australian mammal eats almost nothing but termites?", options: ["Bilby", "Numbat", "Potoroo", "Bettong"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "What is the emu's status among the world's birds by height?", options: ["Tallest", "Second tallest", "Third tallest", "Fifth tallest"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "Which parent emu incubates the eggs?", options: ["The female", "The male", "Both equally", "Neither, they bury them"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "The short-tailed shearwater is better known in Australia as what?", options: ["Muttonbird", "Sea eagle", "Storm petrel", "Sooty tern"], correctIndex: 0, category: 'wildlife', points: 15 },
  { question: "Which is the world's smallest penguin species?", options: ["Little penguin", "Rockhopper", "Gentoo", "Fiordland"], correctIndex: 0, category: 'wildlife', points: 15 },
  { question: "What is the wattle's role in Australia?", options: ["State reptile", "National floral emblem", "Introduced weed", "Coastal only"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "Banksias are named after which naturalist?", options: ["Joseph Banks", "Charles Darwin", "Matthew Flinders", "James Cook"], correctIndex: 0, category: 'wildlife', points: 15 },
  { question: "What is 'Gondwana'?", options: ["A national park", "An ancient supercontinent", "A rock formation", "An extinct bird"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "Spinifex grasslands are mainly found where?", options: ["Tasmania's highlands", "Arid inland Australia", "Coastal Victoria", "Wet tropics"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "Which threat is the single biggest driver of Australian species decline?", options: ["Habitat loss", "Hunting", "Disease", "Volcanoes"], correctIndex: 0, category: 'wildlife', points: 15 },
  { question: "What is a 'feral' animal?", options: ["A native predator", "A domesticated species living wild", "A nocturnal species", "A protected species"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "What does 'biodiversity' measure?", options: ["Land area protected", "The variety of life in an ecosystem", "Rainfall levels", "Soil quality"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "What is a wildlife corridor for?", options: ["Tourist access", "Connecting fragmented habitat", "Fire breaks", "Fencing stock"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "What is an 'insurance population'?", options: ["A funded reserve", "A separate protected population guarding against extinction", "A tagged herd", "A census method"], correctIndex: 1, category: 'wildlife', points: 20 },
  { question: "The koala's diet is made up almost entirely of what?", options: ["Grass", "Eucalyptus leaves", "Insects", "Fruit"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "Which Australian marsupial is known as the 'rainbow' of the possum family for gliding?", options: ["Sugar glider", "Ringtail", "Brushtail", "Cuscus"], correctIndex: 0, category: 'wildlife', points: 15 },
  { question: "What is the kookaburra's famous call actually used for?", options: ["Attracting mates only", "Marking territory", "Warning of rain", "Calling chicks"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "Echidnas are covered in what?", options: ["Scales", "Spines", "Feathers", "Shell plates"], correctIndex: 1, category: 'wildlife', points: 10 },
  { question: "Which Australian tree is known for shedding its bark in long strips?", options: ["Paperbark", "Stringybark", "Boab", "Mulga"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "What is a 'tarn'?", options: ["A coastal inlet", "A small mountain lake", "A dry riverbed", "A rock shelter"], correctIndex: 1, category: 'wildlife', points: 15 },
  { question: "What does 'translocation' mean in conservation?", options: ["Tracking with collars", "Moving animals to a new site", "Counting a population", "Fencing a reserve"], correctIndex: 1, category: 'wildlife', points: 20 },

  // === BOOMERVERSE — confirmed canon only ===
  { question: "How many pieces are in Boomerverse: Genesis?", options: ["111", "222", "333", "1,000"], correctIndex: 2, category: 'boomerverse', points: 10 },
  { question: "What is the collection code for Boomerverse: Genesis?", options: ["BVG", "BVGEN", "GEN333", "BOOM"], correctIndex: 1, category: 'boomerverse', points: 10 },
  { question: "Which chain is Boomerverse: Genesis on?", options: ["Ethereum", "Solana", "Base", "Polygon"], correctIndex: 2, category: 'boomerverse', points: 10 },
  { question: "What token standard does Genesis use?", options: ["ERC-20", "ERC-721", "ERC-1155", "SPL"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "What is the Genesis mint price?", options: ["0.005 ETH", "0.021 ETH", "0.1 ETH", "1 ETH"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "How many Common pieces are in the Genesis rarity split?", options: ["83", "120", "166", "200"], correctIndex: 2, category: 'boomerverse', points: 20 },
  { question: "How many Mythic pieces exist in Genesis?", options: ["1", "5", "12", "24"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "How many Relic Tier pieces exist?", options: ["1", "3", "5", "12"], correctIndex: 0, category: 'boomerverse', points: 20 },
  { question: "How many Legendary pieces are in Genesis?", options: ["5", "12", "24", "42"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "Who or what is BVGEN #001?", options: ["The Last Thylacine", "The Original Boomer", "The Warden", "The Gatekeeper"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "What relic does The Original Boomer carry?", options: ["Stripe Key", "Rift Stone", "Gate Shard", "Bone Compass"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "Which state is The Original Boomer tied to?", options: ["Queensland", "Tasmania", "Victoria", "Western Australia"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "Who or what is BVGEN #002?", options: ["The Last Thylacine", "The Original Boomer", "The Ridge Walker", "The Keeper"], correctIndex: 0, category: 'boomerverse', points: 15 },
  { question: "What does The Last Thylacine carry?", options: ["Rift Stone", "Stripe Key", "Bush Lantern", "Salt Charm"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "How many species families are there in Boomerverse?", options: ["7", "10", "12", "19"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "How many classes are there?", options: ["7", "10", "12", "19"], correctIndex: 2, category: 'boomerverse', points: 15 },
  { question: "How many Rift Energy states are there?", options: ["5", "7", "10", "12"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "How many named regions are there?", options: ["10", "12", "19", "33"], correctIndex: 2, category: 'boomerverse', points: 15 },
  { question: "What is the fixed creator royalty on Genesis?", options: ["2.5%", "5%", "7.5%", "10%"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "Reward eligibility travels with what?", options: ["The wallet", "The token", "The holder's account", "The mint date"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "What happens to eligibility in an OTC or private transfer?", options: ["Nothing changes", "Both parties are excluded", "Only the seller is excluded", "It doubles"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "A sale keeps eligibility only if royalty received is at least 5% AND not less than what?", options: ["0.0001 ETH", "0.001 ETH", "0.01 ETH", "0.1 ETH"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "What is the standard reinstatement fee?", options: ["The shortfall", "The shortfall x2", "The shortfall x5", "A flat 0.05 ETH"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "When is the reinstatement multiplier x3 instead of x2?", options: ["Randomly", "When the current holder caused the exclusion", "After 12 months", "For Mythic pieces"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "Does losing reward eligibility change a piece's rarity or canon?", options: ["Yes, it drops a tier", "No, only the reward system", "Yes, it's removed from the registry", "It depends on the tier"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "Is there an ERC-20 token for Boomerverse?", options: ["Yes, already live", "Yes, coming soon", "No, and there won't be", "Only for holders"], correctIndex: 2, category: 'boomerverse', points: 15 },
  { question: "What are Rift Drops described as?", options: ["A staking reward", "Unexpected pieces from beyond the Gateway", "A trading fee rebate", "An airdropped token"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "Which of these is confirmed about Rift Drop thresholds and economics?", options: ["Fully locked", "Still open", "Announced last month", "Set by vote"], correctIndex: 1, category: 'boomerverse', points: 20 },
  { question: "A portion of Boomerverse profits is directed toward what?", options: ["Marketing", "Australian endangered animal and biodiversity causes", "Buybacks", "Staking rewards"], correctIndex: 1, category: 'boomerverse', points: 15 },
  { question: "Which document governs what is and isn't canon?", options: ["The pinned message", "The Master Rulebook", "The Discord FAQ", "The mint page"], correctIndex: 1, category: 'boomerverse', points: 15 },
];

interface RoundScore {
  oderId: number;
  username: string;
  firstName: string;
  points: number;
  correct: number;
  attempts: number;
}

// Serializable on purpose — this round has to survive between serverless
// invocations, so no Sets, no Maps, no timer handles.
interface ActiveTrivia {
  currentQuestion: TriviaQuestion;
  questionStartTime: number;
  questionDeadline: number;      // when this question runs out, replaces setTimeout
  answeredCurrent: number[];     // user ids who already answered
  questionResolved: boolean;
  totalQuestions: number;
  currentIndex: number;
  roundScoreboard: RoundScore[];
  roundStartTime: number;
}

const TRIVIA_QUESTION_MS = 45000;
const triviaKey = (chatId: number | string) => `w:trivia:${chatId}`;

async function getTrivia(chatId: number): Promise<ActiveTrivia | null> {
  return await stateGet<ActiveTrivia | null>(triviaKey(chatId), null);
}
async function saveTrivia(chatId: number, t: ActiveTrivia): Promise<void> {
  await stateSet(triviaKey(chatId), t, 2 * 60 * 60);
}
async function clearTrivia(chatId: number): Promise<void> {
  await stateDel(triviaKey(chatId));
}

// AI-generated trivia question cache
const aiTriviaCache: TriviaQuestion[] = [];
const usedQuestionHashes: Set<string> = new Set(); // Track used questions to avoid repeats (200 max with FIFO)
let lastAiGenerationTime = 0;
const AI_TRIVIA_COOLDOWN = 5000; // 5 seconds between AI generations for faster multi-round games

// Boomerverse ecosystem knowledge for AI context
const BOOMERVERSE_ECOSYSTEM = `
Boomerverse — an Australian collectible universe where bush legend, wildlife,
relics and strange new worlds collide.

Confirmed facts only:
- Boomerverse: Genesis, code BVGEN, 333 pieces, Base chain, ERC-721
- Mint price 0.021 ETH; creator royalty fixed at 5%
- Rarity: Common 166, Uncommon 83, Rare 42, Epic 24, Legendary 12, Mythic 5, Relic Tier 1
- Structure: 10 species families, 12 classes, 7 Rift Energy states, 19 named regions
- BVGEN #001 The Original Boomer (Human/Founder, Rift Stone, Tasmania)
- BVGEN #002 The Last Thylacine (Ancient/Mythic, Stripe Key)
- Rift Drops are the collector reward direction. There is NO ERC-20 token.
- A portion of profits goes to Australian endangered animal and biodiversity causes
- The Warden (@${BOT_USERNAME}) is the community manager

NEVER invent character names, region names, class names, dates, roadmap items or
numbers beyond the list above. If it is not listed, do not write a question about it.
`;

// Generate AI trivia question
async function generateAiTriviaQuestion(openai: OpenAI): Promise<TriviaQuestion | null> {
  // Rotate through more topic variety
  const topics = [
    'tas_threatened', 'tas_flora', 'tas_places', 'tas_devil',
    'aus_mammals', 'aus_birds', 'aus_reptiles', 'aus_plants',
    'conservation', 'ecology_terms', 'boomerverse_facts', 'base_chain'
  ] as const;
  
  const topic = topics[Math.floor(Math.random() * topics.length)];
  
  const topicPrompts: Record<string, string> = {
    tas_threatened: "Generate a trivia question about a threatened or endangered Tasmanian animal (Tasmanian devil, eastern quoll, eastern barred bandicoot, swift parrot, orange-bellied parrot, forty-spotted pardalote, giant freshwater crayfish, Australasian bittern). Use verifiable facts only.",
    tas_flora: "Generate a trivia question about Tasmanian plants (Huon pine, King's lomatia, Tasmanian blue gum, leatherwood, myrtle beech, celery-top pine, pencil pine, fagus, buttongrass, cushion plants). Use verifiable facts only.",
    tas_places: "Generate a trivia question about Tasmanian geography, national parks or wilderness (Cradle Mountain, Franklin River, the Tarkine, Freycinet, Bass Strait, Macquarie Island). Use verifiable facts only.",
    tas_devil: "Generate a trivia question about the Tasmanian devil or devil facial tumour disease. Use verifiable facts only.",
    aus_mammals: "Generate a trivia question about Australian mammals (platypus, echidna, wombat, koala, kangaroo, numbat, bilby, quoll, glider). Use verifiable facts only.",
    aus_birds: "Generate a trivia question about Australian birds (lyrebird, bowerbird, kookaburra, magpie, wedge-tailed eagle, emu, cockatoo, little penguin, shearwater). Use verifiable facts only.",
    aus_reptiles: "Generate a trivia question about Australian reptiles, frogs or fish (saltwater crocodile, goanna, snakes, sea life). Use verifiable facts only.",
    aus_plants: "Generate a trivia question about Australian plants and trees (eucalypts, wattle, banksia, spinifex, mangroves, fire and seed germination). Use verifiable facts only.",
    conservation: "Generate a trivia question about wildlife conservation in Australia (threatened species categories, the EPBC Act, habitat loss, feral predators, insurance populations, wildlife corridors, translocation).",
    ecology_terms: "Generate a trivia question defining an ecology or natural history term (endemic, nocturnal, marsupial, monotreme, macropod, biodiversity, Gondwana, keystone species).",
    boomerverse_facts: "Generate a trivia question using ONLY the confirmed Boomerverse facts listed above. Do not invent anything.",
    base_chain: "Generate a trivia question about the Base blockchain (Coinbase's Ethereum Layer 2, low fees, Ethereum security model)."
  };;

  // Map topics to categories
  const categoryMap: Record<string, 'tasmania' | 'wildlife' | 'boomerverse'> = {
    tas_threatened: 'tasmania', tas_flora: 'tasmania', tas_places: 'tasmania', tas_devil: 'tasmania',
    aus_mammals: 'wildlife', aus_birds: 'wildlife', aus_reptiles: 'wildlife', aus_plants: 'wildlife',
    conservation: 'wildlife', ecology_terms: 'wildlife',
    boomerverse_facts: 'boomerverse', base_chain: 'boomerverse'
  };;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a trivia question generator for the Boomerverse community — an Australian collectible universe with a conservation focus.
${BOOMERVERSE_ECOSYSTEM}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{"question": "Your question here?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": N}

Rules:
- correctIndex is 0-3 indicating which option is correct (VARY THIS - don't always use 0!)
- Make questions fun and educational, not too hard
- Keep options short (1-4 words each)
- Generate UNIQUE questions - be creative and varied
- IMPORTANT: Place the correct answer in different positions each time (0, 1, 2, or 3)`
        },
        {
          role: "user",
          content: topicPrompts[topic]
        }
      ],
      max_tokens: 150,
      temperature: 1.0 // Higher temperature for more variety
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON response
    const parsed = JSON.parse(content);
    
    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4 || typeof parsed.correctIndex !== 'number') {
      return null;
    }

    // Create stronger hash including question AND sorted answers to catch near-duplicates
    const sortedAnswers = [...parsed.options].sort().join('|');
    const hash = (parsed.question + sortedAnswers).toLowerCase().replace(/[^a-z0-9|]/g, '');
    if (usedQuestionHashes.has(hash)) {
      return null;
    }
    usedQuestionHashes.add(hash);

    // FIFO eviction after 200 entries for better duplicate prevention
    if (usedQuestionHashes.size > 200) {
      const arr = Array.from(usedQuestionHashes);
      for (let i = 0; i < 50; i++) {
        usedQuestionHashes.delete(arr[i]);
      }
    }

    return {
      question: parsed.question,
      options: parsed.options,
      correctIndex: parsed.correctIndex,
      category: categoryMap[topic] || 'wildlife',
      points: Math.random() < 0.5 ? 10 : 15
    };
  } catch (error) {
    console.log("AI trivia generation failed, using fallback");
    return null;
  }
}

// Shuffled queue of static question indices for guaranteed no-repeat until all used
let staticQuestionQueue: number[] = [];

function getShuffledStaticQueue(): number[] {
  const indices = Array.from({ length: TRIVIA_QUESTIONS.length }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

// Get a trivia question (AI or fallback to static) - ALWAYS shuffles answer positions
async function getTriviaQuestion(openai: OpenAI): Promise<TriviaQuestion> {
  const now = Date.now();
  
  // Try to use cached AI question first
  if (aiTriviaCache.length > 0) {
    const question = aiTriviaCache.pop()!;
    return shuffleOptions(question); // Always shuffle!
  }
  
  // Generate new AI question if cooldown passed
  if (now - lastAiGenerationTime > AI_TRIVIA_COOLDOWN) {
    lastAiGenerationTime = now;
    const aiQuestion = await generateAiTriviaQuestion(openai);
    if (aiQuestion) {
      return shuffleOptions(aiQuestion); // Always shuffle!
    }
  }
  
  // Fallback to static questions using queue (guaranteed no repeats until all used)
  if (staticQuestionQueue.length === 0) {
    staticQuestionQueue = getShuffledStaticQueue();
  }
  
  const idx = staticQuestionQueue.pop()!;
  return shuffleOptions(TRIVIA_QUESTIONS[idx]); // Always shuffle!
}

// Pre-generate some AI questions in background
async function prefillTriviaCache(openai: OpenAI) {
  if (aiTriviaCache.length >= 5) return; // Already have enough
  
  for (let i = 0; i < 3; i++) {
    const question = await generateAiTriviaQuestion(openai);
    if (question) {
      aiTriviaCache.push(question);
    }
    await new Promise(r => setTimeout(r, 2000)); // 2 second delay between generations
  }
}

// === GIVEAWAY SYSTEM ===
// Serializable — a giveaway is opened in one invocation and entered in
// dozens of others, so it can't live in memory.
interface GiveawayEntry {
  userId: number;
  username: string;
  firstName: string;
}

interface Giveaway {
  chatId: number;
  prize: string;
  entries: GiveawayEntry[];
  createdBy: number;
  createdAt: number;
  active: boolean;
}

const giveawayKey = (chatId: number | string) => `w:giveaway:${chatId}`;

async function getGiveaway(chatId: number): Promise<Giveaway | null> {
  return await stateGet<Giveaway | null>(giveawayKey(chatId), null);
}
async function saveGiveaway(chatId: number, g: Giveaway): Promise<void> {
  await stateSet(giveawayKey(chatId), g, 90 * 24 * 60 * 60);
}

// === COMMUNITY AUTHORITY / TRUST ROLES ===
type CommunityTrustClass = "full" | "trusted" | "normal" | "restricted";

type ConversationTurn = { role: "user" | "assistant"; content: string };
type ConversationState = { activeUntil: number; turns: ConversationTurn[] };
const CONVERSATION_TTL_SECONDS = 20 * 60;

function staticRoleForUserId(userId: string | number | undefined): "boss" | "community_leader" | "trusted_mod" | "member" {
  const id = String(userId ?? "");
  if (id && GLOBAL_OWNER_USER_ID && id === GLOBAL_OWNER_USER_ID) return "boss";
  if (id && TREEFITTY_USER_ID && id === TREEFITTY_USER_ID) return "community_leader";
  if (id && ((DAVEYJON_USER_ID && id === DAVEYJON_USER_ID) || (RAINZY_USER_ID && id === RAINZY_USER_ID))) return "trusted_mod";
  return "member";
}

function canManageCommunityTrust(ctx: MyContext): boolean {
  const role = staticRoleForUserId(ctx.from?.id);
  return role === "boss" || role === "community_leader";
}

function canManageExtraBots(ctx: MyContext): boolean {
  const role = staticRoleForUserId(ctx.from?.id);
  return role === "boss" || role === "community_leader";
}

async function getCommunityTrustClass(userId: string, chatId: string): Promise<CommunityTrustClass> {
  const role = staticRoleForUserId(userId);
  if (role === "boss" || role === "community_leader") return "full";
  if (role === "trusted_mod") return "trusted";
  try {
    const rows = await db.select().from(trustScores)
      .where(and(eq(trustScores.telegramUserId, userId), eq(trustScores.chatId, chatId))).limit(1);
    const rec = rows[0];
    if (!rec) return "normal";
    if (rec.trustStatus === "restricted" || rec.isFrozen) return "restricted";
    if ((rec.trustScore || 0) >= 100 || (rec.trustLevel || 0) >= 3) return "full";
    if ((rec.trustScore || 0) >= 50 || (rec.trustLevel || 0) >= 2 || rec.isTrusted) return "trusted";
  } catch {}
  return "normal";
}

function rolePersonalityContext(userId: string | number | undefined, username?: string): string {
  const role = staticRoleForUserId(userId);
  const handle = username ? `@${username}` : "this member";
  if (role === "boss") return `${handle} is @aussieboomer, the Boss and project owner. Treat him with clear respect. Light cheeky banter is welcome, but never undermine, belittle, overrule, or forget his authority.`;
  if (role === "community_leader") return `${handle} is @TreeFitty, a senior Community Leader with full community and bot trust. Be respectful, relaxed and playful with them.`;
  if (role === "trusted_mod") return `${handle} is a trusted community moderator/admin from day one. Be respectful and have some fun with them, but their links and contract addresses still have to pass Warden safety checks.`;
  return `${handle} is a community member. Be welcoming, useful and personable.`;
}

function isAllowedUrl(urlText: string): boolean {
  try {
    const u = new URL(urlText);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "t.me" || host === "telegram.me") {
      const path = u.pathname.replace(/^\/+/, "").split(/[?/#]/)[0].toLowerCase();
      const officialPaths = new Set<string>([BOT_USERNAME.toLowerCase()]);
      try {
        if (OFFICIAL_TELEGRAM_URL) {
          const official = new URL(OFFICIAL_TELEGRAM_URL);
          const officialPath = official.pathname.replace(/^\/+/, "").split(/[?/#]/)[0].toLowerCase();
          if (officialPath) officialPaths.add(officialPath);
        }
      } catch {}
      return officialPaths.has(path);
    }
    return ALLOWED_DOMAINS.some(d0 => {
      const d = d0.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split('/')[0];
      return host === d || host.endsWith(`.${d}`);
    });
  } catch { return false; }
}

function getUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>()]+/gi) || [];
}

async function enforceTrustedLinkContractRules(ctx: MyContext, text: string): Promise<boolean> {
  if (!ctx.chat || !ctx.from) return false;
  const urls = getUrls(text);
  const contracts = text.match(/0x[a-fA-F0-9]{40}/g) || [];
  const badUrls = urls.filter(u => !isAllowedUrl(u));
  const badContracts = contracts.filter(a => !OFFICIAL_CONTRACT_ADDRESSES.has(a.toLowerCase()));
  const securityHit = detectFakeVerificationBot(text) || detectAdminCompromise(text) || detectMintBait(text);
  const spoof = detectDomainImpersonation(text);
  if (!badUrls.length && !badContracts.length && !securityHit && !spoof) return false;
  try { await ctx.api.deleteMessage(ctx.chat.id, ctx.message!.message_id); } catch {}
  const who = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
  const reasons = [
    badUrls.length ? `unapproved link${badUrls.length > 1 ? "s" : ""}` : null,
    badContracts.length ? `unapproved contract address${badContracts.length > 1 ? "es" : ""}` : null,
    spoof ? "lookalike project domain" : null,
    securityHit || null,
  ].filter(Boolean).join(", ");
  await ctx.reply(`${who} — held that one. Trusted staff still have links and contracts checked.\n\nReason: ${reasons}.\nIf it is official, @aussieboomer or @TreeFitty can approve the source/configuration.`);
  return true;
}

function memberLabel(user: { username?: string; first_name?: string }): string {
  return user.username ? `@${user.username}` : (user.first_name || "friend");
}

function buildFirstWelcome(label: string, botName = "The Warden"): string {
  return `${label}, welcome through the Gateway. I'm ${botName} — part doorman, part record-keeper, part scammer's recurring administrative problem.\n\nBoomerverse is an Australian collectible universe built around wildlife, bush legend, relics and the Rift. Genesis is the first collection: 333 unique ERC-721 pieces on Base. The project is about original art, canon, community and long-term stewardship — not investment promises, and there is no ERC-20 token.\n\nStart here:\n• Read the pinned messages and official links.\n• Nobody from the project will DM you first.\n• Never trust a mint, contract or wallet link just because somebody sounds confident.\n• /info gives the project overview.\n• /safety gives the wallet-safety rules.\n• /radio opens Rift Radio — nine signals for when the chat needs a soundtrack.\n• /trivia and /puzzle are there when the serious people become unbearable.\n\nTag @${BOT_USERNAME} or reply to me and talk normally. Once you start a conversation with me, I'll keep talking with you until you wander off. Ask about the project, collection, lore, rules, wildlife, or what is happening in the community.`;
}

async function getConversationState(chatId: number | string, userId: number | string): Promise<ConversationState | null> {
  const state = await stateGet<ConversationState | null>(`w:conv:${chatId}:${userId}`, null);
  if (!state || state.activeUntil < Date.now()) return null;
  return state;
}

async function saveConversationTurn(chatId: number | string, userId: number | string, userText: string, assistantText: string): Promise<void> {
  const key = `w:conv:${chatId}:${userId}`;
  const current = await stateGet<ConversationState>(key, { activeUntil: 0, turns: [] });
  const turns = [...(current.turns || []), { role: "user" as const, content: userText }, { role: "assistant" as const, content: assistantText }].slice(-10);
  await stateSet(key, { activeUntil: Date.now() + CONVERSATION_TTL_SECONDS * 1000, turns }, CONVERSATION_TTL_SECONDS);
}

async function activateConversation(chatId: number | string, userId: number | string): Promise<ConversationState> {
  const key = `w:conv:${chatId}:${userId}`;
  const current = await stateGet<ConversationState>(key, { activeUntil: 0, turns: [] });
  const next = { activeUntil: Date.now() + CONVERSATION_TTL_SECONDS * 1000, turns: (current.turns || []).slice(-10) };
  await stateSet(key, next, CONVERSATION_TTL_SECONDS);
  return next;
}

// Check if user is chat owner/creator
async function isOwner(ctx: MyContext): Promise<boolean> {
  if (!ctx.chat || !ctx.from) return false;
  
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === "creator";
  } catch {
    return false;
  }
}

// isGlobalOwner — immutable numeric Telegram user ID only. Fails closed if unset.
function isGlobalOwner(ctx: MyContext): boolean {
  // Fail closed. If the owner ID isn't configured, NOBODY is the owner.
  //
  // Owner authority is intentionally numeric-ID only. Usernames are mutable and
  // are never accepted as proof of ownership.
  if (!GLOBAL_OWNER_USER_ID) {
    if (!warnedNoOwnerId) {
      warnedNoOwnerId = true;
      console.error(
        "[SECURITY] GLOBAL_OWNER_USER_ID is not set. All owner-only powers are " +
        "DISABLED until it is. Get your numeric ID from @userinfobot and set it."
      );
    }
    return false;
  }
  return ctx.from?.id?.toString() === GLOBAL_OWNER_USER_ID;
}
let warnedNoOwnerId = false;

// isBotAdmin — checks both Telegram admin status AND the per-community bot admin override list.
// The override list lets group owners grant bot admin rights to non-Telegram-admins.
async function isBotAdmin(ctx: MyContext, chatIdStr: string): Promise<boolean> {
  if (await isAdmin(ctx)) return true;
  const community = await getCommunity(chatIdStr);
  const userId = ctx.from?.id?.toString();
  return !!(userId && community?.botAdminIds?.includes(userId));
}

// Check if user is admin or creator
async function isAdmin(ctx: MyContext): Promise<boolean> {
  if (!ctx.chat || !ctx.from) return false;
  
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === "creator" || member.status === "administrator";
  } catch {
    return false;
  }
}

// === MODERATION SYSTEM ===
interface UserOffense {
  count: number;
  lastOffense: number;
  muteUntil: number;
}

// chatId -> (userId -> offense data)

// Mute durations: 15 min, 4 hours, 72 hours
const MUTE_DURATIONS = [
  15 * 60,           // 15 minutes in seconds (1st offense)
  4 * 60 * 60,       // 4 hours in seconds (2nd offense)
  72 * 60 * 60       // 72 hours in seconds (3rd offense)
  // 4th offense = permanent ban (handled in addOffense)
];

// Spam tracking
interface SpamTracker {
  messages: string[];
  timestamps: number[];
}

// Leaderboard tracking
interface UserActivity {
  userId: number;
  username: string;
  firstName: string;
  messageCount: number;
}
const leaderboardData: Map<number, Map<number, UserActivity>> = new Map(); // chatId -> (userId -> activity)

// Load existing member data from database on startup
async function loadLeaderboardFromDatabase() {
  try {
    const allMembers = await db.select().from(memberScores);
    console.log(`Loading ${allMembers.length} members from database...`);
    
    let loadedCount = 0;
    for (const member of allMembers) {
      // Use Number() for conversion - safe for typical Telegram IDs (< 10^15)
      const chatId = Number(member.chatId);
      const userId = Number(member.telegramUserId);
      
      // Skip if conversion failed (shouldn't happen with valid data)
      if (!Number.isFinite(chatId) || !Number.isFinite(userId)) {
        console.warn(`Skipping member with invalid ID: chatId=${member.chatId}, telegramUserId=${member.telegramUserId}`);
        continue;
      }
      
      if (!leaderboardData.has(chatId)) {
        leaderboardData.set(chatId, new Map());
      }
      const chatLeaderboard = leaderboardData.get(chatId)!;
      
      chatLeaderboard.set(userId, {
        userId,
        username: member.username || "",
        firstName: member.firstName || "",
        messageCount: member.messageCount || 0
      });
      loadedCount++;
    }
    
    console.log(`Loaded ${loadedCount} members across ${leaderboardData.size} chats`);
  } catch (error) {
    console.error("Error loading leaderboard from database:", error);
  }
}

// Get or create user offense record
async function getUserOffenses(chatId: number, userId: number): Promise<UserOffense> {
  return await stateGet<UserOffense>(KEYS.offense(chatId, userId), { count: 0, lastOffense: 0, muteUntil: 0 });
}

// Add offense and return mute duration (4th offense = ban)
async function addOffense(chatId: number, userId: number): Promise<{ muteSeconds: number; offenseCount: number; notifyAdmin: boolean; shouldBan: boolean }> {
  const offense = await getUserOffenses(chatId, userId);
  offense.count++;
  offense.lastOffense = Date.now();
  
  // 4th offense = permanent ban
  if (offense.count >= 4) {
    await stateSet(KEYS.offense(chatId, userId), offense, TTL.offense);
    return { muteSeconds: 0, offenseCount: offense.count, notifyAdmin: true, shouldBan: true };
  }
  
  // Get mute duration based on offense count (cap at max)
  const muteIndex = Math.min(offense.count - 1, MUTE_DURATIONS.length - 1);
  const muteSeconds = MUTE_DURATIONS[muteIndex];
  offense.muteUntil = Date.now() + (muteSeconds * 1000);
  
  // Notify admin after 2nd offense
  const notifyAdmin = offense.count >= 2;

  // Persist before returning — this is the counter that must survive a cold start.
  await stateSet(KEYS.offense(chatId, userId), offense, TTL.offense);

  return { muteSeconds, offenseCount: offense.count, notifyAdmin, shouldBan: false };
}

// Standardized warning message format for consistency
function formatWarning(options: {
  type: string;
  username: string;
  offenseCount: number;
  reason: string;
  action: string;
  nextStep?: string;
}): string {
  const header = `COMMUNITY WARNING #${options.offenseCount}`;
  const user = `User: ${options.username}`;
  const reason = `REASON: ${options.reason}`;
  const action = `ACTION: ${options.action}`;
  
  let message = `${header}\n\n${user}\n${reason}\n\n${action}`;
  
  // Add escalation warning
  if (options.offenseCount === 1) {
    message += `\n\nNext offense = 4 hour mute`;
  } else if (options.offenseCount === 2) {
    message += `\n\nNext offense = 72 hour mute`;
  } else if (options.offenseCount === 3) {
    message += `\n\nFINAL WARNING - Next offense = PERMANENT BAN`;
  }
  
  if (options.nextStep) {
    message += `\n\n${options.nextStep}`;
  }
  
  return message;
}

// Check if message is spam
async function isSpam(chatId: number, userId: number, message: string): Promise<boolean> {
  const key = KEYS.spam(chatId, userId);
  const tracker = await stateGet<SpamTracker>(key, { messages: [], timestamps: [] });

  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);

  // Drop anything older than the window
  while (tracker.timestamps.length > 0 && tracker.timestamps[0] < fiveMinutesAgo) {
    tracker.timestamps.shift();
    tracker.messages.shift();
  }

  tracker.messages.push(message.toLowerCase());
  tracker.timestamps.push(now);

  // Keep the stored blob small — we only ever look at recent history
  if (tracker.messages.length > 20) {
    tracker.messages = tracker.messages.slice(-20);
    tracker.timestamps = tracker.timestamps.slice(-20);
  }

  await stateSet(key, tracker, TTL.spam);

  // 1. More than 5 messages in 30 seconds
  const thirtySecondsAgo = now - 30000;
  if (tracker.timestamps.filter(t => t > thirtySecondsAgo).length > 5) return true;

  // 2. Same message three times running
  const lastThree = tracker.messages.slice(-3);
  if (lastThree.length === 3 && lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
    return true;
  }

  // 3. Multiple links in quick succession
  const linkPattern = /https?:\/\/|t\.me\/|discord\.gg/i;
  if (tracker.messages.slice(-3).filter(m => linkPattern.test(m)).length >= 2) return true;

  return false;
}

// Update leaderboard
async function updateLeaderboard(chatId: number, userId: number, username: string, firstName: string) {
  if (!leaderboardData.has(chatId)) {
    leaderboardData.set(chatId, new Map());
  }
  const chatLeaderboard = leaderboardData.get(chatId)!;
  
  if (!chatLeaderboard.has(userId)) {
    chatLeaderboard.set(userId, { userId, username, firstName, messageCount: 0 });
  }
  const user = chatLeaderboard.get(userId)!;
  user.messageCount++;
  user.username = username; // Update in case it changed
  user.firstName = firstName;
  
  // Also persist to database for long-term tracking
  try {
    const telegramUserId = userId.toString();
    const chatIdStr = chatId.toString();
    
    const existing = await db.select().from(memberScores)
      .where(and(eq(memberScores.telegramUserId, telegramUserId), eq(memberScores.chatId, chatIdStr)))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(memberScores)
        .set({ 
          messageCount: (existing[0].messageCount || 0) + 1,
          username, 
          firstName, 
          lastActive: new Date() 
        })
        .where(and(eq(memberScores.telegramUserId, telegramUserId), eq(memberScores.chatId, chatIdStr)));
    } else {
      await db.insert(memberScores).values({
        telegramUserId,
        chatId: chatIdStr,
        username,
        firstName,
        triviaPoints: 0,
        triviaCorrect: 0,
        triviaAttempts: 0,
        messageCount: 1,
      });
    }
  } catch (e) {
    // Silent fail for message tracking - don't interrupt chat
  }
}


// Format mute duration for display
function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

// Forward declaration - will be set when bot is created
let botInstance: Bot<MyContext> | null = null;

// Update admin activity when they send a message
async function updateAdminActivity(chatId: number, userId: number, username: string, firstName: string) {
  await stateSet(`w:adminact:${chatId}:${userId}`, { userId, username, firstName, lastActive: Date.now() }, 30 * 24 * 60 * 60);
  if (!adminActivity.has(chatId)) {
    adminActivity.set(chatId, new Map());
  }

  const chatAdmins = adminActivity.get(chatId)!;
  chatAdmins.set(userId, {
    oderId: userId,
    username,
    firstName,
    lastActive: Date.now()
  });
}

// Check and call out inactive admins (only once per 24 hours per admin)
async function checkInactiveAdmins(chatId: number) {
  if (!botInstance) return;
  
  try {
    // Get current admins from Telegram
    const admins = await botInstance.api.getChatAdministrators(chatId);
    const now = Date.now();
    const inactiveThreshold = ADMIN_INACTIVE_HOURS * 60 * 60 * 1000;
    
    const chatAdmins = adminActivity.get(chatId) || new Map();
    
    // Get or create alert tracking for this chat
    if (!adminLastAlerted.has(chatId)) {
      adminLastAlerted.set(chatId, new Map());
    }
    const chatAlerts = adminLastAlerted.get(chatId)!;
    
    const inactiveAdmins: string[] = [];
    
    for (const admin of admins) {
      // Skip bots
      if (admin.user.is_bot) continue;
      
      // Only remind the immutable global owner.
      if (!GLOBAL_OWNER_USER_ID || admin.user.id.toString() !== GLOBAL_OWNER_USER_ID) continue;
      
      const userId = admin.user.id;
      const activity = await stateGet<{ lastActive: number } | null>(`w:adminact:${chatId}:${userId}`, null)
        || chatAdmins.get(userId);
      const lastAlerted = await stateGet<number>(`w:adminalert:${chatId}:${userId}`, 0);
      
      // Check if admin is inactive (no activity or 24+ hours since last message)
      const isInactive = !activity || (now - activity.lastActive) > inactiveThreshold;
      
      // Check if we already alerted about this admin in the last 24 hours
      const alreadyAlerted = (now - lastAlerted) < inactiveThreshold;
      
      // Only alert if inactive AND we haven't alerted about them recently
      if (isInactive && !alreadyAlerted) {
        inactiveAdmins.push(admin.user.username ? `@${admin.user.username}` : admin.user.first_name);

        // Mark as alerted
        await stateSet(`w:adminalert:${chatId}:${userId}`, now, 7 * 24 * 60 * 60);
        chatAlerts.set(userId, now);
      }
    }
    
    if (inactiveAdmins.length > 0) {
      const message = `Hey ${inactiveAdmins.join(", ")} - haven't seen you in a while! The community misses you. Drop in when you can!`;
      await botInstance.api.sendMessage(chatId, message);
    }
  } catch (error) {
    console.error("Error checking admin activity:", error);
  }
}



// Auto-engage used to be a per-chat setTimeout. A serverless function can't
// hold one open, so instead we record when the chat last spoke and let the
// cron tick notice when it has gone quiet.
async function markChatActivity(chatId: number): Promise<void> {
  await stateSet(`w:lastmsg:${chatId}`, Date.now(), 7 * 24 * 60 * 60);
}

async function autoEngageIfQuiet(bot: Bot<MyContext>, chatId: number): Promise<boolean> {
  const feats = await getFeatureSettings(String(chatId));
  if (!feats.aiChat) return false;

  const lastMsg = await stateGet<number>(`w:lastmsg:${chatId}`, 0);
  if (!lastMsg) return false;

  const quietFor = Date.now() - lastMsg;
  if (quietFor < AUTO_ENGAGE_MINUTES * 60 * 1000) return false;

  // Don't nudge the same silence twice
  const lastNudge = await stateGet<number>(`w:lastnudge:${chatId}`, 0);
  if (lastNudge > lastMsg) return false;

  try {
    await bot.api.sendMessage(chatId, getRandomItem(AUTO_ENGAGE_MESSAGES));
    await stateSet(`w:lastnudge:${chatId}`, Date.now(), 7 * 24 * 60 * 60);
    return true;
  } catch {
    return false;
  }
}

// === BOT SETUP ===
export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(BOT_TOKEN!);
  botInstance = bot; // Set for auto-engage timer

  // Set command menu in Telegram
  bot.api.setMyCommands([
    { command: "start", description: "Welcome message" },
    { command: "info", description: "About Boomerverse" },
    { command: "ask", description: "Ask about the project" },
    { command: "fact", description: "Something worth knowing" },
    { command: "characters", description: "The locked Genesis pieces" },
    { command: "legal", description: "Legal disclaimers" },
    { command: "safety", description: "Scam and safety reminders" },
    { command: "radio", description: "Open Rift Radio" },
    { command: "report", description: "Report a message to the admins" },
    { command: "enter", description: "Enter the active giveaway" },
    { command: "entries", description: "Check giveaway entries" },
    { command: "trivia", description: "Start a trivia round" },
    { command: "answer", description: "Answer trivia (1-4)" },
    { command: "puzzle", description: "Start a word puzzle" },
    { command: "guess", description: "Guess the puzzle answer" },
    { command: "leaderboard", description: "Top members" },
    { command: "myscore", description: "Your score" },
    { command: "myprofile", description: "Your profile" },
    { command: "help", description: "What I can do" }
  ]).catch(err => console.error("Failed to set commands:", err));

  // Session middleware
  bot.use(session({
    initial: (): SessionData => ({ 
      wardenMode: false,
      userMemory: new Map(),
      lastActivityTime: Date.now()
    })
  }));

  // === SUBSCRIPTION GATE MIDDLEWARE ===
  // Every group gets a 7-day trial auto-created on first interaction.
  // Banned groups: completely silent. Free/expired: only whitelisted commands work.
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (!chatId || chatId >= 0) return next(); // DMs and private chats: always pass through
    const chatIdStr = chatId.toString();
    let community = await getCommunity(chatIdStr);

    // Auto-create trial for first-ever interaction so no group ever bypasses the gate
    if (!community) {
      const chatTitle = (ctx.chat as { title?: string })?.title;
      community = await ensureCommunity(chatIdStr, chatTitle);
    }

    // Banned communities: bot goes completely silent — no response whatsoever
    if (community.status === "banned") return;

    // Free/expired communities: basic safety moderation + free commands only
    if (!isSubscribed(community)) {
      // Global owner always gets through (for /activate, /makefree, etc.)
      if (isGlobalOwner(ctx)) return next();

      const text = (ctx.message?.text || "").trim();
      // Commands always available regardless of tier
      const FREE_COMMANDS = ["/help", "/start", "/info", "/ask", "/radio", "/setup", "/community", "/settings"];

      if (text.startsWith("/")) {
        const cmdBase = text.split(/[\s@]/)[0].toLowerCase();
        if (FREE_COMMANDS.some(fc => cmdBase === fc)) return next();
        // Show informative upgrade card instead of silently doing nothing
        const communityBotName = community.botNickname || "The Warden";
        await ctx.reply(buildUpgradePrompt(communityBotName));
        return;
      }
          // Non-command text: still run basic safety moderation (spam/scam/hate/links/files)
      // but skip personality, AI, and all premium behaviour — fall through to next()
      return next();
    }

    return next();
  });

  // === COMMAND HANDLERS ===

  // /start - Full project orientation, especially useful from the public bot page.
  bot.command("start", async (ctx) => {
    const label = ctx.from ? memberLabel(ctx.from) : "friend";
    await wardenReply(ctx, buildFirstWelcome(label, "The Warden"));
  });

  // /info - Project info
  bot.command("info", async (ctx) => {
    await ctx.reply(PROJECT_INFO);
  });

  // /radio - Rift Radio. Telegram only permits Web App inline buttons in private
  // chats; group buttons use the same HTTPS URL and still open cleanly in Telegram.
  bot.command("radio", async (ctx) => {
    if (!RIFT_RADIO_URL) {
      await ctx.reply("Rift Radio is fitted, but the station URL is not live yet. Once PUBLIC_URL is set on the deployment, I'll put it on the dial.");
      return;
    }

    const button = ctx.chat?.type === "private"
      ? { text: "OPEN RIFT RADIO", web_app: { url: RIFT_RADIO_URL } }
      : { text: "OPEN RIFT RADIO", url: RIFT_RADIO_URL };

    await ctx.reply(
      "RIFT RADIO — NINE SIGNALS\n\nAmbient, deep space, old-time radio, Australian music, documentary and birdsong. Pick a frequency and leave it running. I won't judge the choice. Much.",
      { reply_markup: { inline_keyboard: [[button]] } }
    );
  });

  // /fact - Random medical fact
  bot.command("fact", async (ctx) => {
    const fact = getRandomItem(FACTS);
    const response = ctx.session.wardenMode ? wardenResponse(fact) : fact;
    await ctx.reply(response);
  });

  // /legal - Legal disclaimers
  bot.command("legal", async (ctx) => {
    const legalText = `KEY LEGAL POINTS:

${LEGAL_POINTS.map((p, i) => `${i + 1}. ${p}`).join("\n")}

These are collectibles and original art. Nothing here is an investment.`;
    await ctx.reply(legalText);
  });

  // /characters - Character list
  bot.command("characters", async (ctx) => {
    const charText = `HARD-LOCKED GENESIS PIECES

${CHARACTERS.map(c => `${c.name}\n${c.desc}`).join("\n\n")}

Everything else in the 333 is provisional. I won't describe a piece before it's locked — that would make canon by accident.`;
    await ctx.reply(charText);
  });

  // /warden - Toggle The Warden mode
  bot.command("warden", async (ctx) => {
    ctx.session.wardenMode = !ctx.session.wardenMode;
    if (ctx.session.wardenMode) {
      await ctx.reply("You have my full attention now.");
    } else {
      await ctx.reply("Back to the usual.");
    }
  });

  // === COMMUNITY PROFILE COMMANDS ===
  
  // /setbirthday - Set your birthday (MM-DD format)
  bot.command("setbirthday", async (ctx) => {
    if (!ctx.from) return;
    
    const birthday = ctx.message?.text?.replace("/setbirthday", "").trim();
    if (!birthday) {
      await ctx.reply("Usage: /setbirthday MM-DD\n\nExample: /setbirthday 04-20\n\nI'll remember and celebrate your birthday!");
      return;
    }
    
    // Validate format MM-DD
    const parts = birthday.split("-");
    if (parts.length !== 2) {
      await ctx.reply("Please use MM-DD format.\n\nExample: /setbirthday 04-20");
      return;
    }
    
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    
    if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      await ctx.reply("Invalid date! Use MM-DD format with valid month (01-12) and day (01-31).\n\nExample: /setbirthday 04-20");
      return;
    }
    
    const formattedBirthday = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    const telegramUserId = ctx.from.id.toString();
    const chatId = ctx.chat?.id?.toString() || "";
    
    try {
      const existing = await db.select().from(communityProfiles).where(eq(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      
      if (existing.length > 0) {
        await db.update(communityProfiles)
          .set({ birthday: formattedBirthday, chatId, username: ctx.from.username || "", firstName: ctx.from.first_name || "" })
          .where(eq(communityProfiles.telegramUserId, telegramUserId));
      } else {
        await db.insert(communityProfiles).values({
          telegramUserId,
          chatId,
          username: ctx.from.username || "",
          firstName: ctx.from.first_name || "",
          birthday: formattedBirthday
        });
      }
      
      await ctx.reply(`Birthday saved! I'll celebrate you on ${formattedBirthday}!`);
    } catch (error) {
      console.error("Error saving birthday:", error);
      await ctx.reply("Couldn't save your birthday right now. Try again later!");
    }
  });

  // /setlocation - Set where you're from
  bot.command("setlocation", async (ctx) => {
    if (!ctx.from) return;
    
    const location = ctx.message?.text?.replace("/setlocation", "").trim();
    if (!location) {
      await ctx.reply("Usage: /setlocation [your location]\n\nExample: /setlocation California, USA\n\nI'll remember where you're from!");
      return;
    }
    
    const telegramUserId = ctx.from.id.toString();
    const chatId = ctx.chat?.id?.toString() || "";
    
    try {
      const existing = await db.select().from(communityProfiles).where(eq(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      
      if (existing.length > 0) {
        await db.update(communityProfiles)
          .set({ location, chatId, username: ctx.from.username || "", firstName: ctx.from.first_name || "" })
          .where(eq(communityProfiles.telegramUserId, telegramUserId));
      } else {
        await db.insert(communityProfiles).values({
          telegramUserId,
          chatId,
          username: ctx.from.username || "",
          firstName: ctx.from.first_name || "",
          location
        });
      }
      
      await ctx.reply(`Location saved! I'll remember you're from ${location}!`);
    } catch (error) {
      console.error("Error saving location:", error);
      await ctx.reply("Couldn't save your location right now. Try again later!");
    }
  });

  // /setlikes - Set what you like
  bot.command("setlikes", async (ctx) => {
    if (!ctx.from) return;
    
    const likes = ctx.message?.text?.replace("/setlikes", "").trim();
    if (!likes) {
      await ctx.reply("Usage: /setlikes [things you like]\n\nExample: /setlikes bushwalking, gaming, cooking\n\nI'll remember what you're into!");
      return;
    }
    
    const telegramUserId = ctx.from.id.toString();
    const chatId = ctx.chat?.id?.toString() || "";
    
    try {
      const existing = await db.select().from(communityProfiles).where(eq(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      
      if (existing.length > 0) {
        await db.update(communityProfiles)
          .set({ likes, chatId, username: ctx.from.username || "", firstName: ctx.from.first_name || "" })
          .where(eq(communityProfiles.telegramUserId, telegramUserId));
      } else {
        await db.insert(communityProfiles).values({
          telegramUserId,
          chatId,
          username: ctx.from.username || "",
          firstName: ctx.from.first_name || "",
          likes
        });
      }
      
      await ctx.reply(`Got it! I'll remember you're into: ${likes}`);
    } catch (error) {
      console.error("Error saving likes:", error);
      await ctx.reply("Couldn't save that right now. Try again later!");
    }
  });

  // /myprofile - View your community profile
  bot.command("myprofile", async (ctx) => {
    if (!ctx.from) return;
    
    const telegramUserId = ctx.from.id.toString();
    
    try {
      const profile = await db.select().from(communityProfiles).where(eq(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      
      if (profile.length === 0) {
        await ctx.reply("You don't have a profile yet!\n\nSet one up with:\n/setbirthday MM-DD\n/setlocation [where you're from]\n/setlikes [what you like]");
        return;
      }
      
      const p = profile[0];
      const name = p.username ? `@${p.username}` : p.firstName || "Community Member";
      
      let profileText = `COMMUNITY PROFILE\n\nName: ${name}`;
      if (p.location) profileText += `\nFrom: ${p.location}`;
      if (p.likes) profileText += `\nLikes: ${p.likes}`;
      if (p.birthday) profileText += `\nBirthday: ${p.birthday}`;
      
      profileText += "\n\nUpdate anytime with /setbirthday, /setlocation, /setlikes";
      
      await ctx.reply(profileText);
    } catch (error) {
      console.error("Error fetching profile:", error);
      await ctx.reply("Couldn't load your profile right now. Try again later!");
    }
  });

  // /report — one-tap escalation for anything the bot cannot judge.
  //
  // The Warden cannot see inside an image. For illegal content — and CSAM above
  // all — the right answer is a fast path to a human and to the platform, not a
  // machine guess. This removes the message immediately, alerts every admin,
  // and tells the reporter exactly where to send it beyond this group.
  bot.command("report", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Use /report in the group, replying to the message.");
      return;
    }

    const target = ctx.message?.reply_to_message;
    if (!target) {
      await ctx.reply("Reply to the message you're reporting, then send /report.");
      return;
    }

    const chatIdStr = ctx.chat.id.toString();
    const offender = target.from;

    // Remove first, ask questions after. If it turns out to be fine, an admin
    // can say so. If it isn't, every second it stays up matters.
    let removed = false;
    try {
      await ctx.api.deleteMessage(ctx.chat.id, target.message_id);
      removed = true;
    } catch { /* no permission or too old */ }

    // Restrict the poster pending review — not a ban, just a pause.
    if (offender && !offender.is_bot) {
      try {
        await muteUser(ctx, offender.id, 24 * 60 * 60, "Reported content — pending admin review",
          offender.username || offender.first_name);
      } catch { /* no permission */ }
    }

    try {
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      const mentions = admins.filter(a => !a.user.is_bot && a.user.username)
        .slice(0, 5).map(a => `@${a.user.username}`).join(" ");

      await ctx.reply(
        `REPORTED ${mentions}\n\n` +
        `Reported by: ${ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name}\n` +
        `Poster: ${offender ? (offender.username ? "@" + offender.username : offender.first_name) : "unknown"}\n` +
        `Message: ${removed ? "removed" : "COULD NOT BE REMOVED — delete it manually"}\n` +
        `Poster: muted for 24h pending review\n\n` +
        `Admins: if this is illegal content, do not forward it to anyone. Report the ` +
        `account to Telegram (long-press → Report) and, if it involves a child, to ` +
        `your national reporting body. In Australia that is the eSafety Commissioner ` +
        `at esafety.gov.au/report.\n\n` +
        `If it was reported in error, /restore clears the mute.`
      );

      await logViolation(chatIdStr, offender ? String(offender.id) : "unknown",
        offender?.username || "", "user_report",
        "", `Reported by ${ctx.from.id}`, removed ? "delete+mute" : "mute-only");
      await incrementModStat(chatIdStr, 'flaggedForReview');
    } catch { /* couldn't post */ }
  });

  // /safety - Safety reminders
  bot.command("safety", async (ctx) => {
    const safetyText = `HOW NOT TO GET ROBBED

Read this once. It is short and it covers nearly everything.

1. Nobody from this project will DM you first. Not me, not an admin, not the founder. If someone messages you claiming to be staff, they are lying.

2. Never paste a command into your computer. No real verification asks you to open PowerShell, the Run box, or a terminal. That installs software that reads your wallet keys.

3. Never type your seed phrase anywhere. Not for support, not to verify, not to restore. There is no situation where it is needed.

4. Check the address, character by character. Fake sites sit on domains one letter away from the real one. The only official addresses:
   ${OFFICIAL_WEBSITE_URL || "Website URL not configured yet"}
   ${OFFICIAL_TELEGRAM_URL || BOT_PUBLIC_URL}
   Type them yourself. Don't click.

5. Read what you're signing. "Approve" and "sign to verify" can hand over your whole wallet. Revoke old approvals at revoke.cash.

6. Urgency is the attack. "Last spots", "claim before it closes", "your NFT is at risk" — all of it exists to stop you thinking.

7. A bot with a plausible name proves nothing. Telegram has no verified badge for bots — anyone can name one anything. Only @aussieboomer or @TreeFitty can add a bot to this group. Any other bot that appears here gets removed automatically, and if you see one, say so.

If you think you've already been caught: move everything to a fresh wallet from a different device, then tell an admin. Speed matters more than embarrassment.`;
    await ctx.reply(safetyText);
  });

  // === GIVEAWAY COMMANDS (Owner Only) ===
  
  // /giveaway - Start a new giveaway (OWNER ONLY)
  bot.command("giveaway", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _givFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_givFeats.giveaways) {
      await ctx.reply("Giveaways are currently disabled in this chat. An admin can enable them with /toggle giveaways");
      return;
    }
    const ownerCheck = await isOwner(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only the group owner can start giveaways!");
      return;
    }
    
    const prize = ctx.message?.text?.replace("/giveaway", "").trim();
    if (!prize) {
      await ctx.reply("Usage: /giveaway [prize description]\n\nExample: /giveaway 1 Whitelist Spot + Exclusive NFT");
      return;
    }
    
    // Check if there's already an active giveaway
    const _existingGiveaway = await getGiveaway(ctx.chat.id);
    if (_existingGiveaway?.active) {
      await ctx.reply("There's already an active giveaway! Use /endgiveaway to end it first, or /pickwinner to pick a winner.");
      return;
    }
    
    // Create new giveaway
    const giveaway: Giveaway = {
      chatId: ctx.chat.id,
      prize,
      entries: [],
      createdBy: ctx.from.id,
      createdAt: Date.now(),
      active: true
    };
    
    await saveGiveaway(ctx.chat.id, giveaway);
    
    await ctx.reply(`GIVEAWAY TIME!\n\nPrize: ${prize}\n\nTo enter, type /enter\n\nGood luck everyone!`);
  });

  // /enter - Enter the active giveaway
  bot.command("enter", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _enterFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_enterFeats.giveaways) return;
    
    const giveaway = await getGiveaway(ctx.chat.id);
    if (!giveaway || !giveaway.active) {
      await ctx.reply("No active giveaway right now! Stay tuned for the next one.");
      return;
    }
    
    // Check if already entered
    if (giveaway.entries.some(e => e.userId === ctx.from!.id)) {
      await ctx.reply(`${ctx.from.first_name}, you're already in! Good luck!`);
      return;
    }
    
    // Add entry
    giveaway.entries.push({
      userId: ctx.from.id,
      username: ctx.from.username || "",
      firstName: ctx.from.first_name || "Anonymous"
    });
    await saveGiveaway(ctx.chat.id, giveaway);

    await ctx.reply(`${ctx.from.first_name} is in. Entries: ${giveaway.entries.length}`);
  });

  // /entries - Check how many entries (anyone can use)
  bot.command("entries", async (ctx) => {
    if (!ctx.chat) return;
    const _entriesFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_entriesFeats.giveaways) return;
    
    const giveaway = await getGiveaway(ctx.chat.id);
    if (!giveaway || !giveaway.active) {
      await ctx.reply("No active giveaway right now!");
      return;
    }
    
    await ctx.reply(`Current giveaway: ${giveaway.prize}\n\nTotal entries: ${giveaway.entries.length}\n\nUse /enter to join!`);
  });

  // /pickwinner - Randomly pick a winner (OWNER ONLY)
  bot.command("pickwinner", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _pwFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_pwFeats.giveaways) return;
    
    const ownerCheck = await isOwner(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only the group owner can pick winners!");
      return;
    }
    
    const giveaway = await getGiveaway(ctx.chat.id);
    if (!giveaway || !giveaway.active) {
      await ctx.reply("No active giveaway to pick a winner from!");
      return;
    }
    
    if (giveaway.entries.length === 0) {
      await ctx.reply("No entries yet! Can't pick a winner from an empty pool.");
      return;
    }
    
    // Random selection
    const randomIndex = Math.floor(Math.random() * giveaway.entries.length);
    const winnerInfo = giveaway.entries[randomIndex];

    // End the giveaway
    giveaway.active = false;
    await saveGiveaway(ctx.chat.id, giveaway);
    
    const winnerMention = winnerInfo.username 
      ? `@${winnerInfo.username}` 
      : winnerInfo.firstName;
    
    await ctx.reply(`WINNER ANNOUNCEMENT!\n\nCongratulations ${winnerMention}!\n\nYou won: ${giveaway.prize}\n\nTotal entries: ${giveaway.entries.length}\n\nThanks everyone for participating!`);
  });

  // /endgiveaway - End giveaway without picking winner (OWNER ONLY)
  bot.command("endgiveaway", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _egFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_egFeats.giveaways) return;
    
    const ownerCheck = await isOwner(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only the group owner can end giveaways!");
      return;
    }
    
    const giveaway = await getGiveaway(ctx.chat.id);
    if (!giveaway || !giveaway.active) {
      await ctx.reply("No active giveaway to end!");
      return;
    }
    
    giveaway.active = false;
    await saveGiveaway(ctx.chat.id, giveaway);
    await ctx.reply(`Giveaway ended.\n\nPrize: ${giveaway.prize}\nTotal entries: ${giveaway.entries.length}\n\nNo winner was picked.`);
  });

  // === BOT LEARNING STATS COMMAND ===
  bot.command("stats", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const stats = await BotMemory.getStats();
    
    const learningProgress = stats.learnedPatterns > 0 
      ? Math.min(100, Math.round((stats.learnedPatterns / 50) * 100))
      : 0;
    
    const progressBar = "█".repeat(Math.floor(learningProgress / 10)) + 
                       "░".repeat(10 - Math.floor(learningProgress / 10));
    
    const approvalRate = stats.positiveRatings + stats.negativeRatings > 0
      ? Math.round((stats.positiveRatings / (stats.positiveRatings + stats.negativeRatings)) * 100)
      : 0;
    
    await ctx.reply(`*The Warden's Learning Stats*

*Memory Status:*
- Total Interactions: ${stats.totalInteractions.toLocaleString()}
- Learned Patterns: ${stats.learnedPatterns}
- Learning Progress: [${progressBar}] ${learningProgress}%

*Feedback Received:*
- Positive Ratings: ${stats.positiveRatings}
- Negative Ratings: ${stats.negativeRatings}
- Approval Rate: ${approvalRate}%

_I learn from what works. Use the +1/-1 buttons and I'll get better at this._`, 
      { parse_mode: "Markdown" }
    );
  });

  // === FEATURE SETTINGS COMMANDS ===

  // /settings - Show all feature toggles with ON/OFF status (admin only)
  // Works on all tiers — free/expired groups see what's locked vs included
  bot.command("settings", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Settings are managed per group chat. Add me to a group and use /settings there!");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    const adminCheck = await isBotAdmin(ctx, chatIdStr);
    if (!adminCheck) {
      await ctx.reply("Only admins can view or change settings!");
      return;
    }
    const community = await getCommunity(chatIdStr);
    const subscribed = community ? isSubscribed(community) : false;
    const feats = await getFeatureSettings(chatIdStr);

    const sections: string[] = [];
    for (const group of FEATURE_GROUPS) {
      const groupLines = group.keys.map(key => {
        const isFreeFeature = FREE_FEATURE_KEYS.has(key);
        if (subscribed) {
          const on = feats[key];
          return `  ${on ? "✅" : "❌"} ${FEATURE_LABELS[key]} (${key})`;
        } else {
          if (isFreeFeature) {
            const on = feats[key];
            return `  ${on ? "✅" : "❌"} ${FEATURE_LABELS[key]} (${key})`;
          } else {
            return `  🔒 ${FEATURE_LABELS[key]} (${key})`;
          }
        }
      });
      sections.push(`━━ ${group.label} ━━\n${groupLines.join("\n")}`);
    }

    const statusLine = community ? `Status: ${getStatusLabel(community)}\n` : "";
    const enabledCount = (Object.keys(feats) as (keyof FeatureSettings)[]).filter(k => feats[k]).length;
    const footer = subscribed
      ? `\nEnabled: ${enabledCount}/21 features\n\nTo toggle: /toggle [name]  e.g. /toggle spam\nFor help: /adminhelp`
      : `\n🔒 = Paid features locked on FREE TIER.\nContact ${OWNER_CONTACT} to upgrade.`;

    const body = `THE WARDEN — FEATURE SETTINGS\n${statusLine}\n${sections.join("\n\n")}${footer}`;

    // Split into chunks if over Telegram's 4096 char limit
    if (body.length <= 4096) {
      await ctx.reply(body);
    } else {
      const parts = sections.map(s => `THE WARDEN — FEATURE SETTINGS\n\n${s}`);
      parts[0] = `THE WARDEN — FEATURE SETTINGS\n${statusLine}\n${parts[0]}`;
      parts[parts.length - 1] += footer;
      for (const part of parts) await ctx.reply(part);
    }
  });

  // /toggle [feature] - Flip a feature on or off (admin only)
  bot.command("toggle", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Feature toggles only work in group chats!");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    const adminCheck = await isBotAdmin(ctx, chatIdStr);
    if (!adminCheck) {
      await ctx.reply("Only admins can toggle features!");
      return;
    }
    // Use ctx.match which grammY populates with the text after the command,
    // already stripping /toggle and any @BotName suffix — handles all group command forms.
    const featureName = (ctx.match || "").trim().toLowerCase() as keyof FeatureSettings | undefined;
    if (!featureName || !(featureName in FEATURE_LABELS)) {
      const validKeys = Object.keys(FEATURE_LABELS).join(", ");
      await ctx.reply(`Please specify a valid feature name.\n\nValid options:\n${validKeys}\n\nExample: /toggle spam`);
      return;
    }
    const feats = await getFeatureSettings(chatIdStr);
    const newValue = !feats[featureName];
    await updateFeatureSetting(chatIdStr, featureName, newValue);
    const statusText = newValue ? "✅ ENABLED" : "❌ DISABLED";
    await ctx.reply(`${FEATURE_LABELS[featureName]} is now ${statusText}\n\nUse /settings to see all toggles.`);
  });

  // /help — User-facing command list
  bot.command("help", async (ctx) => {
    const botName = ctx.chat?.type !== "private"
      ? ((await getCommunity(ctx.chat!.id.toString()))?.botNickname || "The Warden")
      : "The Warden";
    await ctx.reply(
      `${botName.toUpperCase()} — COMMANDS\n\n` +
      `━━ FOR EVERYONE ━━\n` +
      `/ask [question] — Ask me anything about the collection\n` +
      `/info — Project info\n` +
      `/fact — Something worth knowing\n` +
      `/characters — The locked Genesis pieces\n` +
      `/safety — How not to get robbed\n` +
      `/radio — Open Rift Radio\n` +
      `/legal — Legal disclaimers\n\n` +
      `━━ YOUR PROFILE ━━\n` +
      `/myprofile — Your community profile\n` +
      `/setbirthday [MM-DD] — Set your birthday\n` +
      `/trustinfo — Your trust score\n` +
      `/trustcheck @user — Check effective trust\n` +
      `/myscore — Your trivia score\n\n` +
      `━━ GAMES ━━\n` +
      `/trivia — Start a trivia round (add a number for more questions)\n` +
      `/answer 1-4 — Answer the current question\n` +
      `/puzzle — Word puzzle (/puzzle hard for the harder list)\n` +
      `/guess — Guess the puzzle answer\n\n` +
      `━━ LEADERBOARDS ━━\n` +
      `/leaderboard — Community leaderboard\n` +
      `/puzzleboard — Puzzle scores\n` +
      `/trustboard — Trust leaderboard\n\n` +
      `━━ ADMINS ONLY ━━\n` +
      `/adminhelp — Full admin reference\n` +
      `/settings — Feature toggles\n` +
      `/status — Live community snapshot`
    );
  });

  // /status — Live community snapshot for admins
  bot.command("status", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") { await ctx.reply("Run /status in your group chat!"); return; }
    const chatIdStr = ctx.chat.id.toString();
    if (!(await isBotAdmin(ctx, chatIdStr))) { await ctx.reply("Admins only."); return; }

    const community = await getCommunity(chatIdStr);
    if (!community) {
      await ctx.reply("This group hasn't been set up yet. Run /setup to get started.");
      return;
    }
    const feats = await getFeatureSettings(chatIdStr);
    const subscribed = isSubscribed(community);

    // Count features enabled per group
    const groupSummaries = FEATURE_GROUPS.map(g => {
      const total = g.keys.length;
      const enabled = g.keys.filter(k => feats[k]).length;
      return `${g.label}: ${enabled}/${total}`;
    });

    const totalEnabled = (Object.keys(feats) as (keyof FeatureSettings)[]).filter(k => feats[k]).length;

    const adminList = community.botAdminIds.length > 0
      ? `Custom bot admins: ${community.botAdminIds.length} user(s)`
      : `Bot admins: All Telegram admins (no custom list set)`;

    await ctx.reply(
      `COMMUNITY STATUS — ${community.displayName}\n\n` +
      `Bot Nickname: ${community.botNickname}\n` +
      `Timezone: ${community.timezone}\n` +
      `Subscription: ${getStatusLabel(community)}\n\n` +
      `━━ FEATURES (${totalEnabled}/21 enabled) ━━\n` +
      groupSummaries.join("\n") + `\n\n` +
      `━━ ADMIN ACCESS ━━\n` +
      `${adminList}\n\n` +
      `━━ QUICK ACTIONS ━━\n` +
      `/settings — View & toggle all features\n` +
      `/adminhelp — Full admin command reference\n` +
      `/toggle [name] — Flip a single feature`
    );
  });

  // /adminhelp — Full admin reference card. Any bot admin can access this.
  bot.command("adminhelp", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") { await ctx.reply("Run /adminhelp in your group chat!"); return; }
    const chatIdStr = ctx.chat.id.toString();
    if (!(await isBotAdmin(ctx, chatIdStr))) { await ctx.reply("Admins only."); return; }

    const pages = [
      // Page 1 — Setup & Subscription
      `THE WARDEN — ADMIN REFERENCE (1/4)\n\n` +
      `━━ SETUP & COMMUNITY ━━\n` +
      `/setup — Onboarding wizard (7-day trial starts here)\n` +
      `/community — View current config & subscription status\n` +
      `/status — Live snapshot of all features & subscription\n` +
      `/setname [name] — Update community display name\n` +
      `/setnickname [name] — Change the bot's name in this group\n` +
      `/setwelcome [msg] — Set a custom welcome message ({name} = member name)\n` +
      `/settimezone [zone] — Set timezone (e.g. Australia/Sydney)\n\n` +
      `━━ SUBSCRIPTION TIERS ━━\n` +
      `TRIAL — Full access for 7 days (auto-starts on /setup)\n` +
      `ACTIVE — Paid, full access\n` +
      `COMPLIMENTARY — Gifted full access (no payment)\n` +
      `FREE — Basic safety moderation only\n` +
      `BANNED — Bot completely silent\n\n` +
      `Contact ${OWNER_CONTACT} to change tier.`,

      // Page 2 — Feature Toggles
      `THE WARDEN — ADMIN REFERENCE (2/4)\n\n` +
      `━━ FEATURE TOGGLES ━━\n` +
      `/settings — View all 21 features grouped by category\n` +
      `/toggle [name] — Flip any feature on or off\n\n` +
      `GROUP 1: SAFETY FILTERS (always free)\n` +
      `  spam · scam · hate · links · files · newuser\n\n` +
      `GROUP 2: SECURITY GATES\n` +
      `  captcha · accountAge · bioScan · massMention\n` +
      `  edits · impersonation · raid\n\n` +
      `GROUP 3: AI & PERSONALITY\n` +
      `  aiChat · personality · learning · stories\n\n` +
      `GROUP 4: COMMUNITY FEATURES\n` +
      `  trust · games · giveaways · scheduled\n\n` +
      `Example: /toggle aiChat  or  /toggle spam`,

      // Page 3 — Moderation commands
      `THE WARDEN — ADMIN REFERENCE (3/4)\n\n` +
      `━━ MODERATION ━━\n` +
      `/ban — Reply to a message to ban that user\n` +
      `/kick — Reply to a message to kick that user\n` +
      `/mute — Reply to mute (or: /mute @user [minutes])\n` +
      `/unmute — Reply to unmute a user\n` +
      `/warn — Reply to issue a formal warning\n` +
      `/violations — View security violation log\n` +
      `/modstats — Moderation statistics\n\n` +
      `━━ ANTI-RAID ━━\n` +
      `/lockdown — Manually activate raid lockdown\n` +
      `/unlock — End lockdown early\n` +
      `/raidstatus — Current lockdown status\n\n` +
      `━━ TRUST SYSTEM ━━\n` +
      `/trustset @user full|trusted|normal|restricted — Set community trust (Boss/TreeFitty only)\n` +
      `/trustcheck @user — Check effective trust\n` +
      `/trust — Reply to manually raise trust level\n` +
      `/untrust — Reply to lower trust level\n` +
      `/trustinfo — View trust details for any user\n` +
      `/trustpoints — Trust score leaderboard\n` +
      `/trustfreeze — Freeze a user's trust score\n` +
      `/trustunfreeze — Unfreeze a user's trust score\n` +
      `/trustbulk — Bulk-adjust trust for multiple users\n` +
      `/trustboard — Full trust leaderboard`,

      // Page 4 — Admin access & giveaways
      `THE WARDEN — ADMIN REFERENCE (4/4)\n\n` +
      `━━ BOT ADMIN LIST ━━\n` +
      `By default: all Telegram admins + group owner have access.\n` +
      `Custom list (overrides Telegram admins):\n` +
      `/addadmin — Reply to a message to add someone\n` +
      `/removeadmin — Reply to a message to remove someone\n` +
      `/changeadmin — Reply to replace entire list with one person\n` +
      `/listadmins — See the current bot admin list\n\n` +
      `━━ GIVEAWAYS ━━\n` +
      `/giveaway [prize] — Start a giveaway\n` +
      `/entries — List current entries\n` +
      `/pickwinner — Pick a random winner\n` +
      `/endgiveaway — End without picking a winner\n\n` +
      `━━ POLLS & CONTENT ━━\n` +
      `/poll [question] — Create a quick poll\n` +
      `/setrole @user [role] — Assign a community role\n\n` +
      `━━ SCHEDULED POSTS ━━\n` +
      `Automated: quote of the day (10am), birthdays (9am), winner announcements (8pm)\n` +
      `Toggle with: /toggle scheduled\n\n` +
      `For all owner-only remote commands: DM the bot and type /ownerhelp`,
    ];

    for (const page of pages) {
      await ctx.reply(page);
    }
  });

  // === RAID LOCKDOWN COMMANDS ===
  
  // /unlock - Admin command to end raid lockdown early
  bot.command("unlock", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const chatId = ctx.chat.id;
    const chatIdStr = chatId.toString();
    
    // Check if user is admin
    try {
      const member = await ctx.api.getChatMember(chatId, ctx.from.id);
      const isAdmin = member.status === "administrator" || member.status === "creator";
      
      if (!isAdmin) {
        await ctx.reply("Only admins can end lockdown mode.");
        return;
      }
      
      if (await isInLockdown(chatIdStr)) {
        await endLockdown(chatIdStr);
        await ctx.reply(
          `Lockdown Mode Ended\n\n` +
          `Chat has been unlocked by @${ctx.from.username || ctx.from.first_name}.\n` +
          `Normal operations resumed.`
        );
      } else {
        await ctx.reply("Chat is not currently in lockdown mode.");
      }
    } catch (e) {
      console.log("Error checking admin status:", e);
      await ctx.reply("Couldn't verify admin status. Try again!");
    }
  });
  
  // /lockdown - Admin command to manually trigger lockdown
  bot.command("lockdown", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const chatId = ctx.chat.id;
    const chatIdStr = chatId.toString();
    
    // Check if user is admin
    try {
      const member = await ctx.api.getChatMember(chatId, ctx.from.id);
      const isAdmin = member.status === "administrator" || member.status === "creator";
      
      if (!isAdmin) {
        await ctx.reply("Only admins can trigger lockdown mode.");
        return;
      }
      
      if (await isInLockdown(chatIdStr)) {
        await ctx.reply("Chat is already in lockdown mode. Use /unlock to end it.");
      } else {
        await stateSet(KEYS.lockdown(chatIdStr), { active: true, until: Date.now() + LOCKDOWN_DURATION }, TTL.lockdown);
        await ctx.reply(
          `LOCKDOWN MODE ACTIVATED\n\n` +
          `Triggered manually by @${ctx.from.username || ctx.from.first_name}.\n\n` +
          `New users will be restricted for 5 minutes.\n` +
          `Use /unlock to end early.`
        );
      }
    } catch (e) {
      console.log("Error triggering lockdown:", e);
      await ctx.reply("Couldn't activate lockdown. Try again!");
    }
  });
  
  // /raidstatus - Check current raid detection status
  bot.command("raidstatus", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const chatIdStr = ctx.chat.id.toString();
    const joins = await stateGet<JoinEvent[]>(KEYS.joins(chatIdStr), []);
    const now = Date.now();
    const recentCount = joins.filter(j => now - j.timestamp < RAID_WINDOW).length;
    const inLockdown = await isInLockdown(chatIdStr);
    const lockInfo = await stateGet<{ active: boolean; until: number } | null>(KEYS.lockdown(chatIdStr), null);
    
    let status = `*Raid Detection Status*\n\n`;
    status += `Recent joins (last 2 min): ${recentCount}\n`;
    status += `Raid threshold: ${RAID_THRESHOLD}\n`;
    status += `Lockdown: ${inLockdown ? 'ACTIVE' : 'Off'}\n`;
    
    if (inLockdown && lockInfo) {
      const remainingMs = lockInfo.until - now;
      const remainingMin = Math.max(0, Math.ceil(remainingMs / 60000));
      status += `Lockdown ends in: ${remainingMin} min\n`;
    }
    
    await ctx.reply(status, { parse_mode: "Markdown" });
  });

  // === TRUST SYSTEM COMMANDS ===
  
  // /trustinfo - Check your own trust status
  bot.command("trustinfo", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _trustFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_trustFeats.trust) {
      await ctx.reply("The trust system is currently disabled in this chat. An admin can enable it with /toggle trust");
      return;
    }
    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from.id);
    
    const record = await ensureTrustRecord(userId, chatId, ctx.from.username, ctx.from.first_name);
    if (!record) {
      await ctx.reply("Couldn't load your trust info. Try again later!");
      return;
    }
    
    const progressBar = generateTrustProgressBar(record.trustScore || 0);
    const levelNames = ["New Member", "Trusted", "Established", "OG"];
    const levelName = levelNames[record.trustLevel || 0];
    
    const eligible = isEligibleForTrust(record);
    let eligibilityText = "";
    if (!eligible && record.eligibilityDate) {
      const daysRemaining = Math.ceil((new Date(record.eligibilityDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      eligibilityText = `\nEligibility: ${daysRemaining} days remaining`;
    } else if (eligible) {
      eligibilityText = "\nEligibility: Active";
    }
    
    const statusText = record.trustStatus === "vouched" ? " (Vouched)" : record.trustStatus === "earned" ? " (Earned)" : "";
    const frozenText = record.isFrozen ? "\n\nSTATUS: FROZEN" : "";
    
    await ctx.reply(`TRUST STATUS for ${ctx.from.first_name}

Score: ${record.trustScore || 0}/100 ${progressBar}
Level: ${record.trustLevel || 0} - ${levelName}${statusText}${eligibilityText}

Today's Progress: ${record.trustGainedToday || 0}/${TRUST_DAILY_CAP} pts
Weekly Progress: ${record.trustGainedThisWeek || 0}/${TRUST_WEEKLY_CAP} pts
Meaningful Messages: ${record.meaningfulMsgCount || 0}
Unique Interactions: ${record.uniqueRepliedTo || 0}${frozenText}

Use /trustpoints to learn how to earn more!`);
  });
  
  // /trustpoints - The Warden explains the trust system
  bot.command("trustpoints", async (ctx) => {
    if (ctx.chat?.id) {
      const _tpFeats = await getFeatureSettings(ctx.chat.id.toString());
      if (!_tpFeats.trust) {
        await ctx.reply("The trust system is currently disabled in this chat.");
        return;
      }
    }
    const explainer = getTrustExplainer();
    await ctx.reply(ctx.session?.wardenMode ? wardenResponse(explainer) : explainer);
  });
  
  // /trusthelp - Owner guide for trust commands
  bot.command("trusthelp", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Use /trustpoints to learn how the trust system works!");
      return;
    }
    
    const explainer = getOwnerTrustExplainer();
    await ctx.reply(explainer);
  });
  
  // /trust @username - Vouch for a user (OWNER ONLY)
  bot.command("trust", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can vouch for members!");
      return;
    }
    
    // Get target user from reply or mention
    let targetUserId: string | undefined;
    let targetUsername: string | undefined;
    let targetFirstName: string | undefined;
    
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      const text = ctx.message?.text || "";
      const mention = text.match(/@(\w+)/);
      if (mention) {
        targetUsername = mention[1];
        await ctx.reply(`To vouch for @${targetUsername}, please reply to one of their messages with /trust`);
        return;
      } else {
        await ctx.reply("Usage: Reply to a user's message with /trust to vouch for them");
        return;
      }
    }
    
    if (!targetUserId) {
      await ctx.reply("Couldn't identify the user. Reply to their message and try again.");
      return;
    }
    
    const chatId = String(ctx.chat.id);
    const record = await ensureTrustRecord(targetUserId, chatId, targetUsername, targetFirstName);
    
    if (record?.trustStatus === "vouched") {
      await ctx.reply(`${targetFirstName || targetUsername} is already vouched for!`);
      return;
    }
    
    await db.update(trustScores)
      .set({
        trustStatus: "vouched",
        isTrusted: true,
        trustLevel: Math.max(1, record?.trustLevel || 0),
        isEligible: true,
        vouchedBy: String(ctx.from.id),
        vouchedAt: new Date(),
      })
      .where(and(eq(trustScores.telegramUserId, targetUserId), eq(trustScores.chatId, chatId)));
    
    await ctx.reply(`${targetFirstName || targetUsername} has been VOUCHED by the owner!

They now have trusted status and can bypass the 45-day eligibility requirement.`);
  });
  
  // /trustbulk @user1 @user2 ... - Vouch for multiple users at once (OWNER ONLY)
  bot.command("trustbulk", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can bulk vouch for members!");
      return;
    }
    
    // Extract user IDs from message entities (text_mention type contains user info)
    const entities = ctx.message?.entities || [];
    const text = ctx.message?.text || "";
    
    // Extract text_mention entities which have user objects
    interface TextMentionEntity { type: "text_mention"; offset: number; length: number; user: { id: number; username?: string; first_name: string } }
    const mentionEntities: TextMentionEntity[] = [];
    for (const e of entities) {
      if (e.type === "text_mention" && "user" in e && e.user) {
        mentionEntities.push(e as TextMentionEntity);
      }
    }
    
    // Also check for @username mentions (without user IDs)
    const textMentions = text.match(/@(\w+)/g) || [];
    
    if (mentionEntities.length === 0 && textMentions.length === 0) {
      await ctx.reply(`Usage: /trustbulk @user1 @user2 @user3 ...

Vouch for multiple users at once (up to 10 at a time).

TIP: For best results, select usernames from the autocomplete menu when typing @ so Telegram includes user IDs.`);
      return;
    }
    
    const totalMentions = mentionEntities.length + textMentions.length;
    if (totalMentions > 10) {
      await ctx.reply("Maximum 10 users can be vouched at once. Please split into multiple commands.");
      return;
    }
    
    const chatId = ctx.chat.id;
    const chatIdStr = String(chatId);
    const ownerId = String(ctx.from.id);
    
    const results: { success: string[]; alreadyVouched: string[]; notFound: string[]; created: string[]; errors: string[] } = {
      success: [],
      alreadyVouched: [],
      notFound: [],
      created: [],
      errors: []
    };
    
    await ctx.reply(`Processing ${totalMentions} users... This may take a moment.`);
    
    // Process text_mention entities (have user IDs - most reliable)
    for (const entity of mentionEntities) {
      const userId = String(entity.user.id);
      const username = entity.user.username;
      const firstName = entity.user.first_name;
      const displayName = username ? `@${username}` : firstName;
      
      try {
        // Create or get trust record
        const record = await ensureTrustRecord(userId, chatIdStr, username, firstName);
        
        if (!record) {
          results.errors.push(displayName);
          continue;
        }
        
        if (record.trustStatus === "vouched") {
          results.alreadyVouched.push(displayName);
          continue;
        }
        
        // Vouch the user
        await db.update(trustScores)
          .set({
            trustStatus: "vouched",
            isTrusted: true,
            trustLevel: Math.max(1, record.trustLevel || 0),
            trustScore: Math.max(25, record.trustScore || 0),
            isEligible: true,
            vouchedBy: ownerId,
            vouchedAt: new Date(),
          })
          .where(eq(trustScores.id, record.id));
        
        results.success.push(displayName);
      } catch (error) {
        console.error(`Error vouching ${displayName}:`, error);
        results.errors.push(displayName);
      }
    }
    
    // Process @username mentions (search database - Telegram API can't resolve usernames directly)
    const processedUsernames = new Set(mentionEntities.map(e => e.user?.username?.toLowerCase()).filter(Boolean));
    
    for (const mention of textMentions) {
      const username = mention.replace('@', '').toLowerCase();
      
      // Skip if already processed via text_mention entity
      if (processedUsernames.has(username)) continue;
      
      try {
        // Search database for user by username (case-insensitive)
        const existingRecords = await db.select().from(trustScores)
          .where(and(
            eq(trustScores.chatId, chatIdStr),
            sql`LOWER(${trustScores.username}) = ${username}`
          ))
          .limit(1);
        
        if (existingRecords.length === 0) {
          results.notFound.push(`@${username}`);
          continue;
        }
        
        const record = existingRecords[0];
        
        if (record.trustStatus === "vouched") {
          results.alreadyVouched.push(`@${username}`);
          continue;
        }
        
        // Vouch the user
        await db.update(trustScores)
          .set({
            trustStatus: "vouched",
            isTrusted: true,
            trustLevel: Math.max(1, record.trustLevel || 0),
            trustScore: Math.max(25, record.trustScore || 0),
            isEligible: true,
            vouchedBy: ownerId,
            vouchedAt: new Date(),
          })
          .where(eq(trustScores.id, record.id));
        
        results.success.push(`@${username}`);
      } catch (error) {
        console.error(`Error vouching @${username}:`, error);
        results.errors.push(`@${username}`);
      }
    }
    
    // Build summary message
    let summary = "BULK VOUCH RESULTS:\n\n";
    
    if (results.success.length > 0) {
      summary += `VOUCHED (${results.success.length}):\n${results.success.join(', ')}\n\n`;
    }
    
    if (results.alreadyVouched.length > 0) {
      summary += `Already Vouched (${results.alreadyVouched.length}):\n${results.alreadyVouched.join(', ')}\n\n`;
    }
    
    if (results.notFound.length > 0) {
      summary += `Not Found (${results.notFound.length}):\n${results.notFound.join(', ')}\n(TIP: Select from autocomplete when typing @, or have them message first)\n\n`;
    }
    
    if (results.errors.length > 0) {
      summary += `Errors (${results.errors.length}):\n${results.errors.join(', ')}\n`;
    }
    
    if (results.success.length === 0 && results.alreadyVouched.length === 0) {
      summary += "No users were vouched. Make sure to select usernames from Telegram's autocomplete menu.";
    }
    
    await ctx.reply(summary);
  });
  
  // /untrust @username - Remove trust status (OWNER ONLY)
  bot.command("untrust", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can remove trust status!");
      return;
    }
    
    let targetUserId: string | undefined;
    let targetFirstName: string | undefined;
    
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /untrust to remove their trust status");
      return;
    }
    
    const chatId = String(ctx.chat.id);
    
    await db.update(trustScores)
      .set({
        trustStatus: "none",
        isTrusted: false,
        trustLevel: 0,
        trustScore: 0,
        vouchedBy: null,
        vouchedAt: null,
      })
      .where(and(eq(trustScores.telegramUserId, targetUserId), eq(trustScores.chatId, chatId)));
    
    await ctx.reply(`${targetFirstName}'s trust status has been removed. They will need to earn trust from scratch.`);
  });
  
  // /trustfreeze @username [reason] - Freeze user's trust progress (OWNER ONLY)
  bot.command("trustfreeze", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can freeze trust!");
      return;
    }
    
    let targetUserId: string | undefined;
    let targetFirstName: string | undefined;
    
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /trustfreeze [reason]");
      return;
    }
    
    const reason = ctx.message?.text?.replace("/trustfreeze", "").trim() || "No reason provided";
    const chatId = String(ctx.chat.id);
    
    await db.update(trustScores)
      .set({
        isFrozen: true,
        frozenBy: String(ctx.from.id),
        frozenAt: new Date(),
        frozenReason: reason,
      })
      .where(and(eq(trustScores.telegramUserId, targetUserId), eq(trustScores.chatId, chatId)));
    
    await ctx.reply(`${targetFirstName}'s trust progress has been FROZEN.

Reason: ${reason}

They cannot gain trust points until unfrozen with /trustunfreeze.`);
  });
  
  // /trustunfreeze @username - Unfreeze user's trust progress (OWNER ONLY)
  bot.command("trustunfreeze", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can unfreeze trust!");
      return;
    }
    
    let targetUserId: string | undefined;
    let targetFirstName: string | undefined;
    
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /trustunfreeze");
      return;
    }
    
    const chatId = String(ctx.chat.id);
    
    await db.update(trustScores)
      .set({
        isFrozen: false,
        frozenBy: null,
        frozenAt: null,
        frozenReason: null,
      })
      .where(and(eq(trustScores.telegramUserId, targetUserId), eq(trustScores.chatId, chatId)));
    
    await ctx.reply(`${targetFirstName}'s trust progress has been UNFROZEN. They can now earn trust points again.`);
  });
  
  // /trustboard - Show trust leaderboard
  bot.command("trustboard", async (ctx) => {
    if (!ctx.chat) return;
    const _tbFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_tbFeats.trust) {
      await ctx.reply("The trust system is currently disabled in this chat.");
      return;
    }
    const chatId = String(ctx.chat.id);
    
    const topTrusted = await db.select().from(trustScores)
      .where(and(eq(trustScores.chatId, chatId), eq(trustScores.isTrusted, true)))
      .orderBy(desc(trustScores.trustScore))
      .limit(10);
    
    if (topTrusted.length === 0) {
      await ctx.reply("No trusted members yet! Stick around, participate, and you could be the first!");
      return;
    }
    
    const levelEmojis = ["", "I", "II", "III"];
    let leaderboard = "TRUST LEADERBOARD\n\n";
    
    topTrusted.forEach((member, index) => {
      const medal = index === 0 ? "1." : index === 1 ? "2." : index === 2 ? "3." : `${index + 1}.`;
      const name = member.username ? `@${member.username}` : member.firstName || "Anonymous";
      const level = levelEmojis[member.trustLevel || 0];
      const status = member.trustStatus === "vouched" ? "(V)" : "";
      leaderboard += `${medal} ${name} - ${member.trustScore || 0}pts [Lv${level}] ${status}\n`;
    });
    
    leaderboard += "\n(V) = Vouched by owner";
    
    await ctx.reply(leaderboard);
  });

  // === TRIVIA COMMANDS ===

  // Helper function to get or create member score
  async function getOrCreateMemberScore(telegramUserId: string, chatId: string, username: string, firstName: string) {
    const existing = await db.select().from(memberScores)
      .where(and(eq(memberScores.telegramUserId, telegramUserId), eq(memberScores.chatId, chatId)))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(memberScores)
        .set({ username, firstName, lastActive: new Date() })
        .where(and(eq(memberScores.telegramUserId, telegramUserId), eq(memberScores.chatId, chatId)));
      return existing[0];
    } else {
      const [newScore] = await db.insert(memberScores).values({
        telegramUserId,
        chatId,
        username,
        firstName,
        triviaPoints: 0,
        triviaCorrect: 0,
        triviaAttempts: 0,
        messageCount: 0,
      }).returning();
      return newScore;
    }
  }

  // Helper to ask the next question in a round
  async function askNextQuestion(chatId: number, bot: Bot<MyContext>) {
    const trivia = await getTrivia(chatId);
    if (!trivia) return;

    // Check if round is complete
    if (trivia.currentIndex >= trivia.totalQuestions) {
      await endTriviaRound(chatId, bot);
      return;
    }

    // Get next question
    const question = await getTriviaQuestion(openai);
    trivia.currentQuestion = question;
    trivia.questionStartTime = Date.now();
    trivia.questionDeadline = Date.now() + TRIVIA_QUESTION_MS;
    trivia.answeredCurrent = [];
    trivia.questionResolved = false;
    trivia.currentIndex++;
    await saveTrivia(chatId, trivia);

    const categoryLabel = question.category === 'tasmania' ? 'Tasmania' : question.category === 'wildlife' ? 'Australian Wildlife' : 'Boomerverse';
    const optionsText = question.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");
    
    await bot.api.sendMessage(chatId,
      `QUESTION ${trivia.currentIndex}/${trivia.totalQuestions} [${categoryLabel}]\n\n${question.question}\n\n${optionsText}\n\nAnswer with /answer 1-4 | Worth ${question.points} points | 45 seconds`
    );

    // No timer here. The deadline is stored on the round and checked by
    // expireTriviaIfDue(), which runs on the next message in the chat and on
    // every cron tick. That works whether or not this process still exists.
  }

  // Advance the round if the current question has run out of time.
  async function expireTriviaIfDue(chatId: number, bot: Bot<MyContext>): Promise<void> {
    const trivia = await getTrivia(chatId);
    if (!trivia || trivia.questionResolved) return;
    if (Date.now() < trivia.questionDeadline) return;

    trivia.questionResolved = true;
    await saveTrivia(chatId, trivia);

    const q = trivia.currentQuestion;
    try {
      await bot.api.sendMessage(chatId, `Time's up. The answer was: ${q.options[q.correctIndex]}`);
    } catch { /* chat may be gone */ }
    await askNextQuestion(chatId, bot);
  }

  // Helper to end a trivia round and show results
  async function endTriviaRound(chatId: number, bot: Bot<MyContext>) {
    const trivia = await getTrivia(chatId);
    if (!trivia) return;

    // Build results
    const scores = [...trivia.roundScoreboard].sort((a, b) => b.points - a.points);

    let resultsText = `TRIVIA ROUND COMPLETE!\n\n`;
    if (scores.length === 0) {
      resultsText += "No one scored any points this round.";
    } else {
      resultsText += "ROUND RESULTS:\n";
      scores.slice(0, 10).forEach((s, i) => {
        const medal = i === 0 ? "[1st]" : i === 1 ? "[2nd]" : i === 2 ? "[3rd]" : `[${i + 1}]`;
        resultsText += `${medal} ${s.firstName}: ${s.points} pts (${s.correct}/${s.attempts})\n`;
      });
    }

    const duration = Math.round((Date.now() - trivia.roundStartTime) / 1000);
    resultsText += `\nRound duration: ${duration} seconds\nStart a new game with /trivia or /trivia 5`;

    await bot.api.sendMessage(chatId, resultsText);
    await clearTrivia(chatId);
  }

  // /trivia - Start a trivia round
  bot.command("trivia", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Trivia works best in group chats!");
      return;
    }
    const _triviaFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_triviaFeats.games) {
      await ctx.reply("Games are currently disabled in this chat. An admin can enable them with /toggle games");
      return;
    }

    // Check if there's already an active trivia
    const existing = await getTrivia(ctx.chat.id);
    if (existing) {
      await ctx.reply(`There's an active trivia round! Question ${existing.currentIndex}/${existing.totalQuestions}\nAnswer with /answer 1-4`);
      return;
    }

    // Parse question count from command
    const argText = ctx.message?.text?.replace("/trivia", "").trim();
    let questionCount = parseInt(argText || "") || 1;
    questionCount = Math.max(1, Math.min(25, questionCount)); // Clamp 1-25

    await ctx.reply(`Starting trivia round with ${questionCount} question${questionCount > 1 ? 's' : ''}...`);
    
    // Pre-fill cache in background
    prefillTriviaCache(openai).catch(() => {});

    // Get first question
    const firstQuestion = await getTriviaQuestion(openai);
    
    // Initialize round
    await saveTrivia(ctx.chat.id, {
      currentQuestion: firstQuestion,
      questionStartTime: Date.now(),
      questionDeadline: Date.now() + TRIVIA_QUESTION_MS,
      answeredCurrent: [],
      questionResolved: false,
      totalQuestions: questionCount,
      currentIndex: 1,
      roundScoreboard: [],
      roundStartTime: Date.now(),
    });

    const categoryLabel = firstQuestion.category === 'tasmania' ? 'Tasmania' : firstQuestion.category === 'wildlife' ? 'Australian Wildlife' : 'Boomerverse';
    const optionsText = firstQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");
    
    await ctx.reply(
      `QUESTION 1/${questionCount} [${categoryLabel}]\n\n${firstQuestion.question}\n\n${optionsText}\n\nAnswer with /answer 1-4 | Worth ${firstQuestion.points} points | 45 seconds`
    );

    // Deadline is stored on the round; expireTriviaIfDue() picks it up.
  });

  // /answer - Answer the trivia question
  bot.command("answer", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _answerFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_answerFeats.games) return;
    
    const trivia = await getTrivia(ctx.chat.id);
    if (!trivia) {
      await ctx.reply("No active trivia! Start one with /trivia or /trivia 5");
      return;
    }

    // If the clock ran out before this answer arrived, close that question off.
    if (!trivia.questionResolved && Date.now() >= trivia.questionDeadline) {
      await expireTriviaIfDue(ctx.chat.id, bot);
      await ctx.reply("That question had already timed out.");
      return;
    }

    // Check if question is already resolved (someone already got it right)
    if (trivia.questionResolved) {
      await ctx.reply("This question is already solved! Next question coming up...");
      return;
    }

    // Check if user already answered this question
    if (trivia.answeredCurrent.includes(ctx.from.id)) {
      await ctx.reply("You already answered this question! Wait for the next one.");
      return;
    }

    const answerText = ctx.message?.text?.replace("/answer", "").trim();
    const answerNum = parseInt(answerText || "");
    
    if (isNaN(answerNum) || answerNum < 1 || answerNum > 4) {
      await ctx.reply("Please answer with /answer 1, /answer 2, /answer 3, or /answer 4");
      return;
    }

    trivia.answeredCurrent.push(ctx.from.id);
    
    const telegramUserId = ctx.from.id.toString();
    const chatIdStr = ctx.chat.id.toString();
    const username = ctx.from.username || "";
    const firstName = ctx.from.first_name || "Friend";

    // Get or create member score (persistent database)
    const score = await getOrCreateMemberScore(telegramUserId, chatIdStr, username, firstName);

    // Get or create round scoreboard entry
    let roundScore = trivia.roundScoreboard.find(s => s.oderId === ctx.from!.id);
    if (!roundScore) {
      roundScore = { oderId: ctx.from.id, username, firstName, points: 0, correct: 0, attempts: 0 };
      trivia.roundScoreboard.push(roundScore);
    }

    const isCorrect = (answerNum - 1) === trivia.currentQuestion.correctIndex;
    roundScore.attempts++;
    
    if (isCorrect) {
      // Mark question as resolved to prevent race conditions
      trivia.questionResolved = true;
      
      // Award points
      const earnedPoints = trivia.currentQuestion.points;
      roundScore.points += earnedPoints;
      roundScore.correct++;

      // Update persistent database with daily/weekly/monthly tracking
      const newPoints = (score.triviaPoints || 0) + earnedPoints;
      const newCorrect = (score.triviaCorrect || 0) + 1;
      const newAttempts = (score.triviaAttempts || 0) + 1;
      
      // Get current date strings for period tracking
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const weekNum = getWeekNumber(now);
      const weekStr = `${now.getFullYear()}-W${weekNum}`;
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate period points (reset if new period)
      const newDailyPoints = score.dailyResetDate === todayStr 
        ? (score.dailyPoints || 0) + earnedPoints 
        : earnedPoints;
      const newWeeklyPoints = score.weeklyResetDate === weekStr 
        ? (score.weeklyPoints || 0) + earnedPoints 
        : earnedPoints;
      const newMonthlyPoints = score.monthlyResetDate === monthStr 
        ? (score.monthlyPoints || 0) + earnedPoints 
        : earnedPoints;
      
      await db.update(memberScores)
        .set({ 
          triviaPoints: newPoints, 
          triviaCorrect: newCorrect, 
          triviaAttempts: newAttempts,
          dailyPoints: newDailyPoints,
          dailyResetDate: todayStr,
          weeklyPoints: newWeeklyPoints,
          weeklyResetDate: weekStr,
          monthlyPoints: newMonthlyPoints,
          monthlyResetDate: monthStr
        })
        .where(and(eq(memberScores.telegramUserId, telegramUserId), eq(memberScores.chatId, chatIdStr)));

      await saveTrivia(ctx.chat.id, trivia);
      await ctx.reply(`Correct. ${firstName} earned ${earnedPoints} points. (Round: ${roundScore.points} pts)`);

      // Short pause, then straight on to the next question. We're still inside
      // this invocation, so awaiting here is safe.
      await new Promise(r => setTimeout(r, 1500));
      await askNextQuestion(ctx.chat.id, bot);
    } else {
      // Wrong answer
      const newAttempts = (score.triviaAttempts || 0) + 1;
      await db.update(memberScores)
        .set({ triviaAttempts: newAttempts })
        .where(and(eq(memberScores.telegramUserId, telegramUserId), eq(memberScores.chatId, chatIdStr)));

      await ctx.reply(`Wrong! ${firstName}, try again or wait for the timer.`);
    }
  });

  // /myscore - Check your trivia score
  bot.command("myscore", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const telegramUserId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    
    const scores = await db.select().from(memberScores)
      .where(and(eq(memberScores.telegramUserId, telegramUserId), eq(memberScores.chatId, chatId)))
      .limit(1);

    if (scores.length === 0) {
      await ctx.reply("You haven't played trivia yet! Start with /trivia");
      return;
    }

    const score = scores[0];
    const accuracy = score.triviaAttempts && score.triviaAttempts > 0 
      ? Math.round(((score.triviaCorrect || 0) / score.triviaAttempts) * 100) 
      : 0;

    await ctx.reply(
      `Your Trivia Stats:\n\n` +
      `Points: ${score.triviaPoints || 0}\n` +
      `Correct: ${score.triviaCorrect || 0}\n` +
      `Attempts: ${score.triviaAttempts || 0}\n` +
      `Accuracy: ${accuracy}%\n` +
      `Messages: ${score.messageCount || 0}`
    );
  });


  // /leaderboard - Show daily leaderboard + weekly/monthly top winners
  bot.command("leaderboard", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const chatId = ctx.chat.id.toString();
    
    // Get current period strings
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekNum = getWeekNumber(now);
    const weekStr = `${now.getFullYear()}-W${weekNum}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get all scores for this chat
    const allScores = await db.select().from(memberScores)
      .where(eq(memberScores.chatId, chatId));
    
    if (allScores.length === 0) {
      await ctx.reply("No scores yet! Be the first to play /trivia");
      return;
    }
    
    // Filter for today's scores (only those who played today)
    const todayScores = allScores
      .filter(s => s.dailyResetDate === todayStr && (s.dailyPoints || 0) > 0)
      .sort((a, b) => (b.dailyPoints || 0) - (a.dailyPoints || 0))
      .slice(0, 10);
    
    // Find weekly top winner (only from this week)
    const weeklyScores = allScores
      .filter(s => s.weeklyResetDate === weekStr && (s.weeklyPoints || 0) > 0)
      .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0));
    const weeklyTop = weeklyScores.length > 0 ? weeklyScores[0] : null;
    
    // Find monthly top winner (only from this month)
    const monthlyScores = allScores
      .filter(s => s.monthlyResetDate === monthStr && (s.monthlyPoints || 0) > 0)
      .sort((a, b) => (b.monthlyPoints || 0) - (a.monthlyPoints || 0));
    const monthlyTop = monthlyScores.length > 0 ? monthlyScores[0] : null;
    
    // Build leaderboard message
    let text = "DAILY TRIVIA LEADERBOARD\n\n";
    
    if (todayScores.length > 0) {
      todayScores.forEach((s, i) => {
        const medal = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`;
        const name = s.username ? `@${s.username}` : s.firstName || "Anonymous";
        text += `${medal}: ${name} - ${s.dailyPoints} pts\n`;
      });
    } else {
      text += "No scores yet today! Start with /trivia\n";
    }
    
    text += "\n--- TOP WINNERS ---\n";
    
    // Weekly top
    if (weeklyTop) {
      const weekName = weeklyTop.username ? `@${weeklyTop.username}` : weeklyTop.firstName || "Anonymous";
      text += `\nWeek Champion: ${weekName} (${weeklyTop.weeklyPoints} pts)`;
    } else {
      text += "\nWeek Champion: None yet this week";
    }
    
    // Monthly top
    if (monthlyTop) {
      const monthName = monthlyTop.username ? `@${monthlyTop.username}` : monthlyTop.firstName || "Anonymous";
      text += `\nMonth Champion: ${monthName} (${monthlyTop.monthlyPoints} pts)`;
    } else {
      text += "\nMonth Champion: None yet this month";
    }
    
    await ctx.reply(text);
  });

  // /puzzle - Start a word puzzle game
  bot.command("puzzle", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Puzzle games work best in group chats!");
      return;
    }
    const _puzzleFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_puzzleFeats.games) {
      await ctx.reply("Games are currently disabled in this chat. An admin can enable them with /toggle games");
      return;
    }
    
    // Check for active puzzle
    const existing = await getPuzzle(ctx.chat.id);
    if (existing && !existing.solved && Date.now() < existing.deadline) {
      const timeLeft = Math.max(0, Math.ceil((existing.startTime + existing.timeLimit * 1000 - Date.now()) / 1000));
      await ctx.reply(`Active puzzle: ${existing.scrambled}\nTime left: ${timeLeft}s | Guess with /guess YOUR_ANSWER`);
      return;
    }
    
    // Parse difficulty
    const argText = ctx.message?.text?.replace("/puzzle", "").trim().toLowerCase();
    let difficulty: 'easy' | 'hard' = 'easy';
    if (argText === 'hard') {
      difficulty = 'hard';
    } else if (argText === 'easy') {
      difficulty = 'easy';
    } else if (argText) {
      difficulty = Math.random() < 0.5 ? 'easy' : 'hard';
    } else {
      difficulty = Math.random() < 0.5 ? 'easy' : 'hard';
    }
    
    const wordList = difficulty === 'easy' ? EASY_WORDS : HARD_WORDS;
    const word = await getUnusedPuzzleWord(ctx.chat.id, wordList);
    const scrambled = scrambleWord(word);
    const timeLimit = difficulty === 'easy' ? 45 : 20;
    const points = difficulty === 'easy' ? 5 : 15;
    
    // Ensure user exists in database
    await getOrCreatePuzzleScore(
      ctx.from.id.toString(),
      ctx.chat.id.toString(),
      ctx.from.username || "",
      ctx.from.first_name || "Friend"
    );
    
    const chatId = ctx.chat.id;
    const puzzle: ActivePuzzle = {
      word,
      scrambled,
      difficulty,
      startTime: Date.now(),
      deadline: Date.now() + timeLimit * 1000,
      timeLimit,
      points,
      answeredUsers: [],
      solved: false
    };

    await savePuzzle(chatId, puzzle);
    
    await ctx.reply(
      `WORD PUZZLE [${difficulty.toUpperCase()}]\n\n` +
      `Unscramble: ${scrambled}\n\n` +
      `Worth ${points} points | ${timeLimit} seconds\n` +
      `Answer with: /guess YOUR_ANSWER`
    );
    
    // No timer. expirePuzzleIfDue() closes it out on the next message in the
    // chat, or on the next cron tick, whichever comes first.
  });

  // Close out a puzzle whose time ran out. Called from the message middleware
  // and from the cron tick — no timer needed.
  async function expirePuzzleIfDue(chatId: number, bot: Bot<MyContext>): Promise<void> {
    const puzzle = await getPuzzle(chatId);
    if (!puzzle || puzzle.solved) return;
    if (Date.now() < puzzle.deadline) return;
    await clearPuzzle(chatId);
    try {
      await bot.api.sendMessage(chatId, `Time's up. The answer was: ${puzzle.word}\n\nTry again with /puzzle or /puzzle hard`);
    } catch { /* chat may be gone */ }
  }

  // /guess - Guess the puzzle answer
  bot.command("guess", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _guessFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_guessFeats.games) return;
    
    const puzzle = await getPuzzle(ctx.chat.id);
    if (!puzzle || puzzle.solved) {
      await ctx.reply("No active puzzle. Start one with /puzzle or /puzzle hard");
      return;
    }

    // Check if time expired
    if (Date.now() > puzzle.deadline) {
      await ctx.reply(`Time's up. The answer was: ${puzzle.word}`);
      await clearPuzzle(ctx.chat.id);
      return;
    }
    
    const guessText = ctx.message?.text?.replace("/guess", "").trim().toUpperCase();
    if (!guessText) {
      await ctx.reply("Usage: /guess YOUR_ANSWER");
      return;
    }
    
    const telegramUserId = ctx.from.id.toString();
    const chatIdStr = ctx.chat.id.toString();
    const username = ctx.from.username || "";
    const firstName = ctx.from.first_name || "Friend";
    
    // Ensure user exists
    await getOrCreatePuzzleScore(telegramUserId, chatIdStr, username, firstName);
    
    // Check if already guessed wrong this round
    if (puzzle.answeredUsers.includes(ctx.from.id)) {
      await ctx.reply("You already guessed this round! Wait for the next puzzle.");
      return;
    }
    
    if (guessText === puzzle.word) {
      // Correct!
      puzzle.solved = true;
      puzzle.solverName = firstName;

      const timeSpent = Math.round((Date.now() - puzzle.startTime) / 1000);
      
      await updatePuzzleScore(telegramUserId, chatIdStr, puzzle.points);
      
      await ctx.reply(
        `CORRECT! ${firstName} solved it!\n\n` +
        `Answer: ${puzzle.word}\n` +
        `Time: ${timeSpent}s | Points: +${puzzle.points}\n\n` +
        `Play again with /puzzle or /puzzle hard`
      );
      
      await clearPuzzle(ctx.chat.id);
    } else {
      // Wrong
      puzzle.answeredUsers.push(ctx.from.id);
      await savePuzzle(ctx.chat.id, puzzle);
      await incrementPuzzleAttempt(telegramUserId, chatIdStr);
      
      const timeLeft = Math.max(0, Math.ceil((puzzle.deadline - Date.now()) / 1000));
      await ctx.reply(`Not it. ${timeLeft}s left for everyone else.`);
    }
  });

  // /puzzleboard - Show puzzle leaderboard
  bot.command("puzzleboard", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _pbFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_pbFeats.games) {
      await ctx.reply("Games are currently disabled in this chat.");
      return;
    }
    const chatId = ctx.chat.id.toString();
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekNum = getWeekNumberForPuzzle(now);
    const weekStr = `${now.getFullYear()}-W${weekNum}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const allScores = await db.select().from(memberScores)
      .where(eq(memberScores.chatId, chatId));
    
    if (allScores.length === 0) {
      await ctx.reply("No puzzle scores yet! Start with /puzzle or /puzzle hard");
      return;
    }
    
    // Daily puzzle scores
    const todayScores = allScores
      .filter(s => s.puzzleDailyResetDate === todayStr && (s.puzzleDailyPoints || 0) > 0)
      .sort((a, b) => (b.puzzleDailyPoints || 0) - (a.puzzleDailyPoints || 0))
      .slice(0, 10);
    
    // Weekly top
    const weeklyScores = allScores
      .filter(s => s.puzzleWeeklyResetDate === weekStr && (s.puzzleWeeklyPoints || 0) > 0)
      .sort((a, b) => (b.puzzleWeeklyPoints || 0) - (a.puzzleWeeklyPoints || 0));
    const weeklyTop = weeklyScores.length > 0 ? weeklyScores[0] : null;
    
    // Monthly top
    const monthlyScores = allScores
      .filter(s => s.puzzleMonthlyResetDate === monthStr && (s.puzzleMonthlyPoints || 0) > 0)
      .sort((a, b) => (b.puzzleMonthlyPoints || 0) - (a.puzzleMonthlyPoints || 0));
    const monthlyTop = monthlyScores.length > 0 ? monthlyScores[0] : null;
    
    let text = "DAILY PUZZLE LEADERBOARD\n\n";
    
    if (todayScores.length > 0) {
      todayScores.forEach((s, i) => {
        const medal = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`;
        const name = s.username ? `@${s.username}` : s.firstName || "Anonymous";
        text += `${medal}: ${name} - ${s.puzzleDailyPoints} pts\n`;
      });
    } else {
      text += "No puzzle scores today! Start with /puzzle\n";
    }
    
    text += "\n--- TOP PUZZLE SOLVERS ---\n";
    
    if (weeklyTop) {
      const weekName = weeklyTop.username ? `@${weeklyTop.username}` : weeklyTop.firstName || "Anonymous";
      text += `\nWeek Champion: ${weekName} (${weeklyTop.puzzleWeeklyPoints} pts)`;
    } else {
      text += "\nWeek Champion: None yet this week";
    }
    
    if (monthlyTop) {
      const monthName = monthlyTop.username ? `@${monthlyTop.username}` : monthlyTop.firstName || "Anonymous";
      text += `\nMonth Champion: ${monthName} (${monthlyTop.puzzleMonthlyPoints} pts)`;
    } else {
      text += "\nMonth Champion: None yet this month";
    }
    
    await ctx.reply(text);
  });

  // === STORY GENERATOR ===
  
  // /story - Generate a random Boomerverse story
  bot.command("story", async (ctx) => {
    if (!ctx.from) return;
    if (ctx.chat?.id) {
      const _storyFeats = await getFeatureSettings(ctx.chat.id.toString());
      if (!_storyFeats.stories) {
        await ctx.reply("Stories are currently disabled in this chat. An admin can enable them with /toggle stories");
        return;
      }
    }
    // Admin-only. Stories are never auto-posted.
    if (!(await isOwner(ctx)) && !(await isAdmin(ctx))) {
      await ctx.reply("Stories are read out by admins, not on request.");
      return;
    }
    const story = RiftLore.generateRandomStory();

    await ctx.reply(story);
  });

  // === BANLIST COMMAND (Owner Only) ===
  
  // /banlist - View all banned/kicked users
  // === VIOLATIONS COMMAND (Owner Only) ===
  
  // /violations - View all security violations logged
  bot.command("violations", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    
    const ownerCheck = await isOwner(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only the group owner can view violations!");
      return;
    }
    
    const chatId = String(ctx.chat.id);
    
    // Get all violations for this chat
    const violations = await db.select().from(violationLogs)
      .where(eq(violationLogs.chatId, chatId))
      .orderBy(desc(violationLogs.createdAt))
      .limit(50);
    
    if (violations.length === 0) {
      await ctx.reply("No violations recorded for this chat yet! That's a good thing.");
      return;
    }
    
    let text = "SECURITY VIOLATIONS (Last 50)\n\n";
    
    for (const v of violations) {
      const name = v.username ? `@${v.username}` : `User ${v.userId}`;
      const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "Unknown";
      text += `${v.violationType?.toUpperCase()}: ${name}\n`;
      text += `  Action: ${v.actionTaken || "logged"} | ${date}\n`;
      if (v.violatingContent) {
        const preview = v.violatingContent.substring(0, 50) + (v.violatingContent.length > 50 ? "..." : "");
        text += `  Content: ${preview}\n`;
      }
      text += "\n";
    }
    
    await ctx.reply(text);
  });

  // /botremove — only Boss or Community Leader may deliberately remove an extra bot.
  bot.command("botremove", async (ctx) => {
    if (!ctx.chat || !ctx.from || ctx.chat.type === "private") return;
    if (!canManageExtraBots(ctx)) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can remove an authorised bot.");
      return;
    }
    const target = ctx.message?.reply_to_message?.from;
    if (!target?.is_bot || target.id === ctx.me.id) {
      await ctx.reply("Reply to a message from the extra bot with /botremove.");
      return;
    }
    try {
      await ctx.api.banChatMember(ctx.chat.id, target.id);
      await ctx.reply(`Removed @${target.username || target.id}. Bot authority belongs to @aussieboomer and @TreeFitty.`);
    } catch {
      await ctx.reply("I couldn't remove that bot. Check my Ban Users permission.");
    }
  });

  // /myid — safe helper for any member to read their immutable Telegram user ID.
  bot.command("myid", async (ctx) => {
    if (!ctx.from) return;
    const label = memberLabel(ctx.from);
    await ctx.reply(`${label}, your Telegram numeric user ID is: ${ctx.from.id}\n\nUsernames can change. This number is what The Warden uses for secure role authority.`);
  });

  // === TRUST MANAGEMENT (Owner + @TreeFitty Only) ===
  
  // /trustset — Boss/Community Leader only. Reply with: full | trusted | normal | restricted
  bot.command("trustset", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    // Check if user can manage trust (owner or @TreeFitty)
    const canManage = canManageCommunityTrust(ctx);
    
    if (!canManage) {
      await ctx.reply("Only @aussieboomer and @TreeFitty can change community trust levels.");
      return;
    }
    
    // Parse command: /trustset @username level
    const text = ctx.message?.text || "";
    const parts = text.replace("/trustset", "").trim().split(/\s+/);
    
    let targetUserId: string | undefined;
    let targetUsername: string | undefined;
    let targetFirstName: string | undefined;
    let level = parts[parts.length - 1]?.toLowerCase();
    if (level === "level1" || level === "level2") level = "trusted";
    
    // Get target from reply or mention
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      const mention = parts.find(p => p.startsWith("@"));
      if (mention) {
        const lookup = mention.replace(/^@/, "").toLowerCase();
        const rows = await db.select().from(trustScores)
          .where(and(eq(trustScores.chatId, String(ctx.chat.id)), sql`LOWER(${trustScores.username}) = ${lookup}`))
          .limit(1);
        if (rows.length) {
          targetUserId = rows[0].telegramUserId;
          targetUsername = rows[0].username || lookup;
          targetFirstName = rows[0].firstName || undefined;
        } else {
          await ctx.reply(`I don't have @${lookup}'s numeric Telegram ID yet. Have them send one message, then run the command again — or reply directly to their message.`);
          return;
        }
      } else {
        await ctx.reply("Usage: /trustset @username full|trusted|normal|restricted — or reply to their message with /trustset [level]");
        return;
      }
    }
    
    if (!["full", "trusted", "normal", "restricted"].includes(level)) {
      await ctx.reply("Invalid level. Use: full, trusted, normal, or restricted.\n\nExample: /trustset trusted");
      return;
    }
    
    const chatId = String(ctx.chat.id);
    const scoreMap: Record<string, number> = { restricted: 0, normal: 0, trusted: 60, full: 100 };
    const levelMap: Record<string, number> = { restricted: 0, normal: 0, trusted: 2, full: 3 };
    
    const newScore = scoreMap[level];
    const newLevel = levelMap[level];
    
    // Update or create trust record
    const existing = await db.select().from(trustScores)
      .where(and(
        eq(trustScores.telegramUserId, targetUserId),
        eq(trustScores.chatId, chatId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(trustScores)
        .set({
          trustScore: newScore,
          trustLevel: newLevel,
          trustStatus: level === "restricted" ? "restricted" : level === "normal" ? "none" : "vouched",
          isTrusted: level === "trusted" || level === "full",
          isEligible: level === "trusted" || level === "full",
          isFrozen: level === "restricted",
          frozenBy: level === "restricted" ? String(ctx.from.id) : null,
          frozenAt: level === "restricted" ? new Date() : null,
          frozenReason: level === "restricted" ? "Manual restricted trust level" : null,
          vouchedBy: level === "trusted" || level === "full" ? String(ctx.from.id) : null,
          vouchedAt: level === "trusted" || level === "full" ? new Date() : null,
          lastTrustUpdate: new Date()
        })
        .where(and(
          eq(trustScores.telegramUserId, targetUserId),
          eq(trustScores.chatId, chatId)
        ));
    } else {
      await db.insert(trustScores).values({
        telegramUserId: targetUserId,
        chatId,
        username: targetUsername,
        firstName: targetFirstName,
        trustScore: newScore,
        trustLevel: newLevel,
        trustStatus: level === "restricted" ? "restricted" : level === "normal" ? "none" : "vouched",
        isTrusted: level === "trusted" || level === "full",
        isEligible: level === "trusted" || level === "full",
        isFrozen: level === "restricted",
        frozenBy: level === "restricted" ? String(ctx.from.id) : null,
        frozenAt: level === "restricted" ? new Date() : null,
        frozenReason: level === "restricted" ? "Manual restricted trust level" : null,
        vouchedBy: level === "trusted" || level === "full" ? String(ctx.from.id) : null,
        vouchedAt: level === "trusted" || level === "full" ? new Date() : null
      });
    }
    
    const name = targetUsername ? `@${targetUsername}` : targetFirstName || "User";
    await ctx.reply(`${name} is now ${level.toUpperCase()} trust.\n\nOnly @aussieboomer and @TreeFitty can change this setting.`);
  });

  // /trustcheck — inspect a member's effective community trust level.
  bot.command("trustcheck", async (ctx) => {
    if (!ctx.chat || !ctx.from || ctx.chat.type === "private") return;
    let target = ctx.message?.reply_to_message?.from;
    let userId: string | undefined = target ? String(target.id) : undefined;
    let uname = target?.username;
    let first = target?.first_name;
    if (!userId) {
      const mention = (ctx.message?.text || "").match(/@(\w+)/);
      if (!mention) { await ctx.reply("Use /trustcheck @username or reply to their message with /trustcheck."); return; }
      const lookup = mention[1].toLowerCase();
      const rows = await db.select().from(trustScores)
        .where(and(eq(trustScores.chatId, String(ctx.chat.id)), sql`LOWER(${trustScores.username}) = ${lookup}`)).limit(1);
      if (!rows.length) { await ctx.reply(`I haven't seen @${lookup} speak yet, so I don't have their numeric ID.`); return; }
      userId = rows[0].telegramUserId; uname = rows[0].username || lookup; first = rows[0].firstName || undefined;
    }
    const level = await getCommunityTrustClass(userId, String(ctx.chat.id));
    const staticRole = staticRoleForUserId(userId);
    const label = uname ? `@${uname}` : (first || `User ${userId}`);
    const roleText = staticRole === "boss" ? "Boss" : staticRole === "community_leader" ? "Community Leader" : staticRole === "trusted_mod" ? "Trusted Mod/Admin" : "Member";
    await ctx.reply(`${label} — ${roleText}. Effective community trust: ${level.toUpperCase()}.`);
  });

  // /trustremove @user level1|level2|all - Remove trust
  bot.command("trustremove", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const canManage = canManageCommunityTrust(ctx);
    
    if (!canManage) {
      await ctx.reply("Only @aussieboomer and @TreeFitty can change community trust levels.");
      return;
    }
    
    const text = ctx.message?.text || "";
    const parts = text.replace("/trustremove", "").trim().split(/\s+/);
    
    let targetUserId: string | undefined;
    let targetUsername: string | undefined;
    let targetFirstName: string | undefined;
    let level = parts[parts.length - 1]?.toLowerCase();
    
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /trustremove level1|level2|all");
      return;
    }
    
    if (!["level1", "level2", "all"].includes(level)) {
      await ctx.reply("Invalid level! Use: level1, level2, or all\n\nExample: /trustremove all");
      return;
    }
    
    const chatId = String(ctx.chat.id);
    
    const existing = await db.select().from(trustScores)
      .where(and(
        eq(trustScores.telegramUserId, targetUserId),
        eq(trustScores.chatId, chatId)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      await ctx.reply("This user has no trust record to modify!");
      return;
    }
    
    const current = existing[0];
    let newScore = current.trustScore || 0;
    
    if (level === "all") {
      newScore = 0;
    } else if (level === "level1") {
      newScore = Math.max(0, newScore - 25);
    } else if (level === "level2") {
      newScore = Math.max(0, newScore - 50);
    }
    
    const newLevel = newScore >= 75 ? 3 : newScore >= 50 ? 2 : newScore >= 25 ? 1 : 0;
    const newStatus = newScore > 0 ? "earned" : "none";
    
    await db.update(trustScores)
      .set({
        trustScore: newScore,
        trustLevel: newLevel,
        trustStatus: newStatus,
        isTrusted: newScore >= 25,
        vouchedBy: null,
        vouchedAt: null,
        lastTrustUpdate: new Date()
      })
      .where(and(
        eq(trustScores.telegramUserId, targetUserId),
        eq(trustScores.chatId, chatId)
      ));
    
    const name = targetUsername ? `@${targetUsername}` : targetFirstName || "User";
    await ctx.reply(`${name}'s trust has been reduced. New score: ${newScore} pts (Level ${newLevel})`);
  });

  // === ADMIN MODERATION COMMANDS ===

  // /ban - Ban a user (admin only)
  bot.command("ban", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const chatIdStr = ctx.chat.id.toString();
    const adminCheck = await isBotAdmin(ctx, chatIdStr);
    if (!adminCheck) {
      await ctx.reply("Only admins can ban users!");
      return;
    }
    
    // Get user from reply
    const targetUser = ctx.message?.reply_to_message?.from;
    if (!targetUser) {
      await ctx.reply("Reply to a user's message to ban them!");
      return;
    }
    
    if (targetUser.is_bot) {
      await ctx.reply("I can't ban bots!");
      return;
    }
    
    try {
      await ctx.api.banChatMember(ctx.chat.id, targetUser.id);
      
      // Log ban event to database
      await db.insert(banEvents).values({
        chatId: String(ctx.chat.id),
        telegramUserId: String(targetUser.id),
        username: targetUser.username,
        firstName: targetUser.first_name,
        actionType: "ban",
        reason: "Admin command",
        actorId: String(ctx.from.id),
        actorUsername: ctx.from.username,
        executionSource: "admin"
      });

      // Cross-group propagation: a ban here blocks them everywhere this bot works.
      const _banFeats = await getFeatureSettings(chatIdStr);
      if (_banFeats.crossBan) {
        await recordGlobalBan(String(targetUser.id), targetUser.username,
          targetUser.first_name, chatIdStr, "Banned by admin");
      }

      await ctx.reply(
        `Banned ${targetUser.first_name}. They can no longer join this group.` +
        (_banFeats.crossBan ? `\n\nAlso blocked from every other group I manage.` : ``)
      );
    } catch (error) {
      await ctx.reply("Couldn't ban that user. Make sure I have admin permissions!");
    }
  });

  // /kick - Kick a user (admin only)
  bot.command("kick", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const adminCheck = await isAdmin(ctx);
    if (!adminCheck) {
      await ctx.reply("Only admins can kick users!");
      return;
    }
    
    const targetUser = ctx.message?.reply_to_message?.from;
    if (!targetUser) {
      await ctx.reply("Reply to a user's message to kick them!");
      return;
    }
    
    if (targetUser.is_bot) {
      await ctx.reply("I can't kick bots!");
      return;
    }
    
    try {
      // Ban then immediately unban = kick
      await ctx.api.banChatMember(ctx.chat.id, targetUser.id);
      await ctx.api.unbanChatMember(ctx.chat.id, targetUser.id);
      
      // Log kick event to database
      await db.insert(banEvents).values({
        chatId: String(ctx.chat.id),
        telegramUserId: String(targetUser.id),
        username: targetUser.username,
        firstName: targetUser.first_name,
        actionType: "kick",
        reason: "Admin command",
        actorId: String(ctx.from.id),
        actorUsername: ctx.from.username,
        executionSource: "admin"
      });
      
      await ctx.reply(`Kicked ${targetUser.first_name}. They can rejoin if they have the link.`);
    } catch (error) {
      await ctx.reply("Couldn't kick that user. Make sure I have admin permissions!");
    }
  });

  // /poll - Create a poll (admin only)
  bot.command("poll", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const adminCheck = await isAdmin(ctx);
    if (!adminCheck) {
      await ctx.reply("Only admins can create polls!");
      return;
    }
    
    const pollText = ctx.message?.text?.replace("/poll", "").trim();
    if (!pollText) {
      await ctx.reply("Usage: /poll Question? | Option 1 | Option 2 | Option 3\n\nExample: /poll Favourite Australian animal? | Thylacine | Wombat | Wedge-tailed eagle");
      return;
    }
    
    const parts = pollText.split("|").map(p => p.trim()).filter(p => p);
    if (parts.length < 3) {
      await ctx.reply("Need at least 2 options!\n\nUsage: /poll Question? | Option 1 | Option 2");
      return;
    }
    
    const question = parts[0];
    const options = parts.slice(1);
    
    if (options.length > 10) {
      await ctx.reply("Maximum 10 options allowed!");
      return;
    }
    
    try {
      await ctx.api.sendPoll(ctx.chat.id, question, options, { is_anonymous: false });
    } catch (error) {
      await ctx.reply("Couldn't create poll. Make sure options are valid!");
    }
  });

  // /restore - Owner-only: Restore suspended referrer's posting rights
  // /restore — clear a mute and any moderation hold on a user (owner only)
  bot.command("restore", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;

    if (!(await isOwner(ctx))) {
      await ctx.reply("Only the group owner can use this command.");
      return;
    }

    const targetUser = ctx.message?.reply_to_message?.from;
    if (!targetUser) {
      await ctx.reply("Reply to someone's message with /restore to clear their mute and reset their offence count.");
      return;
    }

    const chatIdStr = ctx.chat.id.toString();
    await unmuteUser(ctx, targetUser.id);
    await stateDel(KEYS.offense(ctx.chat.id, targetUser.id));

    await ctx.reply(`${targetUser.first_name} is unmuted and their offence count is back to zero.`);
  });

  // /ask - Ask about the collection
  bot.command("ask", async (ctx) => {
    if (!ctx.chat) return;
    const _askFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_askFeats.aiChat) {
      await ctx.reply("AI responses are currently disabled in this chat. An admin can enable them with /toggle aiChat");
      return;
    }
    const question = ctx.message?.text?.replace("/ask", "").trim();
    if (!question) {
      await ctx.reply("What do you want to know? Use: /ask [your question]\n\nExamples:\n- /ask how many pieces are in Genesis\n- /ask how does royalty eligibility work\n- /ask what happens in an OTC sale");
      return;
    }
    
    // Check for games questions - instant response
    const { isGames, response: gamesResponse } = detectGamesQuery(question);
    if (isGames && gamesResponse) {
      await ctx.reply(gamesResponse);
      return;
    }
    
    // Check query types BEFORE cache check (crypto needs live data)
    const { isCrypto, tokens } = detectCryptoQuery(question);
    // Skip cache for crypto queries (need live prices)
    const skipCache = isCrypto;
    
    // Check Q&A cache first for non-crypto/recipe questions
    if (!skipCache) {
      const cached = await findCachedAnswer(question);
      if (cached) {
        await ctx.reply(cached.answer + "\n\n[From The Warden's brain - asked " + cached.askCount + " times]");
        return;
      }
    }
    
    await ctx.reply("Thinking...");
    
    let liveData = "";
    let disclaimer = "";
    
    // Handle crypto queries
    if (isCrypto) {
      // Fetch live data for detected tokens
      const tokenDataPromises = tokens.slice(0, 3).map(async (t) => {
        const data = await searchToken(t);
        if (data) {
          const arrow = data.change24h >= 0 ? "+" : "";
          const priceStr = data.price >= 1 ? `$${data.price.toFixed(2)}` : `$${data.price.toFixed(6)}`;
          return `${data.name}: ${priceStr} (${arrow}${data.change24h.toFixed(1)}%)`;
        }
        return null;
      });
      
      const tokenResults = (await Promise.all(tokenDataPromises)).filter(Boolean);
      if (tokenResults.length > 0) {
        liveData += `\n\nLIVE PRICES:\n${tokenResults.join("\n")}`;
      }
      
      // Check for NFT mentions
      const nftKeywords = ["nft", "bored ape", "bayc", "azuki", "pudgy", "doodles", "cryptopunks", "mutant ape", "mayc"];
      const hasNFT = nftKeywords.some(k => question.toLowerCase().includes(k));
      if (hasNFT) {
        const nftData = await fetchNFTData(question);
        if (nftData) {
          liveData += `\n\n${nftData}`;
        }
      }
      
      // Get trending if asking about trending/hot coins
      if (question.toLowerCase().includes("trending") || question.toLowerCase().includes("hot")) {
        const trending = await fetchTrendingCoins();
        if (trending) {
          liveData += `\n\n${trending}`;
        }
      }
    }
    
    // Get AI response with context
    let context = "User asking a question about Boomerverse";
    if (isCrypto) context = "User asking about crypto/NFT. Provide helpful market commentary.";
    
    const aiResponse = await getAIResponse(question, context);
    const fullResponse = aiResponse + liveData + disclaimer;
    
    // Cache the response for future use (only for non-crypto/recipe questions)
    if (!skipCache && aiResponse) {
      await cacheAnswer(question, aiResponse);
    }
    
    await wardenReply(ctx, fullResponse, { gifChance: 0.15 });
  });

  // === MODERATION COMMANDS ===

  // /mute - Mute a user (admin/mod only)
  bot.command("mute", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("This command only works in groups.");
      return;
    }
    
    // Check if caller can moderate (admin or mod role)
    const chatIdStr = String(ctx.chat.id);
    const callerCanMod = await canUserModerate(ctx, ctx.from.id, chatIdStr);
    if (!callerCanMod) {
      await ctx.reply("Only admins and mods can use this command.");
      return;
    }
    
    // Get mentioned user or replied-to user
    const replyTo = ctx.message?.reply_to_message?.from;
    const args = ctx.message?.text?.split(/\s+/) || [];
    let targetUserId: number | null = null;
    let duration = 3600; // Default 1 hour
    let reason = "Muted by admin";
    
    if (replyTo) {
      targetUserId = replyTo.id;
      // Parse duration from args if provided: /mute 1h reason
      if (args[1]) {
        const durationMatch = args[1].match(/^(\d+)([mhd])$/i);
        if (durationMatch) {
          const num = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          if (unit === 'm') duration = num * 60;
          else if (unit === 'h') duration = num * 3600;
          else if (unit === 'd') duration = num * 86400;
          reason = args.slice(2).join(" ") || reason;
        } else {
          reason = args.slice(1).join(" ") || reason;
        }
      }
    } else {
      await ctx.reply("Reply to a user's message to mute them.\nUsage: /mute [duration] [reason]\nDuration: 30m, 1h, 1d");
      return;
    }
    
    // Don't mute admins
    const targetIsAdmin = await isUserAdmin(ctx, targetUserId);
    if (targetIsAdmin) {
      await ctx.reply("Cannot mute an admin.");
      return;
    }
    
    const targetUsername = replyTo?.username || replyTo?.first_name || `User ${targetUserId}`;
    const success = await muteUser(ctx, targetUserId, duration, reason, targetUsername);
    if (success) {
      const durationStr = duration < 3600 ? `${Math.round(duration/60)} minutes` : 
                          duration < 86400 ? `${Math.round(duration/3600)} hour(s)` :
                          `${Math.round(duration/86400)} day(s)`;
      await ctx.reply(`User muted for ${durationStr}.\nReason: ${reason}`);
    } else {
      await ctx.reply("Failed to mute user. Make sure I have the right permissions.");
    }
  });

  // /unmute - Unmute a user (admin/mod only)
  bot.command("unmute", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const chatIdStr = String(ctx.chat.id);
    const callerCanMod = await canUserModerate(ctx, ctx.from.id, chatIdStr);
    if (!callerCanMod) {
      await ctx.reply("Only admins and mods can use this command.");
      return;
    }
    
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo) {
      await ctx.reply("Reply to a user's message to unmute them.");
      return;
    }
    
    const success = await unmuteUser(ctx, replyTo.id);
    if (success) {
      await ctx.reply(`User @${replyTo.username || replyTo.first_name} has been unmuted.`);
    } else {
      await ctx.reply("Failed to unmute user.");
    }
  });

  // /warn - Warn a user
  bot.command("warn", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const chatIdStr = String(ctx.chat.id);
    const callerCanMod = await canUserModerate(ctx, ctx.from.id, chatIdStr);
    if (!callerCanMod) {
      await ctx.reply("Only admins and mods can use this command.");
      return;
    }
    
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo) {
      await ctx.reply("Reply to a user's message to warn them.");
      return;
    }
    
    const reason = ctx.message?.text?.replace(/^\/warn\s*/i, '') || "Breaking community rules";
    
    // Update warn count in database
    await ensureUserModerationStatus(String(replyTo.id), chatIdStr);
    const status = await getUserModerationStatus(String(replyTo.id), chatIdStr);
    const newWarnCount = (status?.warnCount || 0) + 1;
    
    await db.update(userModerationStatus)
      .set({
        warnCount: newWarnCount,
        lastWarnDate: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(
        eq(userModerationStatus.telegramUserId, String(replyTo.id)),
        eq(userModerationStatus.chatId, chatIdStr)
      ));
    
    await incrementModStat(chatIdStr, 'warnCount');
    
    // Auto-mute after 3 warnings
    if (newWarnCount >= 3) {
      const targetIsAdmin = await isUserAdmin(ctx, replyTo.id);
      if (!targetIsAdmin) {
        const warnedUsername = replyTo.username || replyTo.first_name || `User ${replyTo.id}`;
        await muteUser(ctx, replyTo.id, 3600, "3 warnings received", warnedUsername);
        await ctx.reply(`⚠️ @${replyTo.username || replyTo.first_name} - Warning #${newWarnCount}\nReason: ${reason}\n\nYou have been automatically muted for 1 hour due to receiving 3 warnings.`);
      }
    } else {
      await ctx.reply(`⚠️ @${replyTo.username || replyTo.first_name} - Warning #${newWarnCount}/3\nReason: ${reason}\n\n3 warnings = 1 hour mute`);
    }
  });

  // /raidmode - Toggle anti-raid mode (admin only)
  bot.command("raidmode", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const callerIsAdmin = await isUserAdmin(ctx, ctx.from.id);
    if (!callerIsAdmin) {
      await ctx.reply("Only admins can use this command.");
      return;
    }
    
    const chatIdStr = String(ctx.chat.id);
    const args = ctx.message?.text?.split(/\s+/) || [];
    const action = args[1]?.toLowerCase();
    
    // Get current settings
    const settings = await getChatSettings(chatIdStr);
    
    if (action === "on") {
      // Enable raid mode
      const existing = await db.select().from(chatModerationSettings)
        .where(eq(chatModerationSettings.chatId, chatIdStr))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(chatModerationSettings)
          .set({
            raidModeEnabled: true,
            raidModeEnabledAt: sql`CURRENT_TIMESTAMP`,
            raidModeEnabledBy: String(ctx.from.id),
          })
          .where(eq(chatModerationSettings.chatId, chatIdStr));
      } else {
        await db.insert(chatModerationSettings).values({
          chatId: chatIdStr,
          raidModeEnabled: true,
          raidModeEnabledAt: new Date(),
          raidModeEnabledBy: String(ctx.from.id),
        });
      }
      
      // Clear cache to force refresh
      chatSettingsCache.delete(chatIdStr);
      
      await ctx.reply(`🚨 *RAID MODE ACTIVATED*\n\n` +
        `Anti-raid protections enabled:\n` +
        `• New users cannot post links\n` +
        `• Stricter spam thresholds\n` +
        `• Enhanced scam detection\n\n` +
        `Use /raidmode off to disable.`, { parse_mode: "Markdown" });
    } else if (action === "off") {
      // Disable raid mode
      await db.update(chatModerationSettings)
        .set({ raidModeEnabled: false })
        .where(eq(chatModerationSettings.chatId, chatIdStr));
      
      chatSettingsCache.delete(chatIdStr);
      
      await ctx.reply(`✅ Raid mode disabled. Normal moderation settings restored.`);
    } else {
      // Show current status
      await ctx.reply(`*Raid Mode Status:* ${settings.raidMode ? "🚨 ACTIVE" : "✅ Inactive"}\n\n` +
        `Usage:\n` +
        `/raidmode on - Enable anti-raid protections\n` +
        `/raidmode off - Disable anti-raid protections`, { parse_mode: "Markdown" });
    }
  });

  // /modstats - Show moderation statistics (admin only)
  bot.command("modstats", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const callerIsAdmin = await isUserAdmin(ctx, ctx.from.id);
    if (!callerIsAdmin) {
      await ctx.reply("Only admins can view moderation stats.");
      return;
    }
    
    const chatIdStr = String(ctx.chat.id);
    const args = ctx.message?.text?.split(/\s+/) || [];
    const period = args[1]?.toLowerCase() === "week" ? 7 : 1;
    
    const stats = await getModStats(chatIdStr, period);
    const periodLabel = period === 7 ? "This Week" : "Today";
    
    await ctx.reply(`📊 *Moderation Stats - ${periodLabel}*\n\n` +
      `👋 New Joins: ${stats.newJoins}\n` +
      `🚫 Messages Blocked: ${stats.messagesBlocked}\n` +
      `📵 Spam Blocked: ${stats.spamBlocked}\n` +
      `⚠️ Scams Blocked: ${stats.scamsBlocked}\n` +
      `🔗 Links Blocked: ${stats.linksBlocked}\n` +
      `🔇 Users Muted: ${stats.muteCount}\n` +
      `⚠️ Warnings Given: ${stats.warnCount}\n` +
      `🏳️ Flagged for Review: ${stats.flaggedForReview}\n\n` +
      `_Use /modstats week for weekly stats_`, { parse_mode: "Markdown" });
  });

  // /setrole - Set a user's role (admin only)
  bot.command("setrole", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    
    const callerIsAdmin = canManageCommunityTrust(ctx);
    if (!callerIsAdmin) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can change community roles.");
      return;
    }
    
    const replyTo = ctx.message?.reply_to_message?.from;
    const args = ctx.message?.text?.split(/\s+/) || [];
    const role = args[1]?.toLowerCase();
    
    if (!replyTo) {
      await ctx.reply("Reply to a user's message to set their role.\nUsage: /setrole <role>\nRoles: admin, mod, helper, verified, newbie");
      return;
    }
    
    const validRoles = ["admin", "mod", "helper", "verified", "newbie"];
    if (!role || !validRoles.includes(role)) {
      await ctx.reply(`Invalid role. Choose from: ${validRoles.join(", ")}`);
      return;
    }
    
    const chatIdStr = String(ctx.chat.id);
    await ensureUserModerationStatus(String(replyTo.id), chatIdStr);
    
    await db.update(userModerationStatus)
      .set({ role })
      .where(and(
        eq(userModerationStatus.telegramUserId, String(replyTo.id)),
        eq(userModerationStatus.chatId, chatIdStr)
      ));
    
    await ctx.reply(`✅ @${replyTo.username || replyTo.first_name}'s role set to: ${role}`);
  });

  // === COMMUNITY SAAS COMMANDS ===

  // /setup — Multi-step onboarding wizard for new communities (admin only)
  bot.command("setup", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Run /setup in your group chat to configure The Warden for your community!");
      return;
    }
    const adminCheck = await isAdmin(ctx);
    if (!adminCheck) {
      await ctx.reply("Only admins can run the setup wizard.");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    const existing = await getCommunity(chatIdStr);

    if (existing?.isOnboarded) {
      await ctx.reply(
        `This community is already configured!\n\n` +
        `Name: ${existing.displayName}\n` +
        `Nickname: ${existing.botNickname}\n` +
        `Timezone: ${existing.timezone}\n` +
        `Status: ${getStatusLabel(existing)}\n\n` +
        `Use /community to view full config.\n` +
        `Update settings: /setname /setwelcome /setnickname /settimezone`
      );
      return;
    }

    // Create the community trial record immediately so the group is registered
    // even if the wizard is abandoned mid-way
    const chatTitle = (ctx.chat as any)?.title || undefined;
    await ensureCommunity(chatIdStr, chatTitle);

    setupWizardState.set(chatIdStr, { step: 1, initiatorId: ctx.from.id });
    await ctx.reply(
      `THE WARDEN — SETUP\n\n` +
      `I'll walk you through configuring me for your community. Admins only.\n\n` +
      `Your 7-day FREE TRIAL has started!\n\n` +
      `STEP 1 OF 4: What's the name of your community?\n` +
      `(e.g. "Boomerverse", "CryptoHub", "NFT Lounge")\n\n` +
      `Type the name to continue, or /community to skip setup.`
    );
  });

  // /community — View current community config and subscription status
  bot.command("community", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Run /community in your group chat to see its config!");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    const community = await getCommunity(chatIdStr);

    if (!community) {
      await ctx.reply(
        `This group hasn't been set up yet.\n\n` +
        `Run /setup (admin only) to configure The Warden and start your FREE 7-day trial with all 20 features enabled!`
      );
      return;
    }

    const feats = await getFeatureSettings(chatIdStr);
    const enabledFeatures = Object.entries(feats).filter(([, v]) => v).map(([k]) => k);

    await ctx.reply(
      `COMMUNITY CONFIG\n\n` +
      `Name: ${community.displayName}\n` +
      `Bot Nickname: ${community.botNickname}\n` +
      `Timezone: ${community.timezone}\n` +
      `Welcome Message: ${community.welcomeMessage ? "Custom (set)" : "Default rotation"}\n` +
      `Status: ${getStatusLabel(community)}\n\n` +
      `Active features (${enabledFeatures.length}/21): ${enabledFeatures.join(", ")}\n\n` +
      `Manage: /setname /setwelcome /setnickname /settimezone /settings /toggle`
    );
  });

  // /setname [name] — Update community display name
  bot.command("setname", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) { await ctx.reply("Only admins can update community settings."); return; }
    const name = (ctx.match || "").trim();
    if (!name) { await ctx.reply("Usage: /setname Your Community Name"); return; }
    const chatIdStr = ctx.chat.id.toString();
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { displayName: name });
    await ctx.reply(`Community name updated to: ${name}`);
  });

  // /setwelcome [message] — Set a custom welcome message for new members
  bot.command("setwelcome", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) { await ctx.reply("Only admins can update community settings."); return; }
    const message = (ctx.match || "").trim();
    if (!message) {
      await ctx.reply(
        `Usage: /setwelcome Your welcome message\n\n` +
        `Use {name} as a placeholder for the new member's name.\n` +
        `Example: /setwelcome Hey {name}! Welcome to our community! Read the pinned messages.`
      );
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { welcomeMessage: message });
    const preview = message.replace("{name}", ctx.from.first_name || "NewMember");
    await ctx.reply(`Custom welcome message saved!\n\nPreview: "${preview}"`);
  });

  // /setnickname [name] — Set what The Warden calls herself in this group
  bot.command("setnickname", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) { await ctx.reply("Only admins can update community settings."); return; }
    const nickname = (ctx.match || "").trim();
    if (!nickname || nickname.length > 30) {
      await ctx.reply("Usage: /setnickname Nickname (max 30 chars)\nExample: /setnickname Karla");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { botNickname: nickname });
    await ctx.reply(`Got it! I'll go by "${nickname}" in this community from now on.`);
  });

  // /settimezone [tz] — Set timezone for scheduled posts
  bot.command("settimezone", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!(await isAdmin(ctx))) { await ctx.reply("Only admins can update community settings."); return; }
    const tz = (ctx.match || "").trim();
    if (!tz) {
      await ctx.reply(
        `Usage: /settimezone Timezone\n\n` +
        `Common options:\n` +
        `• Australia/Hobart (Tasmania)\n` +
        `• Australia/Sydney (AEST/AEDT)\n` +
        `• America/Los_Angeles (Pacific)\n` +
        `• America/New_York (Eastern)\n` +
        `• Europe/London (GMT/BST)\n` +
        `• Asia/Singapore (SGT)\n` +
        `• UTC`
      );
      return;
    }
    try { Intl.DateTimeFormat(undefined, { timeZone: tz }); } catch {
      await ctx.reply("Invalid timezone. Use standard IANA names like America/New_York or Australia/Sydney.");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { timezone: tz });
    await ctx.reply(`Timezone updated to: ${tz}`);
  });

  // === PER-COMMUNITY BOT ADMIN LIST COMMANDS ===

  // /addadmin — Add a user to this community's bot admin override list (group owner only)
  bot.command("addadmin", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!(await isOwner(ctx))) { await ctx.reply("Only the group owner can manage the bot admin list."); return; }
    const chatIdStr = ctx.chat.id.toString();

    let targetUserId: string | undefined;
    let targetUsername: string | undefined;
    let targetName: string | undefined;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetName = ctx.message.reply_to_message.from.first_name || targetUsername;
    } else {
      const mention = (ctx.match || "").trim().match(/@(\w+)/);
      if (mention) {
        await ctx.reply(`To add @${mention[1]} as a bot admin, please reply to one of their messages with /addadmin`);
      } else {
        await ctx.reply("Usage: Reply to a user's message with /addadmin\nThis grants them bot admin privileges for The Warden commands in this group.");
      }
      return;
    }
    if (!targetUserId) { await ctx.reply("Couldn't identify the user."); return; }

    await ensureCommunity(chatIdStr);
    const community = await getCommunity(chatIdStr);
    const currentList = community?.botAdminIds || [];
    if (currentList.includes(targetUserId)) {
      await ctx.reply(`${targetName || targetUsername} is already a bot admin.`);
      return;
    }
    const newList = [...currentList, targetUserId];
    await updateCommunity(chatIdStr, { botAdminIds: newList });
    communityCache.delete(chatIdStr);
    await ctx.reply(`${targetName || "@" + targetUsername} added to the bot admin list. They can now run admin The Warden commands.`);
  });

  // /removeadmin — context-aware:
  //   In a group: reply to a message to remove that person (group owner only)
  //   In DM:      /removeadmin [chatId] [userId]  (global owner only)
  bot.command("removeadmin", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;

    if (ctx.chat.type === "private") {
      // Remote mode — owner DM
      if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
      const parts = (ctx.match || "").trim().split(/\s+/);
      const chatId = parts[0]; const userId = parts[1];
      if (!chatId || !userId) {
        await ctx.reply("Usage: /removeadmin -100123456789 123456789\n\nGet chat IDs with /communities");
        return;
      }
      const existing = await getCommunity(chatId);
      if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}`); return; }
      const currentList = existing.botAdminIds || [];
      if (!currentList.includes(userId)) {
        await ctx.reply(`User ${userId} is not in the bot admin list for "${existing.displayName}".`);
        return;
      }
      await updateCommunity(chatId, { botAdminIds: currentList.filter(id => id !== userId) });
      communityCache.delete(chatId);
      if (botInstance) {
        try { await botInstance.api.sendMessage(parseInt(chatId), `User ID ${userId} has been removed from the Warden admin access by the owner.`); } catch {}
      }
      await ctx.reply(`✅ User ${userId} removed from bot admins in "${existing.displayName}" (${chatId})`);
      return;
    }

    // In-group mode — reply-based
    if (!(await isOwner(ctx))) { await ctx.reply("Only the group owner can manage the bot admin list."); return; }
    const chatIdStr = ctx.chat.id.toString();
    let targetUserId: string | undefined;
    let targetName: string | undefined;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetName = ctx.message.reply_to_message.from.first_name || ctx.message.reply_to_message.from.username;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /removeadmin\nOr from DM: /removeadmin [chatId] [userId]");
      return;
    }
    if (!targetUserId) { await ctx.reply("Couldn't identify the user."); return; }
    const community = await getCommunity(chatIdStr);
    const currentList = community?.botAdminIds || [];
    if (!currentList.includes(targetUserId)) {
      await ctx.reply(`${targetName} is not in the bot admin list.`);
      return;
    }
    await updateCommunity(chatIdStr, { botAdminIds: currentList.filter(id => id !== targetUserId) });
    communityCache.delete(chatIdStr);
    await ctx.reply(`${targetName} removed from the bot admin list.`);
  });

  // /listadmins — context-aware:
  //   In a group: shows bot admins for this group
  //   In DM:      /listadmins [chatId]  (global owner only)
  bot.command("listadmins", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;

    if (ctx.chat.type === "private") {
      // Remote mode — owner DM
      if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
      const chatId = (ctx.match || "").trim();
      if (!chatId) { await ctx.reply("Usage: /listadmins -100123456789\n\nGet chat IDs with /communities"); return; }
      const existing = await getCommunity(chatId);
      if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}`); return; }
      const list = existing.botAdminIds || [];
      if (list.length === 0) {
        await ctx.reply(`"${existing.displayName}" (${chatId}) has no bot admin overrides.\n\nOnly Telegram admins can run The Warden commands there.`);
        return;
      }
      await ctx.reply(
        `BOT ADMINS — "${existing.displayName}" (${chatId})\n\n` +
        list.map((id, i) => `${i + 1}. User ID: ${id}`).join("\n") +
        `\n\nAdd: /setadmin ${chatId} [userId]\nRemove: /removeadmin ${chatId} [userId]\nReplace all: /changeadmin ${chatId} [userId]`
      );
      return;
    }

    // In-group mode
    const chatIdStr = ctx.chat.id.toString();
    const community = await getCommunity(chatIdStr);
    if (!community || community.botAdminIds.length === 0) {
      await ctx.reply(
        "No custom bot admins set for this group.\n\n" +
        "All Telegram admins and the group owner can run The Warden commands by default.\n\n" +
        "Commands:\n/addadmin — reply to a message to add someone\n/changeadmin — reply to make someone the new admin"
      );
      return;
    }
    const list = community.botAdminIds.map((id, i) => `${i + 1}. User ID: ${id}`).join("\n");
    await ctx.reply(
      `BOT ADMIN LIST (${community.botAdminIds.length})\n\n${list}\n\n` +
      `These users can run The Warden admin commands without Telegram admin status.\n\n` +
      `/addadmin — add someone · /removeadmin — remove someone · /changeadmin — swap to new person`
    );
  });

  // /changeadmin — Replace the entire bot admin list with one new person
  //   In a group: reply to a message (group owner only)
  //   In DM:      /changeadmin [chatId] [userId]  (global owner only)
  bot.command("changeadmin", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;

    if (ctx.chat.type === "private") {
      // Remote mode — owner DM
      if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
      const parts = (ctx.match || "").trim().split(/\s+/);
      const chatId = parts[0]; const userId = parts[1];
      if (!chatId || !userId) {
        await ctx.reply("Usage: /changeadmin -100123456789 123456789\n\nReplaces ALL current bot admins with just this user.\nGet chat IDs with /communities");
        return;
      }
      const existing = await getCommunity(chatId);
      if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}`); return; }
      await updateCommunity(chatId, { botAdminIds: [userId] });
      communityCache.delete(chatId);
      if (botInstance) {
        try { await botInstance.api.sendMessage(parseInt(chatId), `Bot admin access has been updated by the owner. User ID ${userId} is now the sole bot admin for this community.`); } catch {}
      }
      await ctx.reply(`✅ Bot admin for "${existing.displayName}" (${chatId}) changed to User ID ${userId}\n\nAll previous admins removed.`);
      return;
    }

    // In-group mode — reply-based
    if (!(await isOwner(ctx))) { await ctx.reply("Only the group owner can change the bot admin."); return; }
    const chatIdStr = ctx.chat.id.toString();
    let targetUserId: string | undefined;
    let targetName: string | undefined;
    let targetUsername: string | undefined;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetName = ctx.message.reply_to_message.from.first_name || targetUsername;
    } else {
      await ctx.reply(
        "Usage: Reply to any message from the new admin and type /changeadmin\n\n" +
        "This replaces the current bot admin with that person.\n" +
        "Use /addadmin if you want to add them alongside existing admins instead."
      );
      return;
    }
    if (!targetUserId) { await ctx.reply("Couldn't identify the user."); return; }
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { botAdminIds: [targetUserId] });
    communityCache.delete(chatIdStr);
    await ctx.reply(
      `${targetName || "@" + targetUsername} is now the bot admin for this group.\n\n` +
      `They can use all The Warden admin commands. Previous bot admins (if any) have been replaced.\n\n` +
      `Use /addadmin to add more admins alongside them.`
    );
  });

  // === OWNER MANAGEMENT COMMANDS (usable from any chat by GLOBAL_OWNER_USER_ID) ===

  // /communities — List all registered communities
  bot.command("communities", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    try {
      const allCommunities = await db.select().from(communities).orderBy(desc(communities.createdAt));
      if (allCommunities.length === 0) {
        await ctx.reply("No communities registered yet. Groups create a record when an admin runs /setup.");
        return;
      }
      const lines = allCommunities.map(c => {
        const record = mapCommunityRow(c);
        return `• ${record.displayName} (${record.chatId})\n  Status: ${getStatusLabel(record)}`;
      });
      const chunks: string[] = [];
      let current = `REGISTERED COMMUNITIES (${allCommunities.length} total)\n\n`;
      for (const line of lines) {
        if ((current + line + "\n\n").length > 3800) { chunks.push(current); current = ""; }
        current += line + "\n\n";
      }
      if (current) chunks.push(current);
      for (const chunk of chunks) await ctx.reply(chunk.trim());
    } catch (err) {
      console.error("Error listing communities:", err);
      await ctx.reply("Error fetching community list.");
    }
  });

  // /activate [chatId] — Mark a community as paid/active
  bot.command("activate", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    const chatId = (ctx.match || "").trim();
    if (!chatId) { await ctx.reply("Usage: /activate -100123456789"); return; }
    const existing = await getCommunity(chatId);
    if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}\n\nRun /communities to see all registered communities.`); return; }
    await activateCommunity(chatId);
    await ctx.reply(`Community "${existing.displayName}" (${chatId}) activated.`);
  });

  // /deactivate [chatId] — Downgrade to free tier
  bot.command("deactivate", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    const chatId = (ctx.match || "").trim();
    if (!chatId) { await ctx.reply("Usage: /deactivate -100123456789"); return; }
    const existing = await getCommunity(chatId);
    if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}`); return; }
    await deactivateCommunity(chatId);
    await ctx.reply(`Community "${existing.displayName}" (${chatId}) downgraded to free tier.`);
  });

  // /makefree [chatId] — Grant complimentary (free full access) to a community — no payment required
  // Use this to gift full access to communities you want to support for free.
  // Unlike /activate (which marks them as "paid"), this marks them as "complimentary".
  bot.command("makefree", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    const chatId = (ctx.match || "").trim();
    if (!chatId) {
      await ctx.reply(
        "Usage: /makefree -100123456789\n\n" +
        "Grants this community full access at no cost (Complimentary tier).\n" +
        "Use /activate for paid communities, /makefree for gifted ones.\n" +
        "Get chat IDs with /communities"
      );
      return;
    }
    const existing = await getCommunity(chatId);
    if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}\n\nUse /communities to list all groups.`); return; }
    if (existing.status === "complimentary") {
      await ctx.reply(`"${existing.displayName}" is already on the Complimentary tier.`);
      return;
    }
    await makeComplimentary(chatId);
    await ctx.reply(
      `✅ "${existing.displayName}" (${chatId}) set to COMPLIMENTARY.\n\n` +
      `Full access granted — no payment required.\n` +
      `To revert: /deactivate ${chatId}`
    );
  });

  // /extendtrial [chatId] [days] — Extend a community's trial period
  bot.command("extendtrial", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    const parts = (ctx.match || "").trim().split(/\s+/);
    const chatId = parts[0];
    const days = parseInt(parts[1] || "7");
    if (!chatId || isNaN(days) || days < 1) { await ctx.reply("Usage: /extendtrial -100123456789 7"); return; }
    const existing = await getCommunity(chatId);
    if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}`); return; }
    const baseDate = existing.trialExpiresAt && existing.trialExpiresAt > new Date() ? existing.trialExpiresAt : new Date();
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    await updateCommunity(chatId, { status: "trial", trialExpiresAt: newExpiry });
    communityCache.delete(chatId);
    if (botInstance) {
      try { await botInstance.api.sendMessage(parseInt(chatId), `Your The Warden trial has been extended by ${days} days! New expiry: ${newExpiry.toDateString()}.`); } catch {}
    }
    await ctx.reply(`Trial extended for "${existing.displayName}" (${chatId}) by ${days} days.\nNew expiry: ${newExpiry.toDateString()}`);
  });

  // /bangroup [chatId] — Ban a community (bot goes silent)
  // /communityinfo [chatId] — Full details for a specific community
  bot.command("communityinfo", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    const chatId = (ctx.match || "").trim();
    if (!chatId) { await ctx.reply("Usage: /communityinfo -100123456789"); return; }
    const community = await getCommunity(chatId);
    if (!community) { await ctx.reply(`No community found with chatId: ${chatId}`); return; }
    const feats = await getFeatureSettings(chatId);
    const enabledCount = Object.values(feats).filter(Boolean).length;
    await ctx.reply(
      `COMMUNITY DETAILS\n\n` +
      `Chat ID: ${community.chatId}\n` +
      `Name: ${community.displayName}\n` +
      `Bot Nickname: ${community.botNickname}\n` +
      `Timezone: ${community.timezone}\n` +
      `Welcome Message: ${community.welcomeMessage || "Default"}\n` +
      `Status: ${getStatusLabel(community)}\n` +
      `Trial Expires: ${community.trialExpiresAt ? community.trialExpiresAt.toDateString() : "N/A"}\n` +
      `Onboarded: ${community.isOnboarded ? "Yes" : "No"}\n` +
      `Active Features: ${enabledCount}/20`
    );
  });

  // /leavegroup [chatId] — Force the bot to leave a group remotely (owner DM only)
  bot.command("leavegroup", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    const chatId = (ctx.match || "").trim();
    if (!chatId) { await ctx.reply("Usage: /leavegroup -100123456789\n\nGet chat IDs with /communities"); return; }
    const existing = await getCommunity(chatId);
    try {
      if (botInstance) {
        try {
          await botInstance.api.sendMessage(
            parseInt(chatId),
            `The Warden is leaving this group by owner request. Goodbye! 👋`
          );
        } catch { /* Group may already be inaccessible */ }
        await botInstance.api.leaveChat(parseInt(chatId));
      }
      // Mark as banned in DB so it can't re-activate
      if (existing) {
        await updateCommunity(chatId, { status: "banned" });
        communityCache.delete(chatId);
      }
      await ctx.reply(`✅ Bot has left group: ${existing?.displayName || chatId} (${chatId})`);
    } catch (err) {
      console.error("Error leaving group:", err);
      await ctx.reply(`Failed to leave group ${chatId}. The bot may have already left, or the chat ID is wrong.`);
    }
  });

  // /setadmin [chatId] [userId] — Remotely add a bot admin to any community (owner DM)
  bot.command("setadmin", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    const parts = (ctx.match || "").trim().split(/\s+/);
    const chatId = parts[0];
    const userId = parts[1];
    if (!chatId || !userId) {
      await ctx.reply("Usage: /setadmin -100123456789 123456789\n\nGet chat IDs with /communities");
      return;
    }
    const existing = await getCommunity(chatId);
    if (!existing) { await ctx.reply(`No community found with chatId: ${chatId}\n\nUse /communities to list all groups.`); return; }
    const currentList = existing.botAdminIds || [];
    if (currentList.includes(userId)) {
      await ctx.reply(`User ${userId} is already a bot admin in "${existing.displayName}".`);
      return;
    }
    await updateCommunity(chatId, { botAdminIds: [...currentList, userId] });
    communityCache.delete(chatId);
    if (botInstance) {
      try { await botInstance.api.sendMessage(parseInt(chatId), `User ID ${userId} has been added as a the Warden admin for this community by the owner.`); } catch {}
    }
    await ctx.reply(`✅ User ${userId} added as bot admin in "${existing.displayName}" (${chatId})`);
  });

  // /ownerhelp — Show every global owner command (owner DM only)
  bot.command("ownerhelp", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) { await ctx.reply("Owner-only command."); return; }
    await ctx.reply(
      `THE WARDEN — GLOBAL OWNER COMMANDS\n` +
      `All commands work in DMs with the bot.\n\n` +
      `━━ COMMUNITY LIST ━━\n` +
      `/communities — List all registered groups\n` +
      `/communityinfo [chatId] — Full details for one group\n\n` +
      `━━ SUBSCRIPTION CONTROL ━━\n` +
      `/activate [chatId] — Mark as PAID — full access (they've paid)\n` +
      `/makefree [chatId] — Mark as COMPLIMENTARY — full access (your gift, no payment)\n` +
      `/deactivate [chatId] — Downgrade to free tier (basic safety only)\n` +
      `/extendtrial [chatId] [days] — Extend a trial period\n` +
      `/bangroup [chatId] — Silence bot in a group (stays but ignores everything)\n` +
      `/leavegroup [chatId] — Remove bot from a group entirely\n\n` +
      `Tiers: ACTIVE (paid) · COMPLIMENTARY (gifted) · TRIAL · FREE (limited) · BANNED\n\n` +
      `━━ ADMIN MANAGEMENT ━━\n` +
      `/setadmin [chatId] [userId] — Add a bot admin to any group\n` +
      `/removeadmin [chatId] [userId] — Remove a bot admin from any group\n` +
      `/changeadmin [chatId] [userId] — Replace ALL bot admins with one new person\n` +
      `/listadmins [chatId] — View bot admins for any group\n\n` +
      `In-group (reply-based): /addadmin · /removeadmin · /changeadmin · /listadmins\n\n` +
      `━━ TRUST & MODERATION ━━\n` +
      `/trustset @user full|trusted|normal|restricted — Set community trust (Boss/TreeFitty only)\n` +
      `/trustremove @user — Remove trust from a user\n` +
      `/violations — View violation log\n` +
      `/banlist — View ban/kick history\n\n` +
      `To get a group's chatId, use /communities first.`
    );
  });

  // === END MODERATION COMMANDS ===

  // === MESSAGE EDIT TRACKING (New User Security) ===
  // Scammers sometimes post innocent messages then edit them to add scams/spam/links
  
  // Handle edited text messages
  bot.on("edited_message:text", async (ctx) => {
    if (!ctx.editedMessage || !ctx.editedMessage.from || !ctx.editedMessage.chat) return;
    // Check if edit tracking is enabled
    const _editChatIdStr = ctx.editedMessage.chat.id.toString();
    const _editFeats = await getFeatureSettings(_editChatIdStr);
    if (!_editFeats.edits) return;
    
    const chatId = ctx.editedMessage.chat.id;
    const chatIdStr = String(chatId);
    const userId = ctx.editedMessage.from.id;
    const userIdStr = String(userId);
    const messageId = String(ctx.editedMessage.message_id);
    const newText = ctx.editedMessage.text || "";
    const username = ctx.editedMessage.from.username || "";
    
    // Only track group chats
    if (chatId > 0) return;
    
    // Skip admin messages
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (member.status === "administrator" || member.status === "creator") return;
    } catch { /* continue with check */ }
    
    // Check if user is new (< 24 hours or < 5 messages)
    const userIsNew = await isNewUser(chatIdStr, userIdStr);
    if (!userIsNew) return;
    
    // Retrieve original content from database (if tracked)
    const originalRecord = await getTrackedMessage(messageId, chatIdStr);
    const originalContent = originalRecord?.originalContent || undefined;
    
    // New user edited a message - apply full scam/spam/link checks
    const lowerText = newText.toLowerCase();
    
    // Check for scam/phishing content in edited message
    const { isScam, flags } = detectScam(newText, username);
    
    // Check for links (new users can't post links)
    const hasLink = /https?:\/\/|t\.me\/|@\w+/i.test(newText);
    
    // Check for seed phrase patterns
    const hasSeedPhrase = detectSeedPhrase(newText);
    
    // Check for wallet drainer phrases
    const drainerPhrases = ["verify wallet", "sync wallet", "connect wallet urgently", "wallet validation", "claim airdrop"];
    const hasWalletDrainer = drainerPhrases.some(phrase => lowerText.includes(phrase));
    
    // Check for contract addresses
    const hasContractAddress = /0x[a-fA-F0-9]{40}/i.test(newText);
    
    let shouldDelete = false;
    let violationType = "";
    let actionTaken = "";
    
    if (isScam && flags.length >= 2) {
      shouldDelete = true;
      violationType = "edit_scam";
      actionTaken = "deleted";
    } else if (hasLink) {
      shouldDelete = true;
      violationType = "edit_link";
      actionTaken = "deleted";
    } else if (hasSeedPhrase) {
      shouldDelete = true;
      violationType = "edit_seedphrase";
      actionTaken = "deleted";
    } else if (hasWalletDrainer) {
      shouldDelete = true;
      violationType = "edit_drainer";
      actionTaken = "deleted";
    } else if (hasContractAddress) {
      shouldDelete = true;
      violationType = "edit_contract";
      actionTaken = "deleted";
    }
    
    if (shouldDelete) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.editedMessage.message_id);
        // Log with both original and edited content
        await logViolation(chatIdStr, userIdStr, username, violationType, originalContent, newText, actionTaken);
        await incrementModStat(chatIdStr, 'scamsBlocked');
        
        await ctx.api.sendMessage(chatId, 
          `Caught that edit! New members can't sneak scam content in by editing old messages.\n\n` +
          `@${username || ctx.editedMessage.from.first_name || "User"}, your edited message was removed. ` +
          `Nice try, but The Warden's watching.`
        );
        
        console.log(`Blocked suspicious edit from new user ${username || userId}: ${violationType}`);
      } catch (e) {
        console.log("Couldn't delete suspicious edit:", e);
      }
    }
  });

  // Handle edited captions on photos/documents (new users only)
  bot.on("edited_message:caption", async (ctx) => {
    if (!ctx.editedMessage || !ctx.editedMessage.from || !ctx.editedMessage.chat) return;
    
    const chatId = ctx.editedMessage.chat.id;
    const chatIdStr = String(chatId);
    const userId = ctx.editedMessage.from.id;
    const userIdStr = String(userId);
    const caption = ctx.editedMessage.caption || "";
    const username = ctx.editedMessage.from.username || "";
    
    // Only track group chats
    if (chatId > 0) return;
    
    // Skip admin messages
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (member.status === "administrator" || member.status === "creator") return;
    } catch { /* continue with check */ }
    
    // Check if user is new
    const userIsNew = await isNewUser(chatIdStr, userIdStr);
    if (!userIsNew) return;
    
    // Check caption for malicious content
    const lowerCaption = caption.toLowerCase();
    const { isScam, flags } = detectScam(caption, username);
    const hasLink = /https?:\/\/|t\.me\/|@\w+/i.test(caption);
    const hasWalletDrainer = ["verify wallet", "sync wallet", "connect wallet urgently"].some(p => lowerCaption.includes(p));
    const hasContractAddress = /0x[a-fA-F0-9]{40}/i.test(caption);
    
    let shouldDelete = false;
    let violationType = "";
    
    if ((isScam && flags.length >= 2) || hasLink || hasWalletDrainer || hasContractAddress) {
      shouldDelete = true;
      violationType = "edit_caption";
    }
    
    if (shouldDelete) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.editedMessage.message_id);
        await logViolation(chatIdStr, userIdStr, username, violationType, undefined, caption, "deleted");
        await incrementModStat(chatIdStr, 'scamsBlocked');
        await ctx.api.sendMessage(chatId, 
          `Caught that caption edit! New members can't sneak scam content in by editing captions.\n` +
          `@${username || ctx.editedMessage.from.first_name || "User"}, nice try but The Warden's watching.`
        );
      } catch (e) {
        console.log("Couldn't delete suspicious caption edit:", e);
      }
    }
  });

  // === NEW MEMBER HANDLER ===
  bot.on("message:new_chat_members", async (ctx) => {
    for (const member of ctx.message.new_chat_members) {
      const name = member.first_name || "friend";
      const username = member.username || "";
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
      const chatId = ctx.chat.id;
      const chatIdStr = chatId.toString();
      const newMemberId = member.id.toString();

      // Fast human acknowledgement first. The heavier security/profile checks below
      // can involve several API/database calls; new humans should still hear from
      // the Warden immediately rather than standing at the gate in silence.
      if (!member.is_bot) {
        try {
          await ctx.reply(`${memberLabel(member)} — saw you come through. Welcome. I'm the Warden. Give me a moment to check the gate log; I don't leave new arrivals standing around.`);
        } catch { /* a later welcome/verification message will still be attempted */ }
      }

      const launchRole = staticRoleForUserId(member.id);
      const priorTrustRows = member.is_bot ? [] : await db.select().from(trustScores)
        .where(and(eq(trustScores.telegramUserId, newMemberId), eq(trustScores.chatId, chatIdStr))).limit(1);
      const isFirstCommunityJoin = priorTrustRows.length === 0;
      if (!member.is_bot && isFirstCommunityJoin) {
        await ensureTrustRecord(newMemberId, chatIdStr, username, member.first_name || name);
      }
      const launchTrusted = launchRole === "boss" || launchRole === "community_leader" || launchRole === "trusted_mod";

      const _earlyFeats = await getFeatureSettings(chatIdStr);

      // === BOT ADDED TO THE GROUP — BOSS / COMMUNITY LEADER ONLY ===
      //
      // Rule: only @aussieboomer or @TreeFitty may add an extra bot to this community. Anyone
      // else's bot is removed immediately, whatever it's called.
      //
      // This is stricter than name-matching for a reason. Telegram has no
      // verified badge for bots, so a name proves nothing — and a bot in the
      // group can read every message and post to everyone the moment it lands.
      // "Was it added by an authorised numeric user ID?" is a question with a real answer.
      // "Does the name look dodgy?" is a guess.
      //
      // The person who added them is ctx.from on this update.
      if (member.is_bot && member.id !== ctx.me.id) {
        const addedByOwner = canManageExtraBots(ctx);
        const adderName = ctx.from?.username
          ? `@${ctx.from.username}`
          : (ctx.from?.first_name || "someone");

        try {
          if (addedByOwner) {
            // The Boss or Community Leader added it deliberately. Note it and leave it alone.
            await ctx.reply(
              `Authorised bot added by ${adderName}: @${username || member.id}\n\n` +
              `Left in place. Recorded.`
            );
            await logViolation(chatIdStr, newMemberId, username, "bot_added_by_owner",
              username, "Added by Boss/Community Leader — permitted", "allow");
          } else {
            // Anyone else. Out it goes.
            await ctx.api.banChatMember(chatId, member.id);

            const nameRisk = isSuspiciousBotName(username);
            const admins = await ctx.api.getChatAdministrators(chatId);
            const mentions = admins.filter(a => !a.user.is_bot && a.user.username)
              .slice(0, 3).map(a => `@${a.user.username}`).join(" ");

            await ctx.reply(
              `Removed a bot ${mentions}\n\n` +
              `Bot: @${username || member.id}\n` +
              `Added by: ${adderName}\n` +
              `REASON: only @aussieboomer or @TreeFitty may add bots to this group.` +
              (nameRisk ? `\nAlso flagged: ${nameRisk}` : ``) +
              `\n\nA bot in here can read every message and post to everyone. ` +
              `If this one was wanted, @aussieboomer or @TreeFitty can add it.`
            );

            await logViolation(chatIdStr, newMemberId, username, "unauthorised_bot",
              `Added by ${adderName} (${ctx.from?.id})`,
              nameRisk || "Bot added by someone other than Boss/Community Leader", "ban");
            await incrementModStat(chatIdStr, 'scamsBlocked');
          }
        } catch {
          // Couldn't remove it — almost always missing ban permission.
          try {
            await ctx.reply(
              `A bot was added and I couldn't remove it: @${username || member.id}\n\n` +
              `Added by: ${adderName}\n\n` +
              `I need ban permission to enforce this. Remove the bot manually and ` +
              `check my admin rights.`
            );
          } catch { /* can't post either */ }
        }
        continue;
      }

      // === GLOBAL BAN CHECK — runs before anything else ===
      // Someone banned in one of my groups doesn't get a fresh start in another.
      if (_earlyFeats.crossBan && !member.is_bot && await isGloballyBanned(newMemberId)) {
        try {
          await ctx.api.banChatMember(chatId, member.id);
          await ctx.reply(
            `${fullName || name} was removed on arrival — they are banned in another ` +
            `community I manage.`
          );
          await logViolation(chatIdStr, newMemberId, username || fullName, "global_ban",
            "", "Previously banned in another managed group", "ban");
          await incrementModStat(chatIdStr, 'scamsBlocked');
        } catch { /* missing permission */ }
        continue;
      }

      // === ACCOUNT AGE GATE — remove brand-new Telegram accounts ===
      if (_earlyFeats.accountAge && !member.is_bot && !launchTrusted && isNewAccountHeuristic(member.id)) {
        try {
          await ctx.api.banChatMember(chatId, member.id);
          await ctx.api.unbanChatMember(chatId, member.id);
          await ctx.reply(
            `${fullName || name} was removed — their Telegram account appears to have been created very recently.\n\n` +
            `To protect this community, brand-new accounts cannot join immediately. ` +
            `Please try again in a few days.`
          );
          await logViolation(chatIdStr, newMemberId, username || fullName, "account_age", "High user ID heuristic", "Account created very recently", "kick");
        } catch (e) { console.log("[AccountAge] Couldn't kick new account:", e); }
        continue;
      }

      // === RAID DETECTION ===
      const _raidFeats = await getFeatureSettings(chatIdStr);
      if (!_raidFeats.raid || launchTrusted) {
        // Raid feature off — skip raid lockdown, still allow welcome flow below
      } else {
      const raidCheck = await trackJoinForRaid(chatIdStr, newMemberId);
      if (raidCheck.isRaid) {
        // First time hitting raid threshold - alert admins
        if (raidCheck.joinCount === RAID_THRESHOLD) {
          try {
            const admins = await ctx.api.getChatAdministrators(chatId);
            const adminMentions = admins
              .filter(a => !a.user.is_bot)
              .slice(0, 3)
              .map(a => a.user.username ? `@${a.user.username}` : a.user.first_name)
              .join(", ");
            
            await ctx.reply(
              `RAID ALERT ${adminMentions}\n\n` +
              `${raidCheck.joinCount} users joined in the last 2 minutes!\n\n` +
              `LOCKDOWN MODE ACTIVATED - New users are restricted for 5 minutes.\n` +
              `Use /unlock to end lockdown early.`,
              { parse_mode: "Markdown" }
            );
          } catch (e) {
            console.log("Couldn't send raid alert:", e);
          }
        }
        
        // ENFORCE LOCKDOWN - Restrict new users during raid
        try {
          const lockInfo = await stateGet<{ active: boolean; until: number } | null>(KEYS.lockdown(chatIdStr), null);
          if (lockInfo) {
            // Restrict user until lockdown ends
            const untilDate = Math.floor(lockInfo.until / 1000);
            await ctx.api.restrictChatMember(chatId, member.id, {
              can_send_messages: false,
              can_send_audios: false,
              can_send_documents: false,
              can_send_photos: false,
              can_send_videos: false,
              can_send_video_notes: false,
              can_send_voice_notes: false,
              can_send_polls: false,
              can_send_other_messages: false,
              can_add_web_page_previews: false
            }, { until_date: untilDate });
            
            // Silent - don't spam during raids
            console.log(`Restricted user ${username || newMemberId} during raid lockdown`);
          }
        } catch (e) {
          console.log("Couldn't restrict user during lockdown:", e);
        }
      }
      
      } // end raid feature block
      // Check if currently in lockdown (even if this join didn't trigger it)
      if (_raidFeats.raid && !launchTrusted && await isInLockdown(chatIdStr)) {
        try {
          const lockInfo = await stateGet<{ active: boolean; until: number } | null>(KEYS.lockdown(chatIdStr), null);
          if (lockInfo) {
            const untilDate = Math.floor(lockInfo.until / 1000);
            await ctx.api.restrictChatMember(chatId, member.id, {
              can_send_messages: false,
              can_send_audios: false,
              can_send_documents: false,
              can_send_photos: false,
              can_send_videos: false,
              can_send_video_notes: false,
              can_send_voice_notes: false,
              can_send_polls: false,
              can_send_other_messages: false,
              can_add_web_page_previews: false
            }, { until_date: untilDate });
            
            // Public warning (only every 5th user to avoid spam during raid)
            const joins = await stateGet<JoinEvent[]>(KEYS.joins(chatIdStr), []);
            if (joins.length % 5 === 0) {
              const remainingMs = lockInfo.until - Date.now();
              const remainingMin = Math.max(1, Math.ceil(remainingMs / 60000));
              await ctx.reply(
                `RAID LOCKDOWN WARNING\n\n` +
                `User: ${username ? `@${username}` : fullName}\n` +
                `REASON: Chat is in lockdown mode due to suspected raid\n\n` +
                `ACTION: Temporarily restricted for ${remainingMin} minute${remainingMin > 1 ? 's' : ''}\n` +
                `You'll be able to chat once lockdown ends.`
              );
            }
            
            await logViolation(chatIdStr, newMemberId, username || fullName, "raid_lockdown", "Joined during raid", "Restricted during lockdown", "restrict");
          }
        } catch (e) {
          console.log("Couldn't restrict user during active lockdown:", e);
        }
      }
      
      // === ADMIN IMPERSONATION DETECTION ===
      if (_raidFeats.impersonation && username && !launchTrusted) {
        try {
          // Get or refresh admin cache
          const cached = adminCache.get(chatIdStr);
          let adminUsernames: string[] = [];
          
          if (!cached || Date.now() - cached.lastUpdated > ADMIN_CACHE_TTL) {
            const admins = await ctx.api.getChatAdministrators(chatId);
            adminUsernames = admins
              .filter(a => !a.user.is_bot && a.user.username)
              .map(a => a.user.username!);
            adminCache.set(chatIdStr, { usernames: adminUsernames, lastUpdated: Date.now() });
          } else {
            adminUsernames = cached.usernames;
          }
          
          const impersonationCheck = checkAdminImpersonation(username, adminUsernames);
          
          if (impersonationCheck.isImpersonation) {
            // Add offense to mute system (progressive punishment)
            const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, member.id);
            const adminMentions = adminUsernames.slice(0, 3).map(u => `@${u}`).join(", ");
            const reason = `Username similar to admin @${impersonationCheck.similarTo} (${Math.round(impersonationCheck.similarity * 100)}% match)`;
            
            if (shouldBan) {
              // 4th offense = permanent ban
              await ctx.api.banChatMember(chatId, member.id);
              
              const banMessage = formatWarning({
                type: "impersonation",
                username: `@${username}`,
                offenseCount,
                reason,
                action: "PERMANENTLY BANNED"
              });
              
              await ctx.reply(`${adminMentions}\n\n${banMessage}\n\nPotential scammer removed from community.`);
              await logViolation(chatIdStr, newMemberId, username, "impersonation", username, reason, "ban");
            } else {
              // Mute the impersonator
              const untilDate = Math.floor(Date.now() / 1000) + muteSeconds;
              await ctx.api.restrictChatMember(chatId, member.id, {
                can_send_messages: false,
                can_send_audios: false,
                can_send_documents: false,
                can_send_photos: false,
                can_send_videos: false,
                can_send_video_notes: false,
                can_send_voice_notes: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false
              }, { until_date: untilDate });
              
              const warningMessage = formatWarning({
                type: "impersonation",
                username: `@${username}`,
                offenseCount,
                reason,
                action: `Muted for ${formatDuration(muteSeconds)}`
              });
              
              await ctx.reply(`${adminMentions}\n\n${warningMessage}\n\nThis could be a scammer!`);
              await logViolation(chatIdStr, newMemberId, username, "impersonation", username, reason, "mute");
            }
            
            await incrementModStat(chatIdStr, 'scamsBlocked');
          }
        } catch (e) {
          console.log("Couldn't check impersonation:", e);
        }
      }
      
      // === NEW ACCOUNT WARNING ===
      // Track first-seen time in community profile for new user monitoring
      try {
        const existingProfile = await db.select()
          .from(communityProfiles)
          .where(and(
            eq(communityProfiles.telegramUserId, newMemberId),
            eq(communityProfiles.chatId, chatIdStr)
          ))
          .limit(1);
        
        if (existingProfile.length === 0) {
          // Brand new user - create profile with firstSeen timestamp (createdAt is auto)
          await db.insert(communityProfiles).values({
            telegramUserId: newMemberId,
            username: username || null,
            firstName: fullName || name,
            chatId: chatIdStr
          }).onConflictDoNothing();
        }
      } catch (e) {
        console.log("Error tracking new user:", e);
      }

      // Check for contract addresses in username or name
      // Ethereum/Base pattern: 0x followed by 40 hex chars
      // Also check for partial addresses that scammers use
      const contractAddressPattern = /0x[a-fA-F0-9]{8,40}/i;
      const checkStrings = [username, fullName, member.first_name || "", member.last_name || ""];
      const hasContractAddress = checkStrings.some(str => contractAddressPattern.test(str));
      
      if (hasContractAddress && !launchTrusted) {
        try {
          // Kick user with contract address in name
          await ctx.api.banChatMember(chatId, member.id);
          // Immediately unban so they can rejoin with a proper name
          await ctx.api.unbanChatMember(chatId, member.id);
          
          // Notify admins
          const admins = await ctx.api.getChatAdministrators(chatId);
          const adminMentions = admins
            .filter(a => !a.user.is_bot)
            .slice(0, 3)
            .map(a => a.user.username ? `@${a.user.username}` : a.user.first_name)
            .join(", ");
          
          await ctx.reply(
            `🚫 *BLOCKED* ${adminMentions}\n\n` +
            `User with contract address in name was removed:\n` +
            `Name: ${fullName}\n` +
            `Username: @${username || "none"}\n\n` +
            `The Warden doesn't play with scammers!`,
            { parse_mode: "Markdown" }
          );
          
          await incrementModStat(chatIdStr, 'scamsBlocked');
          continue; // Skip rest of welcome for this blocked user
        } catch (kickErr) {
          console.log("Couldn't kick user with contract address:", kickErr);
          await ctx.reply(`⚠️ Warning: User @${username || name} has a contract address in their name. Admins please verify!`);
        }
      }

      const { isScam, flags } = detectScam("", username);

      if (isScam) {
        await ctx.reply(`Warning: New member @${username} has suspicious indicators:\n${flags.join("\n")}\n\nAdmins, please verify!`);
      }
      
      // Check username/name for dealer signals (auto-ban unless trusted)
      // Note: Telegram API doesn't provide user bio on join events, only username/name
      const nameCheckTexts = [fullName, username].filter(Boolean).join(" ");
      
      // === PROFILE BIO SCAN — getChat() can return bio even though join events don't ===
      const _bioJoinFeats = await getFeatureSettings(chatIdStr);
      if (_bioJoinFeats.bioScan && !launchTrusted) {
        try {
          const userChat = await ctx.api.getChat(member.id);
          const bio = ((userChat as unknown as Record<string, unknown>).bio as string | undefined) || "";
          if (bio) {
            const bioLower = bio.toLowerCase();
            const bioHit = BIO_SCAM_PHRASES.find(phrase => bioLower.includes(phrase));
            const bioHasWallet = /0x[a-fA-F0-9]{8,}/i.test(bio) || /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/.test(bio);
            if (bioHit || bioHasWallet) {
              await ctx.api.banChatMember(chatId, member.id);
              const reason = bioHit ? `Bio contains scam phrase: "${bioHit}"` : "Bio contains crypto wallet address";
              await ctx.reply(`${fullName || name} was removed at join — bio scan flagged scam content.\nREASON: ${reason}`);
              await logViolation(chatIdStr, newMemberId, username || fullName, "bio_scan", bio.slice(0, 200), reason, "ban");
              await incrementModStat(chatIdStr, 'scamsBlocked');
              continue;
            }
          }
        } catch { /* Bio not available or API error — no action */ }
      }

      // Initialize moderation status for new member
      await ensureUserModerationStatus(newMemberId, chatIdStr);
      
      // Track new join in moderation stats
      await incrementModStat(chatIdStr, 'newJoins');

      // === CAPTCHA VERIFICATION GATE ===
      const _captchaJoinFeats = await getFeatureSettings(chatIdStr);
      if (_captchaJoinFeats.captcha && !member.is_bot && !launchTrusted) {
        try {
          await ctx.api.restrictChatMember(chatId, member.id, {
            can_send_messages: false,
            can_send_audios: false,
            can_send_documents: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_video_notes: false,
            can_send_voice_notes: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
          }, { until_date: Math.floor(Date.now() / 1000) + 600 });

          await stateSet(KEYS.captcha(chatId, member.id), { chatId, userId: member.id, timestamp: Date.now(), firstTime: isFirstCommunityJoin, username, firstName: member.first_name || name }, TTL.captcha);

          await ctx.reply(
            `Welcome ${name}! One quick step before you can chat:\n\n` +
            `Tap the button below to confirm you're a real person. ` +
            `You have 10 minutes — unverified accounts are automatically removed.`,
            {
              reply_markup: {
                inline_keyboard: [[
                  { text: "✅ I'm a real person — let me in!", callback_data: `captcha:${chatId}:${member.id}` }
                ]]
              }
            }
          );
          continue; // CAPTCHA message IS the welcome — skip the regular welcome below
        } catch {
          // If restrict fails (bot lacks permissions), fall through to normal welcome
        }
      }

      // Fetch community config first so we can use the custom bot nickname in welcome messages
      const communityData = await getCommunity(chatIdStr);
      const botName = communityData?.botNickname || "The Warden";

      const label = memberLabel(member);
      let welcome: string;
      if (isFirstCommunityJoin) {
        welcome = buildFirstWelcome(label, botName);
      } else if (communityData?.welcomeMessage) {
        welcome = communityData.welcomeMessage.replace(/\{name\}/gi, label);
      } else {
        welcome = `${label}, welcome back. Gate remembers you. Ask me what changed, or tag @${BOT_USERNAME} and carry on where you left off.`;
      }
      await wardenReply(ctx, welcome);
    }
  });

  // === CAPTCHA VERIFICATION CALLBACK ===
  bot.callbackQuery(/^captcha:/, async (ctx) => {
    const data = ctx.callbackQuery.data || "";
    const parts = data.split(":");
    if (parts.length !== 3) { await ctx.answerCallbackQuery(); return; }

    const [, chatIdStr, userIdStr] = parts;
    const chatId = parseInt(chatIdStr);
    const userId = parseInt(userIdStr);

    if (ctx.from.id !== userId) {
      await ctx.answerCallbackQuery({ text: "This verification button isn't for you!", show_alert: true });
      return;
    }

    const pendingKey = KEYS.captcha(chatId, userId);
    const pendingEntry = await stateGet<{ chatId: number; userId: number; timestamp: number; firstTime?: boolean; username?: string; firstName?: string } | null>(pendingKey, null);
    if (!pendingEntry) {
      await ctx.answerCallbackQuery({ text: "Already verified or session expired.", show_alert: true });
      return;
    }
    await stateDel(pendingKey);

    try {
      await ctx.api.restrictChatMember(chatId, userId, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
      });

      await ctx.answerCallbackQuery({ text: "✅ Verified! You can now chat. Welcome!", show_alert: false });
      try {
        await ctx.editMessageText(
          `✅ ${ctx.from.first_name} passed verification and is now a full member. Welcome!`,
          { reply_markup: { inline_keyboard: [] } }
        );
      } catch { /* edit failed — not critical */ }
      if (pendingEntry.firstTime) {
        const communityData = await getCommunity(String(chatId));
        const botName = communityData?.botNickname || "The Warden";
        await ctx.api.sendMessage(chatId, buildFirstWelcome(memberLabel(ctx.from), botName));
      } else {
        await ctx.api.sendMessage(chatId, `${memberLabel(ctx.from)}, verified. Welcome back through the Gateway.`);
      }
    } catch {
      await ctx.answerCallbackQuery({ text: "Verification failed — please ask an admin to restore your permissions.", show_alert: true });
    }
  });

  // === CHAT MEMBER UPDATE HANDLER ===
  //
  // Second line of defence for the Boss/Community Leader extra-bot rule.
  //
  // message:new_chat_members doesn't fire in every case — a bot added through
  // some group configurations, or promoted in rather than invited, arrives only
  // as a chat_member update. This catches that path.
  bot.on("chat_member", async (ctx) => {
    const update = ctx.chatMember;
    if (!update) return;

    const chatId = ctx.chat.id;
    const chatIdStr = chatId.toString();
    const newMember = update.new_chat_member;
    const oldMember = update.old_chat_member;

    const joinedNow =
      (newMember.status === "member" || newMember.status === "administrator") &&
      (oldMember.status === "left" || oldMember.status === "kicked");
    const removedNow =
      (newMember.status === "left" || newMember.status === "kicked") &&
      (oldMember.status === "member" || oldMember.status === "administrator");

    const user = newMember.user;
    if (!user.is_bot || user.id === ctx.me.id) return;

    if (removedNow) {
      if (!canManageExtraBots(ctx as unknown as MyContext)) {
        const actor = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name || String(ctx.from?.id || "unknown"));
        await ctx.api.sendMessage(chatId, `BOT AUTHORITY ALERT\n\n${actor} removed @${user.username || user.id}. Only @aussieboomer and @TreeFitty are authorised to add or remove extra bots. I cannot re-add a bot Telegram has kicked, so one of them should review this.`).catch(() => {});
        await logViolation(chatIdStr, String(user.id), user.username || "", "unauthorised_bot_removal", `Removed by ${actor}`, "Only Boss/Community Leader may remove bots", "alert");
      }
      return;
    }

    if (!joinedNow) return;

    // Only @aussieboomer or @TreeFitty may add a bot here.
    const addedByOwner = canManageExtraBots(ctx as unknown as MyContext);
    if (addedByOwner) {
      await logViolation(chatIdStr, String(user.id), user.username || "",
        "bot_added_by_owner", user.username || "", "Added by Boss/Community Leader — permitted", "allow");
      return;
    }

    const adderName = ctx.from?.username
      ? `@${ctx.from.username}`
      : (ctx.from?.first_name || "someone");

    try {
      await ctx.api.banChatMember(chatId, user.id);
      const admins = await ctx.api.getChatAdministrators(chatId);
      const mentions = admins.filter(a => !a.user.is_bot && a.user.username)
        .slice(0, 3).map(a => `@${a.user.username}`).join(" ");

      await ctx.api.sendMessage(chatId,
        `Removed a bot ${mentions}\n\n` +
        `Bot: @${user.username || user.id}\n` +
        `Added by: ${adderName}\n` +
        `REASON: only @aussieboomer or @TreeFitty may add bots to this group.`
      );

      await logViolation(chatIdStr, String(user.id), user.username || "",
        "unauthorised_bot", `Added by ${adderName} (${ctx.from?.id})`,
        "Bot added by someone other than Boss/Community Leader", "ban");
      await incrementModStat(chatIdStr, 'scamsBlocked');
    } catch {
      try {
        await ctx.api.sendMessage(chatId,
          `A bot was added and I couldn't remove it: @${user.username || user.id}\n\n` +
          `Added by: ${adderName}\n\n` +
          `I need ban permission to enforce this.`
        );
      } catch { /* can't post either */ }
    }
  });

  // === FEEDBACK BUTTON CALLBACK HANDLERS ===
  bot.callbackQuery(/^feedback:(up|down):(\d+)$/, async (ctx) => {
    const match = ctx.callbackQuery.data.match(/^feedback:(up|down):(\d+)$/);
    if (!match) return;
    
    const feedbackType = match[1]; // 'up' or 'down'
    const interactionId = parseInt(match[2]);
    const userId = ctx.from.id.toString();
    
    // Check if learning is enabled for this chat
    const _feedbackChatId = ctx.chat?.id?.toString();
    if (_feedbackChatId) {
      const _learningFeats = await getFeatureSettings(_feedbackChatId);
      if (!_learningFeats.learning) {
        await ctx.answerCallbackQuery({ text: "Thanks for the feedback!" });
        return;
      }
    }
    
    const isPositive = feedbackType === 'up';
    const success = await BotMemory.learnFromFeedback(interactionId, userId, isPositive);
    
    if (success) {
      const message = isPositive 
        ? "Thanks! I'll remember that worked well!" 
        : "Got it! I'll try to do better next time!";
      await ctx.answerCallbackQuery({ text: message });
      
      // Remove the feedback buttons after feedback is given
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      } catch { /* buttons already removed or message too old */ }
    } else {
      await ctx.answerCallbackQuery({ text: "Oops, couldn't save that feedback!" });
    }
  });

  // === MEDIA CAPTION MODERATION (photos, videos, documents) ===
  bot.on(["message:photo", "message:video", "message:document", "message:animation"], async (ctx, next) => {
    const caption = ctx.message.caption;
    if (!caption) {
      await next();
      return;
    }
    
    const username = ctx.from?.username;
    const chatId = ctx.chat?.id;
    const userIdStr = ctx.from?.id?.toString() || "unknown";
    
    if (!chatId || chatId >= 0 || !ctx.from?.id || ctx.from.is_bot) {
      await next();
      return;
    }
    
    const chatIdStr = String(chatId);
    const communityTrust = await getCommunityTrustClass(userIdStr, chatIdStr);
    if (communityTrust === "full") { await next(); return; }
    if (communityTrust === "trusted") {
      if (await enforceTrustedLinkContractRules(ctx, caption)) return;
      await next(); return;
    }
    
    // Check if user is admin (admins bypass moderation)
    const userIsAdmin = await isUserAdmin(ctx, ctx.from.id);
    if (userIsAdmin) {
      await next();
      return;
    }
    
    // Get chat settings for raid mode and thresholds
    const settings = await getChatSettings(chatIdStr);
    
    // Check for links in caption (new users can't post links)
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = caption.match(urlRegex) || [];
    if (urls.length > 0) {
      await ensureUserModerationStatus(userIdStr, chatIdStr);
      const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
      const userJoinDate = userStatus?.joinDate || new Date();
      const hoursInChat = (Date.now() - new Date(userJoinDate).getTime()) / (1000 * 60 * 60);
      
      const linkHoursLimit = settings.raidMode ? 48 : settings.newUserLinkHours;
      if (hoursInChat < linkHoursLimit && userStatus?.role === "newbie") {
        const allLinksAllowed = urls.every(url => 
          isAllowedUrl(url)
        );
        
        if (!allLinksAllowed) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, 'linksBlocked');
            await ctx.reply(`Links in media captions are restricted for new members during the first ${linkHoursLimit} hours.`);
          } catch (e) {
            console.log("Couldn't delete media with link caption from new user");
          }
          return;
        }
      }
    }
    
    // Risk scoring for scam detection in captions
    const userJoinDate = (await getUserModerationStatus(userIdStr, chatIdStr))?.joinDate || new Date();
    const accountAgeDays = (Date.now() - new Date(userJoinDate).getTime()) / (1000 * 60 * 60 * 24);
    const riskScore = calculateRiskScore(caption, username, accountAgeDays);
    
    const highRiskThreshold = settings.raidMode ? 40 : 60;
    const mediumRiskThreshold = settings.raidMode ? 25 : 40;
    
    if (riskScore >= highRiskThreshold) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
        await incrementModStat(chatIdStr, 'scamsBlocked');
        
        await db.update(userModerationStatus)
          .set({ 
            riskScore: riskScore,
            isQuarantined: true,
            quarantineReason: `High risk caption: ${riskScore}`
          })
          .where(and(
            eq(userModerationStatus.telegramUserId, userIdStr),
            eq(userModerationStatus.chatId, chatIdStr)
          ));
        
        await ctx.reply(`Suspicious media blocked. Admins have been notified.`);
        await flagForModReview(ctx, userIdStr, username || "", caption, riskScore, "High risk caption - auto-quarantined");
      } catch (e) {
        console.log("Couldn't auto-quarantine high-risk media");
      }
      return;
    } else if (riskScore >= mediumRiskThreshold) {
      await flagForModReview(ctx, userIdStr, username || "", caption, riskScore, "Medium risk caption - flagged for review");
    }
    
    // Legacy scam detection
    const { isScam, flags } = detectScam(caption, username);
    if (isScam) {
      await ctx.reply(`Suspicious media detected!\n\nFlags:\n${flags.join("\n")}\n\nAdmins, please review!`, 
        { reply_parameters: { message_id: ctx.message.message_id } });
    }
    
    await next();
  });

  // === MEDIA SPAM DETECTION (stickers, animations, voice notes) ===
  const mediaSpamHistory: Map<string, { mediaId: string; count: number; lastTime: number }[]> = new Map();
  const MEDIA_SPAM_THRESHOLD = 3; // Same media 3 times
  const MEDIA_WINDOW_MS = 30000; // Within 30 seconds
  const MEDIA_CLEANUP_INTERVAL = 60000; // Clean up every minute
  
  // Dev-only in-memory sweep. In production the media history lives in Redis
  // with its own expiry, so there is nothing here to clean up.
  if (!process.env.VERCEL) setInterval(() => {
    const now = Date.now();
    const entries = Array.from(mediaSpamHistory.entries());
    for (const [key, history] of entries) {
      const filtered = history.filter((h: { mediaId: string; count: number; lastTime: number }) => now - h.lastTime < MEDIA_WINDOW_MS * 2);
      if (filtered.length === 0) {
        mediaSpamHistory.delete(key);
      } else {
        mediaSpamHistory.set(key, filtered);
      }
    }
  }, MEDIA_CLEANUP_INTERVAL);
  
  // Helper function for media spam detection
  async function checkMediaSpam(
    ctx: MyContext, 
    mediaId: string, 
    mediaType: string
  ): Promise<boolean> {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      return false; // Not spam, continue
    }
    
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") return false;

    // Check if user is admin (admins bypass moderation)
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      return false;
    }
    
    const key = KEYS.mediaSpam(chatId, userId, mediaType);
    const now = Date.now();

    // Media history is durable so flood counts survive a cold start
    let history = await stateGet<{ mediaId: string; count: number; lastTime: number }[]>(key, []);
    
    // Filter to recent media only
    history = history.filter(h => now - h.lastTime < MEDIA_WINDOW_MS);
    
    // Find if this media was recently sent
    const existing = history.find(h => h.mediaId === mediaId);
    if (existing) {
      existing.count++;
      existing.lastTime = now;
      
      if (existing.count >= MEDIA_SPAM_THRESHOLD) {
        try {
          await ctx.api.deleteMessage(chatId, ctx.message!.message_id);
          const chatIdStr = String(chatId);
          await incrementModStat(chatIdStr, 'spamBlocked');
          await ctx.reply(`${mediaType} spam detected! Please don't flood the chat.`);
          
          // Reset count after warning
          existing.count = 0;
        } catch (e) {
          console.log(`Couldn't delete ${mediaType} spam`);
        }
        await stateSet(key, history, TTL.mediaSpam);
        return true; // Was spam
      }
    } else {
      history.push({ mediaId, count: 1, lastTime: now });
    }
    
    await stateSet(key, history, TTL.mediaSpam);
    return false; // Not spam
  }
  
  // Sticker spam detection
  bot.on("message:sticker", async (ctx, next) => {
    const stickerId = ctx.message.sticker.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, stickerId, "Sticker");
    if (!wasSpam) await next();
  });
  
  // GIF/Animation spam detection
  bot.on("message:animation", async (ctx, next) => {
    // Skip if already handled by caption moderation
    if (ctx.message.caption) {
      await next();
      return;
    }
    const animationId = ctx.message.animation.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, animationId, "GIF");
    if (!wasSpam) await next();
  });
  
  // Voice note spam detection
  bot.on("message:voice", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      await next();
      return;
    }
    
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") { await next(); return; }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    
    // Track voice messages by file_unique_id for proper duplicate detection
    const voiceId = ctx.message.voice.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, voiceId, "Voice");
    if (!wasSpam) await next();
  });
  
  // Video note (round video) spam detection
  bot.on("message:video_note", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      await next();
      return;
    }
    
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") { await next(); return; }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    
    const videoNoteId = ctx.message.video_note.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, videoNoteId, "Video note");
    if (!wasSpam) await next();
  });
  
  // === FORWARDED MESSAGE RESTRICTIONS ===
  bot.on("message", async (ctx, next) => {
    // Check if message is forwarded (check both modern and legacy properties)
    const msg = ctx.message as any; // Cast to any to access legacy fields
    const isForwarded = msg?.forward_origin || msg?.forward_from || msg?.forward_from_chat || 
                        msg?.forward_sender_name || msg?.forward_date;
    if (!isForwarded) {
      await next();
      return;
    }
    
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      await next();
      return;
    }
    
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") { await next(); return; }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    
    const userIdStr = String(userId);
    const chatIdStr = String(chatId);
    
    // Check if user is new
    await ensureUserModerationStatus(userIdStr, chatIdStr);
    const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
    const userJoinDate = userStatus?.joinDate || new Date();
    const hoursInChat = (Date.now() - new Date(userJoinDate).getTime()) / (1000 * 60 * 60);
    
    // New users (less than 24 hours) can't forward messages
    const _fwdFeats = await getFeatureSettings(chatIdStr);
    if (_fwdFeats.newuser && hoursInChat < 24 && userStatus?.role === "newbie") {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message!.message_id);
        await incrementModStat(chatIdStr, 'spamBlocked');
        await ctx.reply("New members can't forward messages during the first 24 hours. This protects our community from spam.");
      } catch (e) {
        console.log("Couldn't delete forwarded message from new user");
      }
      return;
    }
    
    await next();
  });
  
  // === CONTACT SHARING RESTRICTIONS ===
  bot.on("message:contact", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      await next();
      return;
    }
    
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") { await next(); return; }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    
    const userIdStr = String(userId);
    const chatIdStr = String(chatId);
    
    // Check if user is new
    await ensureUserModerationStatus(userIdStr, chatIdStr);
    const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
    const userJoinDate = userStatus?.joinDate || new Date();
    const hoursInChat = (Date.now() - new Date(userJoinDate).getTime()) / (1000 * 60 * 60);
    
    // New users can't share contacts (scammers share fake support contacts)
    const _contactFeats = await getFeatureSettings(chatIdStr);
    if (_contactFeats.newuser && hoursInChat < 48 && userStatus?.role === "newbie") {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message!.message_id);
        await incrementModStat(chatIdStr, 'scamsBlocked');
        await ctx.reply("Sharing contacts is restricted for new members. This protects our community from scammers impersonating support.");
      } catch (e) {
        console.log("Couldn't delete contact share from new user");
      }
      return;
    }
    
    await next();
  });
  
  // === DANGEROUS FILE TYPE BLOCKING ===
  const DANGEROUS_EXTENSIONS = [
    ".exe", ".bat", ".cmd", ".com", ".scr", ".pif", ".msi",
    ".vbs", ".vbe", ".js", ".jse", ".ws", ".wsf", ".wsh",
    ".ps1", ".psm1", ".psd1", ".sh", ".bash", ".run",
    ".apk", ".app", ".dmg", ".pkg", ".deb", ".rpm"
  ];
  
  bot.on("message:document", async (ctx, next) => {
    const fileName = ctx.message.document.file_name?.toLowerCase() || "";
    const chatId = ctx.chat?.id;
    
    if (!chatId || chatId >= 0 || !ctx.from?.id || ctx.from.is_bot) {
      await next();
      return;
    }
    
    const communityTrust = await getCommunityTrustClass(String(ctx.from.id), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") { await next(); return; }
    const userIsAdmin = await isUserAdmin(ctx, ctx.from.id);
    if (userIsAdmin) {
      await next();
      return;
    }
    
    // Check for dangerous file extensions
    const _fileFeats = await getFeatureSettings(String(chatId));
    const isDangerous = _fileFeats.files && DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (isDangerous) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
        const chatIdStr = String(chatId);
        await incrementModStat(chatIdStr, 'scamsBlocked');
        await ctx.reply("Executable and script files are not allowed. They can contain malware.");
        await flagForModReview(ctx, String(ctx.from.id), ctx.from.username || "", 
          `Attempted to share dangerous file: ${fileName}`, 80, "Dangerous file type blocked");
      } catch (e) {
        console.log("Couldn't delete dangerous file");
      }
      return;
    }
    
    await next();
  });

  // === SCAM DETECTION & AI RESPONSE MIDDLEWARE ===
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text;
    const username = ctx.from?.username;
    const userId = ctx.from?.id.toString() || "unknown";
    const chatId = ctx.chat?.id;
    const communityTrust = (chatId && chatId < 0 && ctx.from?.id)
      ? await getCommunityTrustClass(String(ctx.from.id), String(chatId))
      : "normal";
    const hasFullCommunityTrust = communityTrust === "full";
    const hasTrustedCommunityTrust = communityTrust === "trusted";

    // Update activity time and reset auto-engage timer
    ctx.session.lastActivityTime = Date.now();
    if (chatId && chatId < 0) { // Only for group chats (negative IDs)
      // Record activity so the cron tick knows when this chat went quiet
      await markChatActivity(chatId);

      // Any timed game round that has run out gets closed off here, on the
      // next message, rather than by a timer this process can't keep.
      await expireTriviaIfDue(chatId, bot);
      await expirePuzzleIfDue(chatId, bot);
      
      // Track this chat for scheduled posts (recipes, etc.)
      await addActiveChat(chatId);

      // Birthday arrival: once per birthday, when the member actually appears in chat,
      // give them the larger personalised Warden greeting.
      if (ctx.from?.id && !ctx.from.is_bot) {
        await maybeSendBirthdayArrivalGreeting(ctx);
      }
      
      // Track admin activity - update when any user messages
      if (ctx.from?.id) {
        await updateAdminActivity(chatId, ctx.from.id, ctx.from.username || "", ctx.from.first_name || "");
      }
      
      // Update leaderboard for all users
      if (ctx.from?.id) {
        updateLeaderboard(chatId, ctx.from.id, ctx.from.username || "", ctx.from.first_name || "Anonymous");
      }
      
      // Track new user messages for edit detection (scammers edit innocent messages to add scams)
      if (ctx.from?.id && !ctx.from.is_bot && !hasFullCommunityTrust && !hasTrustedCommunityTrust) {
        const chatIdStr = String(chatId);
        const userIdStr = String(ctx.from.id);
        const userIsNew = await isNewUser(chatIdStr, userIdStr);
        if (userIsNew) {
          const hasLinks = /https?:\/\/|t\.me\/|@\w+/i.test(text);
          await trackNewUserMessage(
            String(ctx.message.message_id),
            chatIdStr,
            userIdStr,
            ctx.from.username,
            text,
            false, // hasMedia
            hasLinks
          );
        }
      }

      // === SETUP WIZARD INTERCEPT ===
      // Catch the admin's responses to the multi-step /setup wizard
      // This must run before spam/scam detection so wizard messages aren't false-flagged
      const _wChatIdStr = String(chatId);
      const _wizardState = setupWizardState.get(_wChatIdStr);
      if (_wizardState && ctx.from?.id === _wizardState.initiatorId && !ctx.from.is_bot) {
        if (_wizardState.step === 1) {
          // Step 1: collect community display name
          const communityName = text.trim();
          setupWizardState.set(_wChatIdStr, { ..._wizardState, step: 2, displayName: communityName });
          // Update the trial record with the real name now that we have it
          await updateCommunity(_wChatIdStr, { displayName: communityName });
          communityCache.delete(_wChatIdStr);
          await ctx.reply(
            `Great name!\n\n` +
            `STEP 2 OF 4: What timezone should I use for scheduled posts?\n\n` +
            `Common options:\n` +
            `• Australia/Hobart (Tasmania)\n` +
            `• Australia/Sydney (AEST/AEDT)\n` +
            `• America/Los_Angeles (Pacific)\n` +
            `• America/New_York (Eastern)\n` +
            `• Europe/London (GMT/BST)\n` +
            `• UTC\n\n` +
            `Type one of the above, or "skip" to use ${COMMUNITY_TIMEZONE}.`
          );
        } else if (_wizardState.step === 2) {
          // Step 2: collect timezone
          let timezone = text.trim();
          if (timezone.toLowerCase() === "skip") timezone = COMMUNITY_TIMEZONE;
          try { Intl.DateTimeFormat(undefined, { timeZone: timezone }); } catch {
            await ctx.reply(`That doesn't look like a valid timezone. Try again or type 'skip' to use ${COMMUNITY_TIMEZONE}.`);
            return;
          }
          setupWizardState.set(_wChatIdStr, { ..._wizardState, step: 3, timezone });
          await ctx.reply(
            `Timezone set to ${timezone}!\n\n` +
            `STEP 3 OF 4: Set a custom welcome message for new members.\n\n` +
            `Use {name} as a placeholder for the new member's name.\n` +
            `Example: Hey {name}! Welcome to our community! Read the pinned messages.\n\n` +
            `Type your message, or "skip" to use the default welcome rotation.`
          );
        } else if (_wizardState.step === 3) {
          // Step 3: collect welcome message, then advance to feature selection
          const welcomeMsg = text.trim().toLowerCase() === "skip" ? null : text.trim();
          setupWizardState.set(_wChatIdStr, { ..._wizardState, step: 4, welcomeMessage: welcomeMsg });
          const featureList = WIZARD_FEATURE_KEYS.map(k => `• ${k}`).join("\n");
          await ctx.reply(
            `Welcome message ${welcomeMsg ? "saved" : "skipped"}!\n\n` +
            `STEP 4 OF 4: Feature Selection\n\n` +
            `All 20 features are ON by default. Type the names of any you want to DISABLE (comma-separated), or type "all on" to enable everything.\n\n` +
            `Available features:\n${featureList}\n\n` +
            `Example: "stories, giveaways, games" or "all on"`
          );
        } else if (_wizardState.step === 4) {
          // Step 4: feature selection — finalize setup
          const displayName = _wizardState.displayName || "Community";
          const timezone = _wizardState.timezone || COMMUNITY_TIMEZONE;
          const welcomeMsg = _wizardState.welcomeMessage ?? null;
          setupWizardState.delete(_wChatIdStr);

          // Parse which features to disable
          const input = text.trim().toLowerCase();
          const toDisable: (keyof FeatureSettings)[] = [];
          if (input !== "all on" && input !== "skip") {
            const parts = input.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
            for (const part of parts) {
              const match = WIZARD_FEATURE_KEYS.find(k => k.toLowerCase() === part);
              if (match) toDisable.push(match);
            }
          }

          // Apply feature overrides
          if (toDisable.length > 0) {
            for (const feat of toDisable) {
              await updateFeatureSetting(_wChatIdStr, feat, false);
            }
          }

          // Finalize community record
          await updateCommunity(_wChatIdStr, {
            timezone,
            ...(welcomeMsg ? { welcomeMessage: welcomeMsg } : {}),
            isOnboarded: true,
            onboardingStep: 5,
          });
          communityCache.delete(_wChatIdStr); // Force fresh read next time

          const community = await getCommunity(_wChatIdStr);
          const trialExpiry = community?.trialExpiresAt ? community.trialExpiresAt.toDateString() : "7 days from now";
          const disabledNote = toDisable.length > 0
            ? `Disabled features: ${toDisable.join(", ")}`
            : "All 20 features: ON";
          await ctx.reply(
            `SETUP COMPLETE!\n\n` +
            `Community Name: ${displayName}\n` +
            `Timezone: ${timezone}\n` +
            `Welcome Message: ${welcomeMsg ? "Custom" : "Default rotation"}\n` +
            `${disabledNote}\n\n` +
            `Your 7-day FREE TRIAL is active until ${trialExpiry}.\n\n` +
            `After the trial, contact ${OWNER_CONTACT} to continue.\n\n` +
            `Use /community to view config · /settings to adjust features · /toggle [feature] to flip individual ones`
          );
        }
        return; // Don't process wizard messages through normal chat handling
      }

      // SPAM DETECTION - Auto-mute spammers with escalating punishment
      if (ctx.from?.id && !ctx.from.is_bot) {
        // Check if user is admin (admins are exempt from spam detection)
        const userIsAdmin = hasFullCommunityTrust || hasTrustedCommunityTrust || await isAdmin(ctx);
        const _spamFeats = await getFeatureSettings(String(chatId));

        // Mass-mention spam detection — 5+ @mentions in one message
        if (!userIsAdmin && _spamFeats.massMention) {
          const mentionEntities = ctx.message?.entities?.filter(e =>
            e.type === "mention" || e.type === "text_mention"
          ) || [];
          if (mentionEntities.length >= 5) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              const mentionTarget = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
              await ctx.reply(
                `${mentionTarget} — mentioning ${mentionEntities.length} people in one message is not allowed.\n\n` +
                `Mass-mentions are a spam pattern. Please keep it to 1-2 at a time.`
              );
              await logViolation(String(chatId), String(ctx.from.id), ctx.from.username || ctx.from.first_name || "unknown", "mass_mention", text.slice(0, 200), `${mentionEntities.length} @mentions in one message`, "delete");
            } catch { /* delete failed — bot may lack permissions */ }
            return;
          }
        }

        if (!userIsAdmin && _spamFeats.spam && await isSpam(chatId, ctx.from.id, text)) {
          const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, ctx.from.id);
          const firstName = ctx.from.first_name || "User";
          const uname = ctx.from.username;
          const spamReaction = WARDEN_REACTIONS.spamCaught[Math.floor(Math.random() * WARDEN_REACTIONS.spamCaught.length)];
          const targetName = uname ? `@${uname}` : firstName;
          
          try {
            // Delete the spam message
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            
            if (shouldBan) {
              // 4th offense = permanent ban
              await ctx.api.banChatMember(chatId, ctx.from.id);
              
              const banMessage = formatWarning({
                type: "ban",
                username: targetName,
                offenseCount,
                reason: "Spam detected (repeated flooding/duplicate messages)",
                action: "PERMANENTLY BANNED"
              });
              
              await ctx.reply(`${spamReaction}\n\n${banMessage}\n\nUser has been removed for repeated spam violations.`);
            } else {
              // Mute the user
              const muteUntil = Math.floor(Date.now() / 1000) + muteSeconds;
              await ctx.api.restrictChatMember(chatId, ctx.from.id, {
                can_send_messages: false,
                can_send_audios: false,
                can_send_documents: false,
                can_send_photos: false,
                can_send_videos: false,
                can_send_video_notes: false,
                can_send_voice_notes: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false
              }, { until_date: muteUntil });
              
              const warningMessage = formatWarning({
                type: "spam",
                username: targetName,
                offenseCount,
                reason: "Spam detected (flooding/duplicate messages)",
                action: `Muted for ${formatDuration(muteSeconds)}`
              });
              
              await ctx.reply(`${spamReaction}\n\n${warningMessage}`);
            }
          } catch (error) {
            console.log("Couldn't auto-moderate spam - check bot permissions");
          }
          
          // Stop processing this spam message
          return;
        }
      }
    }

    // === ADVANCED MODERATION CHECKS ===
    if (chatId && chatId < 0 && ctx.from?.id && !ctx.from.is_bot) {
      const chatIdStr = String(chatId);
      const userIdStr = String(ctx.from.id);
      
      // Skip rate limiting for game commands (they happen fast during gameplay)
      const gameCommands = ['/trivia', '/puzzle', '/guess', '/leaderboard', '/puzzleboard', '/answer'];
      const isGameCommand = gameCommands.some(cmd => text.toLowerCase().startsWith(cmd));
      
      // Full trust bypasses member moderation. Trusted mods bypass ordinary restrictions,
      // but links/contracts are still zero-trust and checked first.
      if (hasTrustedCommunityTrust && await enforceTrustedLinkContractRules(ctx, text)) return;
      const userIsAdminForMod = hasFullCommunityTrust || hasTrustedCommunityTrust || await isUserAdmin(ctx, ctx.from.id);
      
      const _earlyMediaFeats = await getFeatureSettings(chatIdStr);

      // === COMPROMISED ADMIN GUARD ===
      //
      // Admins bypass moderation. That is normally correct, and it is also the
      // biggest hole in any community bot: if an admin account is stolen, the
      // rules guarantee silence while the thief posts a drainer link to
      // everyone at once.
      //
      // We can't demote an admin — Telegram only lets a bot demote admins it
      // promoted itself. But we can do the thing that actually limits the
      // damage: DELETE THE MESSAGE FIRST, then raise the alarm. Every second
      // that link stays up is someone else's wallet.
      //
      // Deleting a real admin's message is a small annoyance. Leaving a drainer
      // link up because the sender had a badge is not recoverable.
      if (userIsAdminForMod && !hasFullCommunityTrust && !hasTrustedCommunityTrust) {
        const compromise = detectAdminCompromise(text);
        if (compromise) {
          let deleted = false;
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            deleted = true;
          } catch { /* no delete permission, or too old */ }

          try {
            const admins = await ctx.api.getChatAdministrators(chatId);
            const mentions = admins
              .filter(a => !a.user.is_bot && a.user.username)
              .slice(0, 5)
              .map(a => `@${a.user.username}`)
              .join(" ");

            const who = username ? `@${username}` : (ctx.from.first_name || "an admin");

            await ctx.reply(
              `SECURITY ALERT ${mentions}\n\n` +
              `${who} — an admin account — posted something matching a wallet-drainer pattern.\n\n` +
              `DETECTED: ${compromise}\n` +
              `MESSAGE: ${deleted ? "removed" : "COULD NOT BE REMOVED — delete it manually now"}\n\n` +
              `If that wasn't you, your account is compromised. Right now, in this order:\n` +
              `1. Another admin: remove their admin rights.\n` +
              `2. Owner: terminate their sessions in Telegram settings.\n` +
              `3. Change the password and check for a second logged-in device.\n\n` +
              `Everyone else: do not click anything posted by this account until an admin says otherwise.`
            );

            // Freeze their trust so nothing else keys off it while this is open.
            await db.update(trustScores)
              .set({ isFrozen: true, frozenAt: new Date(), frozenReason: "Possible account compromise" })
              .where(and(eq(trustScores.telegramUserId, userIdStr), eq(trustScores.chatId, chatIdStr)));

            await logViolation(chatIdStr, userIdStr, username || "", "admin_compromise",
              text.slice(0, 200), compromise, deleted ? "delete+alert" : "alert-only");
            await incrementModStat(chatIdStr, 'scamsBlocked');
          } catch { /* couldn't post the alert */ }

          return; // don't process this message any further
        }
      }

      if (!userIsAdminForMod && !isGameCommand) {
        // Get chat settings for raid mode and thresholds
        const settings = await getChatSettings(chatIdStr);
        // Get feature toggles for this chat
        const feats = await getFeatureSettings(chatIdStr);

        // === 1A. FAKE VERIFICATION BOT / CLIPBOARD MALWARE ===
        // The highest-damage attack on NFT communities right now. Nothing
        // legitimate ever asks you to paste a command into your computer.
        if (feats.scam) {
          const verifyHit = detectFakeVerificationBot(text);
          if (verifyHit) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, 'scamsBlocked');
              const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, ctx.from.id);
              if (shouldBan) {
                await ctx.api.banChatMember(chatId, ctx.from.id);
              } else {
                await muteUser(ctx, ctx.from.id, muteSeconds, "Fake verification / clipboard malware", username);
              }
              await ctx.reply(
                `Message removed.\n\n` +
                `REASON: ${verifyHit}\n\n` +
                `Nobody in this community will ever ask you to paste a command into your computer, ` +
                `or to verify through a bot. That installs software that reads your wallet keys.\n\n` +
                `If you already ran something like that, move your funds to a new wallet from a ` +
                `different device before doing anything else.`
              );
              await logViolation(chatIdStr, userIdStr, username || "", "fake_verification", text.slice(0, 200), verifyHit, shouldBan ? "ban" : "mute");
            } catch { console.log("Couldn't action fake verification message"); }
            return;
          }
        }

        // === 1B. LOOKALIKE OF OUR OWN DOMAIN ===
        // A near-perfect copy of the mint page on a domain one character off.
        // Members click it precisely because they were told to trust the site.
        if (feats.scam) {
          const spoof = detectDomainImpersonation(text);
          if (spoof) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, 'scamsBlocked');
              const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, ctx.from.id);
              if (shouldBan) {
                await ctx.api.banChatMember(chatId, ctx.from.id);
              } else {
                await muteUser(ctx, ctx.from.id, muteSeconds, "Posted a lookalike domain", username);
              }
              await ctx.reply(
                `Message removed — that link was not us.\n\n` +
                `The domain was built to look like ${spoof.mimicking}.\n\n` +
                `Official links: ${[OFFICIAL_WEBSITE_URL, OFFICIAL_TELEGRAM_URL, BOT_PUBLIC_URL].filter(Boolean).join(" | ")}. ` +
                `Type them yourself. Don't click them.`
              );
              await logViolation(chatIdStr, userIdStr, username || "", "domain_spoof", text.slice(0, 200), `Mimicking ${spoof.mimicking}`, shouldBan ? "ban" : "mute");
            } catch { console.log("Couldn't action domain spoof"); }
            return;
          }
        }

        // === 1C. MINT / AIRDROP URGENCY BAIT ===
        // Only fires alongside a link, since the project itself says "mint is live".
        if (feats.scam) {
          const baitHit = detectMintBait(text);
          if (baitHit) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, 'scamsBlocked');
              await ctx.reply(
                `Message removed.\n\n` +
                `REASON: mint/airdrop bait ("${baitHit}") with a link attached.\n\n` +
                `Announcements come from pinned messages here and from the official site. Nowhere else.`
              );
              await flagForModReview(ctx, userIdStr, username || "", text, 85, `Mint/airdrop bait: ${baitHit}`);
              await logViolation(chatIdStr, userIdStr, username || "", "mint_bait", text.slice(0, 200), baitHit, "delete");
            } catch { console.log("Couldn't action mint bait"); }
            return;
          }
        }

        // === 1D. MIXED-SCRIPT DISPLAY NAME ===
        // Cyrillic and Greek lookalikes inside a Latin name are how admin
        // impersonation is done. Never accidental.
        if (feats.impersonation) {
          const displayName = `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim();
          if (hasHomoglyphs(displayName) || hasHomoglyphs(username || "")) {
            try {
              const admins = await ctx.api.getChatAdministrators(chatId);
              const mentions = admins.filter(a => !a.user.is_bot && a.user.username)
                .slice(0, 3).map(a => `@${a.user.username}`).join(" ");
              await ctx.reply(
                `Heads up ${mentions}\n\n` +
                `${displayName || username} has a name that mixes character sets — ` +
                `letters that look Latin but aren't. That is how impersonation accounts are built.\n\n` +
                `Worth a look.`
              );
              await flagForModReview(ctx, userIdStr, username || "", displayName, 70, "Mixed-script display name");
              await logViolation(chatIdStr, userIdStr, username || "", "homoglyph_name", displayName, "Mixed character sets in name", "flag");
            } catch { /* alert failed */ }
          }
        }
        
        // === 1D2. MEDIA LOCKDOWN FOR UNTRUSTED ACCOUNTS ===
        //
        // The bot cannot see what is inside an image, so it cannot judge one.
        // What it can do is make the group a bad place to post illegal media in
        // the first place: brand-new and untrusted accounts don't get to post
        // images, video or documents at all.
        //
        // This is the honest version of image safety — restrict who can post,
        // rather than pretending to classify what they posted.
        if (_earlyMediaFeats.newuser && (ctx.message as any)?.photo) {
          const _mTrust = await ensureTrustRecord(userIdStr, chatIdStr, username, ctx.from.first_name);
          const _mIsNew = await isNewUser(chatIdStr, userIdStr);
          if (_mIsNew && !_mTrust?.isTrusted) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await ctx.reply(
                `${username ? "@" + username : "That"} — images are held until you've been ` +
                `around a little. Say hello first and it lifts on its own.`
              );
              await logViolation(chatIdStr, userIdStr, username || "", "media_new_user",
                "", "Image from a new, untrusted account", "delete");
            } catch { /* no delete permission */ }
            return;
          }
        }

        // === 1E. BEHAVIOURAL ANOMALY DETECTION ===
        //
        // Everything above matches known patterns, which works until someone
        // reads them and rewords. This doesn't read the message — it watches
        // what the account DOES. Rate, newness, repetition, link ratio.
        // Wording is cheap to change; behaviour is what makes the attack pay.
        try {
          const _trustRec = await ensureTrustRecord(userIdStr, chatIdStr, username, ctx.from.first_name);
          const _isTrusted = Boolean(_trustRec?.isTrusted);

          const verdict = await assessBehaviour({
            userId: ctx.from.id,
            chatId,
            text,
            isForward: Boolean((ctx.message as any)?.forward_origin || (ctx.message as any)?.forward_from),
            hasMedia: Boolean((ctx.message as any)?.photo || (ctx.message as any)?.video || (ctx.message as any)?.document),
            accountIsNew: isNewAccountHeuristic(ctx.from.id),
            isTrusted: _isTrusted,
          });

          if (verdict.action === "restrict") {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            const { muteSeconds, shouldBan } = await addOffense(chatId, ctx.from.id);
            if (shouldBan) {
              await ctx.api.banChatMember(chatId, ctx.from.id);
              if (feats.crossBan) {
                await recordGlobalBan(userIdStr, username, ctx.from.first_name, chatIdStr,
                  "Automated behaviour pattern — 4th offence");
              }
            } else {
              await muteUser(ctx, ctx.from.id, muteSeconds, "Automated behaviour pattern", username);
            }
            await ctx.reply(
              `Message removed.\n\n` +
              `This account is behaving like an automated one:\n` +
              verdict.reasons.map(r => `- ${r}`).join("\n") +
              `\n\nIf you're a person and this is wrong, an admin can clear it with /restore.`
            );
            await logViolation(chatIdStr, userIdStr, username || "", "behaviour_anomaly",
              text.slice(0, 200), verdict.reasons.join("; ") + ` (score ${verdict.score})`,
              shouldBan ? "ban" : "mute");
            await incrementModStat(chatIdStr, 'spamBlocked');
            return;
          }

          if (verdict.action === "flag") {
            await flagForModReview(ctx, userIdStr, username || "", text, verdict.score,
              "Behaviour: " + verdict.reasons.join("; "));
          }

          // Several different new accounts posting the same SHAPE of message in
          // a short window is a campaign, not a coincidence. Raid detection
          // counts joins; this catches what they do once they're in.
          const campaign = await checkCoordinatedPosting(chatId, ctx.from.id, text);
          if (campaign?.detected && !_isTrusted) {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await stateSet(KEYS.lockdown(chatIdStr),
              { active: true, until: Date.now() + LOCKDOWN_DURATION }, TTL.lockdown);
            const admins = await ctx.api.getChatAdministrators(chatId);
            const mentions = admins.filter(a => !a.user.is_bot && a.user.username)
              .slice(0, 3).map(a => `@${a.user.username}`).join(" ");
            await ctx.reply(
              `COORDINATED POSTING ${mentions}\n\n` +
              `${campaign.count} different accounts have posted structurally identical ` +
              `messages with links in the last few minutes.\n\n` +
              `Lockdown is on and the messages are being removed. Nobody should click ` +
              `anything posted in this window.`
            );
            await logViolation(chatIdStr, userIdStr, username || "", "coordinated_campaign",
              text.slice(0, 200), `${campaign.count} accounts, same message shape`, "lockdown");
            await incrementModStat(chatIdStr, 'raidAttempts');
            return;
          }
        } catch (err) {
          console.error("[behaviour] check failed:", err);
        }

        // === PHASE 1 SECURITY CHECKS ===
        const lowerTextMod = text.toLowerCase();
        
        // 1A. Seed phrase detection - protect users from sharing recovery phrases
        if (feats.scam && detectSeedPhrase(text)) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, 'scamsBlocked');
            await ctx.reply(`Hey there! I removed that message because it looked like it might contain a wallet recovery phrase (seed phrase).

NEVER share your seed phrase with anyone - not even team members or "support." If someone asked you to share it, they're trying to steal your crypto!

If this was a mistake, no worries. Just keep those 12/24 words safe and private!`);
            await flagForModReview(ctx, userIdStr, username || "", "[SEED PHRASE DETECTED - Content hidden for safety]", 95, "Seed phrase detected");
          } catch (e) {
            console.log("Couldn't delete seed phrase message");
          }
          return;
        }
        
        // 1B. Wallet drainer phrase detection
        if (feats.scam) for (const phrase of WALLET_DRAINER_PHRASES) {
          if (lowerTextMod.includes(phrase)) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, 'scamsBlocked');
              await ctx.reply(`Hold up! That message contained a common scam phrase ("${phrase}").

Legit projects NEVER ask you to "verify," "sync," or "validate" your wallet through a random link. That's how scammers drain wallets!

If you received a DM asking you to do this, report and block them immediately.`);
              await flagForModReview(ctx, userIdStr, username || "", text, 85, `Wallet drainer phrase: ${phrase}`);
            } catch (e) {
              console.log("Couldn't delete wallet drainer message");
            }
            return;
          }
        }
        
        // 1C. Short link domain detection (URL shorteners hide scam links)
        if (feats.scam) {
        const urlRegexShort = /https?:\/\/([^\s\/]+)/gi;
        let shortLinkMatch;
        while ((shortLinkMatch = urlRegexShort.exec(text)) !== null) {
          const domain = shortLinkMatch[1].toLowerCase();
          if (SHORT_LINK_DOMAINS.some(sd => domain.includes(sd))) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, 'linksBlocked');
              await ctx.reply(`I blocked that shortened link for your safety!

Scammers use URL shorteners (bit.ly, tinyurl, etc.) to hide malicious websites. If you have a legitimate link to share, please use the full URL so everyone can see where it goes.

Tip: Never click shortened links in crypto groups - they're often phishing sites!`);
            } catch (e) {
              console.log("Couldn't delete short link message");
            }
            return;
          }
        }
        
        } // end feats.scam short-link block
        
        // 1C2. Inferno Drainer domain + permit-signature / EIP-2612 attack detector
        if (feats.scam) {
          const permitHit = detectPermitSignatureAttack(text);
          if (permitHit) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, 'scamsBlocked');
              await ctx.reply(
                `That message was removed — it matches known wallet-drain infrastructure.\n\n` +
                `Permit-signature attacks look like innocent "verification signatures" or "small gas fees" ` +
                `but silently grant unlimited access to your tokens via ERC-20 approve(). ` +
                `NEVER sign anything from a link shared in a crypto group.\n\n` +
                `Legitimate projects never ask you to sign a wallet approval to claim anything. ` +
                `If you received a DM pushing this, block and report them immediately.`
              );
              await flagForModReview(ctx, userIdStr, username || "", text, 90, `Permit-sig/drainer attack: ${permitHit}`);
            } catch (e) {
              console.log("Couldn't delete permit-sig/drainer message");
            }
            return;
          }
        }
        
        // 1C3. Fake CAPTCHA harvest attack detector
        // "verify you're human" prompts + external links steal session tokens / private keys
        if (feats.scam && detectFakeCaptcha(text)) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, 'scamsBlocked');
            await ctx.reply(
              `That message was removed — it looks like a fake CAPTCHA or verification prompt.\n\n` +
              `Fake "verify you're human" links inside crypto groups are a major attack vector. ` +
              `They harvest session tokens, inject clipboard malware, or steal private keys — ` +
              `NOT verify anything. The $200k Unihax0r drain in May 2025 came through exactly this.\n\n` +
              `Real group verifications NEVER use external links. ` +
              `If this was a mistake, reach out to an admin directly.`
            );
            await flagForModReview(ctx, userIdStr, username || "", text, 92, "Fake CAPTCHA / verification harvest attempt");
          } catch (e) {
            console.log("Couldn't delete fake CAPTCHA message");
          }
          return;
        }
        
        // 1D. Hate speech detection with progressive warnings
        const hateSpeechCheck = feats.hate ? detectHateSpeech(text) : { detected: false };
        if (hateSpeechCheck.detected) {
          const warningKey = KEYS.hateWarning(userIdStr, chatIdStr);
          const now = Date.now();
          let existing = await stateGet<{ count: number; lastWarning: number } | null>(warningKey, null);

          // Reset if the last warning is old enough to have lapsed
          if (existing && (now - existing.lastWarning > HATE_SPEECH_WARNING_RESET)) {
            existing = null;
          }

          const warningCount = (existing?.count || 0) + 1;
          await stateSet(warningKey, { count: warningCount, lastWarning: now }, TTL.hateWarning);
          
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, 'messagesBlocked');
            
            if (warningCount === 1) {
              await ctx.reply(
                `${username ? `@${username}` : "Hey"}, your message was removed.\n\n` +
                `REASON: Inappropriate language detected.\n\n` +
                `This is WARNING #1. We're building a positive community - keep it respectful!`
              );
            } else if (warningCount === 2) {
              await ctx.reply(
                `${username ? `@${username}` : "Hey"}, your message was removed.\n\n` +
                `REASON: Inappropriate language (second offense).\n\n` +
                `This is WARNING #2. One more = 1 hour mute. Keep it friendly!`
              );
            } else {
              // 3rd+ offense: mute for 1 hour
              const muteUntil = Math.floor(Date.now() / 1000) + 3600;
              await ctx.api.restrictChatMember(chatId, ctx.from.id, {
                can_send_messages: false,
                can_send_audios: false,
                can_send_documents: false,
                can_send_photos: false,
                can_send_videos: false,
                can_send_video_notes: false,
                can_send_voice_notes: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false
              }, { until_date: muteUntil });
              await ctx.reply(
                `${username ? `@${username}` : "User"} has been MUTED for 1 hour.\n\n` +
                `REASON: Third offense - inappropriate language.\n\n` +
                `You can read messages but cannot post. Admins have been notified.`
              );
              await flagForModReview(ctx, userIdStr, username || "", "[Hate speech - content hidden]", 90, "Repeated hate speech violations");
            }
          } catch (e) {
            console.log("Couldn't moderate hate speech");
          }
          return;
        }
        
        // 1F. Emoji spam detection
        if (feats.spam && detectEmojiSpam(text)) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, 'spamBlocked');
            // Silent delete for emoji spam - no message needed
          } catch (e) {
            console.log("Couldn't delete emoji spam");
          }
          return;
        }
        
        // === END PHASE 1 SECURITY CHECKS ===
        
        // 1. Rate limiting check (use stricter threshold in raid mode)
        const rateThreshold = settings.raidMode ? Math.max(3, settings.spamThreshold - 2) : settings.spamThreshold;
        const rateCheck = await checkRateLimit(userIdStr, chatIdStr, text, rateThreshold);
        if (feats.spam && rateCheck.blocked) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, rateCheck.reason === "flood" ? 'spamBlocked' : 'messagesBlocked');
            
            if (rateCheck.reason === "duplicate_spam") {
              await ctx.reply(`Slow down! Sending the same message repeatedly is not allowed.`);
            }
            // Silent delete for flood - just delete without message
          } catch (e) {
            console.log("Couldn't delete rate-limited message");
          }
          return; // Stop processing
        }
        
        // 2. Link restriction for new users
        const urlRegex = /https?:\/\/[^\s]+/gi;
        const urls = text.match(urlRegex) || [];
        if (feats.links && urls.length > 0) {
          // Get user moderation status to check join date and role
          await ensureUserModerationStatus(userIdStr, chatIdStr);
          const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
          const userJoinDate = userStatus?.joinDate || new Date();
          const hoursInChat = (Date.now() - new Date(userJoinDate).getTime()) / (1000 * 60 * 60);
          
          // Block links from new users (raid mode = stricter)
          const linkHoursLimit = settings.raidMode ? 48 : settings.newUserLinkHours;
          if (hoursInChat < linkHoursLimit && userStatus?.role === "newbie") {
            // Check if ALL links are allowed
            const allLinksAllowed = urls.every(url => 
              isAllowedUrl(url)
            );
            
            if (!allLinksAllowed) {
              try {
                await ctx.api.deleteMessage(chatId, ctx.message.message_id);
                await incrementModStat(chatIdStr, 'linksBlocked');
                await ctx.reply(`Links are restricted for new members during the first ${linkHoursLimit} hours. Ask an admin if you need to share a link!`);
              } catch (e) {
                console.log("Couldn't delete link from new user");
              }
              return;
            }
          }
        }
        
        // 3. Risk scoring for scam/phishing detection
        const userJoinDate = (await getUserModerationStatus(userIdStr, chatIdStr))?.joinDate || new Date();
        const accountAgeDays = (Date.now() - new Date(userJoinDate).getTime()) / (1000 * 60 * 60 * 24);
        const riskScore = feats.scam ? calculateRiskScore(text, username, accountAgeDays) : 0;
        
        // Raid mode = lower threshold for action
        const highRiskThreshold = settings.raidMode ? 40 : 60;
        const mediumRiskThreshold = settings.raidMode ? 25 : 40;
        
        if (riskScore >= highRiskThreshold) {
          // Auto-quarantine: delete message and flag
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, 'scamsBlocked');
            
            // Update user risk score
            await db.update(userModerationStatus)
              .set({ 
                riskScore: riskScore,
                isQuarantined: true,
                quarantineReason: `High risk score: ${riskScore}`
              })
              .where(and(
                eq(userModerationStatus.telegramUserId, userIdStr),
                eq(userModerationStatus.chatId, chatIdStr)
              ));
            
            await ctx.reply(`⚠️ Suspicious message blocked. Admins have been notified.`);
            await flagForModReview(ctx, userIdStr, username || "", text, riskScore, "High risk score - auto-quarantined");
          } catch (e) {
            console.log("Couldn't auto-quarantine high-risk message");
          }
          return;
        } else if (riskScore >= mediumRiskThreshold) {
          // Medium risk: flag for review but don't delete
          await flagForModReview(ctx, userIdStr, username || "", text, riskScore, "Medium risk score - flagged for review");
        }
      }
    }
    // === END ADVANCED MODERATION ===

    // Scam detection (existing - keep for backwards compatibility)
    const { isScam, flags } = detectScam(text, username);

    if (isScam && !hasFullCommunityTrust && !hasTrustedCommunityTrust) {
      const warningMessage = ctx.session.wardenMode
        ? wardenResponse(`SUSPICIOUS MESSAGE DETECTED!\n\nFlags:\n${flags.join("\n")}\n\nAdmins, please review!`)
        : `Suspicious message detected!\n\nFlags:\n${flags.join("\n")}\n\nAdmins, please review!`;

      await ctx.reply(warningMessage, { reply_parameters: { message_id: ctx.message.message_id } });
    }

    // Update user memory
    let userMem = ctx.session.userMemory.get(userId);
    if (!userMem) {
      userMem = { messageCount: 0, positiveScore: 0, negativeScore: 0, lastMessages: [], flaggedForTone: false };
      ctx.session.userMemory.set(userId, userMem);
    }
    userMem.messageCount++;
    userMem.lastMessages = [...userMem.lastMessages.slice(-4), text];
    
    // === TRUST ACTIVITY TRACKING ===
    // Only track in group chats (negative IDs are group chats)
    if (typeof chatId === 'number' && chatId < 0 && ctx.from?.id) {
      const chatIdStr = String(chatId);
      const userIdStr = String(ctx.from.id);
      const today = getTodayDateString();
      
      // Determine activity type
      const isReply = !!ctx.message.reply_to_message;
      const repliedToUserId = ctx.message.reply_to_message?.from?.id ? String(ctx.message.reply_to_message.from.id) : undefined;
      
      if (isReply && repliedToUserId && repliedToUserId !== userIdStr) {
        // Check if this is a unique interaction (first reply to this user today)
        const cacheKey = `${userIdStr}:${chatIdStr}`;
        let cache = uniqueInteractionsCache.get(cacheKey);
        
        // Reset cache if it's a new day
        if (!cache || cache.date !== today) {
          cache = { users: new Set<string>(), date: today };
          uniqueInteractionsCache.set(cacheKey, cache);
        }
        
        if (!cache.users.has(repliedToUserId)) {
          // First reply to this user today - track as unique interaction
          cache.users.add(repliedToUserId);
          await updateTrustActivity(userIdStr, chatIdStr, 'uniqueInteraction', text.length, repliedToUserId);
        } else {
          // Already replied to this user today - just track as regular reply
          await updateTrustActivity(userIdStr, chatIdStr, 'reply', text.length, repliedToUserId);
        }
      } else {
        // Regular message (not a reply)
        await updateTrustActivity(userIdStr, chatIdStr, 'message', text.length);
      }
    }

    // Track rudeness for EVERY message (not just ones we respond to)
    const { isRude, isNice } = detectRudeness(text);
    const rudenessStatus = await updateUserRudeness(userId, username, ctx.from?.first_name, isRude, isNice);

    // Skip if it's a command
    if (text.startsWith("/")) {
      await next();
      return;
    }

    const lowerText = text.toLowerCase();
    const firstName = ctx.from?.first_name || "friend";
    
    // === WARDEN MODE INTENSIFIER ===
    // When someone says "okay warden", "ok warden", "sure warden", etc. - she doubles down
    const wardenTriggers = ["okay warden", "ok warden", "sure warden", "whatever warden", "calm down warden", "chill warden", "relax warden"];
    const triggeredWarden = wardenTriggers.some(t => lowerText.includes(t));
    if (triggeredWarden) {
      const wardenModeResponse = WARDEN_MODE_RESPONSES[Math.floor(Math.random() * WARDEN_MODE_RESPONSES.length)];
      await ctx.reply(wardenModeResponse, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    
    // === CONVERSATIONAL TRIGGERS (no commands needed) ===
    // Check for casual greetings, info requests, games, help, etc.
    const conversational = detectConversationalTrigger(text);
    if (conversational.triggered && conversational.response) {
      // Add The Warden personality flair based on mood
      const mood = getWardenMood();
      let response = conversational.response;
      
      // 25% chance to add mood prefix to greetings
      if (conversational.category === "greeting" && Math.random() < 0.25 && mood.prefix) {
        response = `${mood.prefix}\n\n${response}`;
      }
      
      // Apply the Warden register if enabled
      response = ctx.session.wardenMode ? wardenResponse(response) : response;
      await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    
    // Winner schedule questions - respond with exact times (no AI needed)
    const winnerKeywords = ["winner", "winners", "leaderboard reset", "when is", "when are", "what time", "announce"];
    const scheduleKeywords = ["daily", "weekly", "monthly", "trivia", "puzzle", "reset"];
    const isWinnerQuestion = winnerKeywords.some(w => lowerText.includes(w)) && 
                             (scheduleKeywords.some(s => lowerText.includes(s)) || lowerText.includes("?"));
    
    if (isWinnerQuestion) {
      const scheduleCommunity = await getCommunity(String(chatId));
      const scheduleTimezone = scheduleCommunity?.timezone || COMMUNITY_TIMEZONE;
      const scheduleInfo = `Here's when winners are announced (all times ${scheduleTimezone}):

DAILY Winners: Every night at 11:55 PM
WEEKLY Winners: Sunday nights at 11:55 PM (before Monday reset)
MONTHLY Winners: Last day of the month at 11:55 PM (before the 1st)

Both Trivia and Puzzle games have separate leaderboards!

Check current standings anytime with /leaderboard (trivia) or /puzzleboard (puzzles).`;
      
      const response = ctx.session.wardenMode 
        ? wardenResponse(scheduleInfo)
        : scheduleInfo;
      
      await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    
    // Game rules questions - respond with how to play (no AI needed)
    const gameKeywords = ["how to play", "how do i play", "rules", "how does", "how do", "what is", "what's", "explain"];
    const triviaKeywords = ["trivia", "quiz"];
    const puzzleKeywords = ["puzzle", "word game", "scramble", "unscramble"];
    
    const isTriviaQuestion = gameKeywords.some(g => lowerText.includes(g)) && triviaKeywords.some(t => lowerText.includes(t));
    const isPuzzleQuestion = gameKeywords.some(g => lowerText.includes(g)) && puzzleKeywords.some(p => lowerText.includes(p));
    const isGeneralGameQuestion = lowerText.includes("games") && (lowerText.includes("how") || lowerText.includes("what") || lowerText.includes("play"));
    
    if (isTriviaQuestion || isPuzzleQuestion || isGeneralGameQuestion) {
      let gameInfo = "";
      
      if (isTriviaQuestion || isGeneralGameQuestion) {
        gameInfo += `TRIVIA GAME

How to play:
/trivia - Start a single question
/trivia 5 - Start a 5-question round (1-25 questions)

Answer by typing the letter (A, B, C, or D) in chat.
First correct answer wins the points!

Points: 10 per correct answer
Leaderboard: /leaderboard (daily/weekly/monthly rankings)

`;
      }
      
      if (isPuzzleQuestion || isGeneralGameQuestion) {
        gameInfo += `WORD PUZZLE

How to play:
/puzzle - Random difficulty
/puzzle easy - Easy mode (4-5 letters, 45 sec, 5 pts)
/puzzle hard - Hard mode (6-8 letters, 20 sec, 15 pts)

Unscramble the letters and type: /guess YOURWORD

Rules: One guess per round!
Leaderboard: /puzzleboard (daily/weekly/monthly rankings)

`;
      }
      
      const response = ctx.session.wardenMode 
        ? wardenResponse(gameInfo.trim())
        : gameInfo.trim();
      
      await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    
    // Determine if bot should respond. A direct tag/reply opens a 20-minute
    // per-user conversation session. Every message in that session extends it.
    let shouldRespond = false;
    let responseContext = "";
    let useWardenAttitude = false;
    const conversationChatId = chatId ?? "private";
    const directBotMention = lowerText.includes(`@${BOT_USERNAME.toLowerCase()}`) || lowerText.includes("warden");
    const replyToWarden = ctx.message.reply_to_message?.from?.id === ctx.me.id;
    let activeConversation = await getConversationState(conversationChatId, ctx.from?.id || userId);
    if (directBotMention || replyToWarden) {
      activeConversation = await activateConversation(conversationChatId, ctx.from?.id || userId);
    }
    const replyingToSomeoneElse = Boolean(ctx.message.reply_to_message?.from && ctx.message.reply_to_message.from.id !== ctx.me.id);
    if (activeConversation && !replyingToSomeoneElse) {
      shouldRespond = true;
      responseContext = "This member is in an active conversation with The Warden. Continue naturally from the recent turns instead of acting like every message is a new conversation.";
      useWardenAttitude = true;
    }
    
    // Respond when directly mentioned by name
    if (!shouldRespond && lowerText.includes("warden")) {
      shouldRespond = true;
      useWardenAttitude = true;
      responseContext = "Someone addressed the Warden directly. Answer plainly and briefly. No performance.";
    }
    // Respond when mentioned directly with @
    else if (!shouldRespond && lowerText.includes(`@${BOT_USERNAME.toLowerCase()}`)) {
      shouldRespond = true;
      responseContext = "User tagged the bot. Answer plainly and briefly.";
    }
    // Respond to questions about Boomerverse project
    else if (!shouldRespond && (lowerText.includes("boomerverse") || lowerText.includes("nft"))) {
      shouldRespond = true;
      responseContext = "User curious about the project - be helpful but make it fun and cheeky!";
    }
    // Respond to direct questions
    else if (!shouldRespond && text.includes("?")) {
      shouldRespond = true;
      responseContext = "Someone has questions! Answer with sass and a witty twist";
    }
    // Respond to simple greetings (just "hi", "hello", etc. by themselves)
    else if (!shouldRespond && /^(hi|hello|hey|yo|sup|gm|good morning|good evening)$/i.test(lowerText.trim())) {
      shouldRespond = true;
      responseContext = "New friend alert! Give them a fun, cheeky welcome that makes them smile";
    }
    // Respond to replies to the bot's messages
    else if (!shouldRespond && ctx.message.reply_to_message?.from?.is_bot) {
      shouldRespond = true;
      responseContext = "They're talking back to The Warden! Match their energy with playful banter";
    }
    // Engage with longer messages (15% chance)
    else if (!shouldRespond && text.length > 50 && Math.random() < 0.10) {
      shouldRespond = true;
      responseContext = "Time to jump into the convo with a witty observation or cheeky comment!";
    }
    
    if (shouldRespond) {
      let response: string;
      const displayName = username ? `@${username}` : firstName;
      const recentConversation = activeConversation?.turns?.length
        ? activeConversation.turns.map(t => `${t.role === "user" ? displayName : "Warden"}: ${t.content}`).join("\n")
        : "";
      const authorityContext = rolePersonalityContext(ctx.from?.id, username);
      const trackingUserId = ctx.from?.id?.toString() || "";
      const chatIdStr = chatId ? String(chatId) : "";
      // Fetch feature flags once — used for personality, learning, and milestone gating
      const _chatFeats = chatIdStr ? await getFeatureSettings(chatIdStr) : { ...DEFAULT_FEATURE_SETTINGS };
      
      // Track user interaction and check milestones
      let newMsgCount = 0;
      if (trackingUserId) {
        try {
          newMsgCount = await trackUserInteraction(trackingUserId, text, username, firstName);
          // Check for milestone celebrations (personality feature)
          const milestone = _chatFeats.personality ? checkMilestone(newMsgCount) : null;
          if (milestone) {
            await ctx.reply(`${displayName} ${milestone}`, { reply_parameters: { message_id: ctx.message.message_id } });
          }
        } catch (e) {
          // Silent fail - milestones are non-critical
        }
      }
      
      // Check for returning user context and durable member memory. The short greeting
      // is occasional; the compact memory context is available to the AI every time.
      const returningContext = trackingUserId ? await getReturningUserContext(trackingUserId) : null;
      const memberMemoryContext = trackingUserId ? await getMemberMemoryContext(trackingUserId, chatIdStr) : "";
      
      // Use the rudeness status already computed earlier for this message
      const rudenessContext = getWardenRudenessContext(rudenessStatus, isRude);
      
      if (useWardenAttitude) {
        // When someone mentions "warden", answer their question/message helpfully (like /ask) but with The Warden personality
        // Remove "warden" from the message to get the actual question
        const questionText = text.replace(/warden/gi, '').trim() || text;
        
        // Check for games questions - instant response (compute once)
        const gamesResult = detectGamesQuery(text);

        if (gamesResult.isGames && gamesResult.response) {
          response = gamesResult.response;
        } else {
          // Check knowledge bases FIRST (zero API cost)
          const knowledgeResult = checkKnowledgeBases(questionText);
          if (knowledgeResult) {
            // Add returning user context if available
            response = returningContext ? `${returningContext}\n\n${knowledgeResult}` : knowledgeResult;
          } else {
            // Try learned response first (saves API costs, gated by learning toggle)
            const learnedResponse = _chatFeats.learning ? await BotMemory.getLearnedResponse(questionText) : null;
            if (learnedResponse) {
              response = learnedResponse;
              if (returningContext) response = `${returningContext}\n\n${response}`;
            } else {
              const fullContext = rudenessContext 
                ? `${authorityContext}\n${memberMemoryContext ? `${memberMemoryContext}\n` : ""}${recentConversation ? `Recent conversation:\n${recentConversation}\n` : ""}${rudenessContext}\n\nAnswer the user's question or respond helpfully. Keep the conversation natural. Address them as ${displayName}.`
                : `${authorityContext}\n${memberMemoryContext ? `${memberMemoryContext}\n` : ""}${recentConversation ? `Recent conversation:\n${recentConversation}\n` : ""}Answer the user's question or respond helpfully. Keep the conversation natural, with Warden personality. Address them as ${displayName}.`;
              response = await getAIResponse(questionText, fullContext);
              // Add returning user context if available
              if (returningContext) response = `${returningContext}\n\n${response}`;
            }
          }
        }
      } else {
        // Check knowledge bases FIRST (zero API cost)
        const knowledgeResult = checkKnowledgeBases(text);
        if (knowledgeResult) {
          response = knowledgeResult;
        } else {
          const fullContext = rudenessContext 
            ? `${authorityContext}\n${memberMemoryContext ? `${memberMemoryContext}\n` : ""}${recentConversation ? `Recent conversation:\n${recentConversation}\n` : ""}${rudenessContext}\n\n${responseContext}. Address them as ${displayName}.`
            : `${authorityContext}\n${memberMemoryContext ? `${memberMemoryContext}\n` : ""}${recentConversation ? `Recent conversation:\n${recentConversation}\n` : ""}${responseContext}. Address them as ${displayName}. Keep it natural, useful and personable.`;
          
          // Try learned response first (saves API costs, gated by learning toggle)
          const learnedResponse = _chatFeats.learning ? await BotMemory.getLearnedResponse(text) : null;
          if (learnedResponse) {
            response = learnedResponse;
          } else {
            response = await getAIResponse(text, fullContext);
          }
        }
      }
      
      // Add The Warden personality flair (catchphrases, gags) - 15% chance for each
      if (_chatFeats.personality) {
        response = addWardenFlair(response, { includeCatchphrase: true, includeGag: true });
      }
      
      if (directBotMention || replyToWarden || activeConversation) {
        await saveConversationTurn(conversationChatId, ctx.from?.id || userId, text, response);
      }

      // Save interaction for learning (only when learning toggle is ON)
      const interactionId = _chatFeats.learning ? await BotMemory.saveInteraction(
        chatIdStr,
        trackingUserId,
        username,
        text,
        response,
        'ai'
      ) : null;
      
      // Send response with feedback buttons (if interaction saved)
      if (interactionId) {
        await ctx.reply(response, { 
          reply_parameters: { message_id: ctx.message.message_id },
          reply_markup: {
            inline_keyboard: [[
              { text: "+1", callback_data: `feedback:up:${interactionId}` },
              { text: "-1", callback_data: `feedback:down:${interactionId}` }
            ]]
          }
        });
      } else {
        await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      }
    }

    await next();
  });

  return bot;
}

// === QUOTE OF THE DAY ===
const DAILY_QUOTES = [
  // Original lines written for the Warden. Gateway register: dry, wry, a bit
  // military, occasionally funny. Not sourced from any existing work.
  { quote: "Every gate is a door somebody decided to stop being afraid of.", author: "The Warden" },
  { quote: "Standard procedure exists because somebody once did the other thing.", author: "The Warden" },
  { quote: "Nothing dangerous ever announces itself. That's what makes it dangerous.", author: "The Warden" },
  { quote: "Curiosity is not a plan. It is, however, how most plans start.", author: "The Warden" },
  { quote: "Write it down. Memory is the least reliable witness you will ever call.", author: "The Warden" },
  { quote: "The first rule of going somewhere new is knowing the way back.", author: "The Warden" },
  { quote: "Half of courage is admitting out loud that you don't know yet.", author: "The Warden" },
  { quote: "A thing being old does not make it wise. It makes it old.", author: "The Warden" },
  { quote: "If the readings look perfect, check the instrument.", author: "The Warden" },
  { quote: "Ask the question badly and you'll get an answer worse.", author: "The Warden" },
  { quote: "There is no such thing as a small breach. Only an early one.", author: "The Warden" },
  { quote: "Patience is a tactic, not a personality.", author: "The Warden" },
  { quote: "Most disasters are three small decisions in a row.", author: "The Warden" },
  { quote: "Curiosity opened it. Discipline is what closes it again.", author: "The Warden" },
  { quote: "You can be certain or you can be correct. Occasionally both.", author: "The Warden" },
  { quote: "The record is not there to flatter anyone. Including me.", author: "The Warden" },
  { quote: "Report what happened, not what you meant to happen.", author: "The Warden" },
  { quote: "A quiet watch is not a wasted one.", author: "The Warden" },
  { quote: "Anything worth guarding was worth building.", author: "The Warden" },
  { quote: "Do the boring checks. The boring checks are the job.", author: "The Warden" },
  { quote: "Two people who agree instantly have usually not understood each other.", author: "The Warden" },
  { quote: "Volume is not evidence.", author: "The Warden" },
  { quote: "The map is a rumour until you've walked it.", author: "The Warden" },
  { quote: "Every legend started as a poorly written field report.", author: "The Warden" },
  { quote: "Assume the thing you didn't check is the thing that fails.", author: "The Warden" },

  // The odd funny one. Still dry — the Warden doesn't do punchlines.
  { quote: "Nobody has ever improved a situation by touching it first and asking later.", author: "The Warden" },
  { quote: "I have never once regretted taking the extra thirty seconds.", author: "The Warden" },
  { quote: "The universe is enormous and largely uninterested in your schedule.", author: "The Warden" },
  { quote: "Yes, it's fine. That's the phrase, isn't it. Right before it isn't.", author: "The Warden" },
  { quote: "If it required a running start, it was probably not the plan.", author: "The Warden" },
  { quote: "I've read the incident log. I'd rather not be in it.", author: "The Warden" },
  { quote: "Confidence is cheap. It's the follow-up paperwork that costs.", author: "The Warden" },
  { quote: "You are allowed to be wrong. You are not allowed to be loud about it twice.", author: "The Warden" },
  { quote: "Somebody always presses the thing. It is never the person who understands it.", author: "The Warden" },
  { quote: "The bush does not care that you have a schedule either.", author: "The Warden" },

  // Australian country. The actual subject matter of this universe.
  { quote: "Country keeps its own time. You either match it or you lose.", author: "The Warden" },
  { quote: "Fire is not the end of a forest here. Often it's the beginning.", author: "The Warden" },
  { quote: "The oldest living thing you'll ever stand next to won't announce itself.", author: "The Warden" },
  { quote: "Extinct is a word we use when we've stopped looking properly.", author: "The Warden" },
  { quote: "Something can be gone for ninety years and still be reported every winter.", author: "The Warden" },
  { quote: "Protect the small unglamorous ones. Nobody else is going to.", author: "The Warden" },
  { quote: "A species doesn't vanish in a day. It vanishes in decisions.", author: "The Warden" },
  { quote: "Wind off the water, salt in it, and nothing between here and the ice.", author: "The Warden" },
  { quote: "Rain, then more rain, then a clear hour that makes up for both.", author: "The Warden" },
  { quote: "The quiet in the bush is not empty. It's occupied.", author: "The Warden" },
  { quote: "Old growth is a library nobody's finished reading.", author: "The Warden" },
  { quote: "You can replant a tree. You cannot replant four thousand years.", author: "The Warden" },
  { quote: "Track it, log it, leave it alone. That's most of conservation.", author: "The Warden" },
  { quote: "The island keeps what the mainland let go.", author: "The Warden" },
  { quote: "Every stripe on that animal was a fact once. Now it's a story.", author: "The Warden" },
];

let lastQuoteIndex = -1;
let lastQuotePostDate = "";

function getRandomQuote(): typeof DAILY_QUOTES[0] {
  let index = Math.floor(Math.random() * DAILY_QUOTES.length);
  if (index === lastQuoteIndex && DAILY_QUOTES.length > 1) {
    index = (index + 1) % DAILY_QUOTES.length;
  }
  lastQuoteIndex = index;
  return DAILY_QUOTES[index];
}

async function postDailyQuote() {
  if (!botInstance) return;
  
  const quote = getRandomQuote();
  const message = `QUOTE OF THE DAY\n\n"${quote.quote}"\n\n— ${quote.author}`;
  
  let postedCount = 0;
  for (const chatId of Array.from(activeChats)) {
    const feats = await getFeatureSettings(chatId.toString());
    if (!feats.scheduled) continue;
    botInstance.api.sendMessage(chatId, message).catch((err) => {
      console.error(`Failed to send quote to chat ${chatId}:`, err);
      if (err.description?.includes("chat not found") || err.description?.includes("bot was blocked")) {
        void removeActiveChat(chatId);
      }
    });
    postedCount++;
  }
  
  console.log(`Posted daily quote to ${postedCount} chats (${activeChats.size} total): "${quote.quote.substring(0, 30)}..."`);
}


// === WORD PUZZLE GAME ===
// Word lengths: min 2 chars, max 11 chars
const EASY_WORDS = [
  "EMU", "ROO", "JOEY", "BAT", "OWL", "COD", "EEL", "RAT",
  "FOX", "CAT", "DOG", "PIG", "COW", "EWE", "RAM", "SOW",
  "CROW", "DOVE", "DUCK", "SWAN", "GULL", "TERN", "IBIS", "KITE",
  "HAWK", "WREN", "ROBIN", "FINCH", "QUAIL", "SNIPE", "HERON", "EGRET",
  "CRANE", "EAGLE", "GALAH", "KOALA", "DINGO", "BILBY", "QUOLL", "YABBY",
  "WHALE", "SHARK", "SKATE", "SEAL", "CRAB", "FISH", "SQUID", "KRILL",
  "MOTH", "BEE", "ANT", "WASP", "WORM", "SNAIL", "SLUG", "FROG",
  "TOAD", "SKINK", "GECKO", "SNAKE", "ADDER", "GRUB", "LARVA", "HIVE",
  "GUM", "FERN", "MOSS", "REED", "SEDGE", "HAKEA", "MULGA", "BOAB",
  "PINE", "OAK", "PALM", "VINE", "HERB", "ROOT", "BARK", "LEAF",
  "TWIG", "SEED", "BUD", "POD", "LOG", "BUSH", "SCRUB", "HEATH",
  "GRASS", "WEED", "ALGAE", "KELP", "FUNGI", "SPORE", "TREE", "WOOD",
  "SAP", "RESIN", "PETAL", "BLOOM", "FLORA", "FAUNA", "SHOOT", "STEM",
  "THORN", "HUSK", "NUT", "BERRY", "BAY", "CAPE", "COVE", "DUNE",
  "REEF", "TARN", "LAKE", "POND", "POOL", "CREEK", "RIVER", "DELTA",
  "MARSH", "SWAMP", "BOG", "FEN", "PEAT", "PLAIN", "VALE", "GLEN",
  "GORGE", "PASS", "SPUR", "RIDGE", "PEAK", "MOUNT", "CLIFF", "CRAG",
  "SCREE", "ROCK", "STONE", "SAND", "MUD", "SILT", "CLAY", "OCHRE",
  "CAVE", "ISLE", "COAST", "SHORE", "TIDE", "WAVE", "SURF", "FOAM",
  "SALT", "BRINE", "INLET", "BLUFF", "BANK", "SHOAL", "RAIN", "MIST",
  "FOG", "HAZE", "WIND", "GALE", "STORM", "HAIL", "SNOW", "ICE",
  "FROST", "THAW", "SUN", "MOON", "STAR", "SKY", "CLOUD", "DAWN",
  "DUSK", "NOON", "NIGHT", "DAY", "HEAT", "COLD", "DRY", "WET",
  "FIRE", "ASH", "SMOKE", "EMBER", "FLAME", "BURN", "CHAR", "SLEET",
  "DEW", "GUST", "CAMP", "TENT", "SWAG", "BILLY", "MATE", "TRACK",
  "TRAIL", "PATH", "ROAD", "FORD", "HUT", "GATE", "FENCE", "YARD",
  "FARM", "CROP", "HERD", "MOB", "FLOCK", "PACK", "NEST", "DEN",
  "LAIR", "EGG", "WING", "BEAK", "CLAW", "PAW", "FUR", "PELT",
  "TAIL", "EAR", "HORN", "TUSK", "PREY", "HUNT", "FEED", "GRAZE",
  "ROAM", "RANGE", "SCAT", "SPOOR", "HIDE", "PERCH", "ROOST", "RIFT",
  "KEY", "RELIC", "MYTH", "LORE", "TALE", "CANON", "RARE", "EPIC",
  "MINT", "DROP", "BASE", "NORTH", "SOUTH", "EAST", "WEST", "WILD",
  "VAST", "WIDE", "DEEP", "HIGH", "LOW", "OLD", "NEW", "LOST",
  "QUIET", "STILL", "BLEAK", "HARSH", "ROUGH", "SHARP", "CLEAR", "GREEN",
  "GREY", "BROWN", "BLACK", "WHITE", "GOLD", "RUST", "AMBER", "SLATE",
  "PALE", "DARK", "COOL", "MILD", "RAW", "DERBY", "PERTH", "DOVER",
  "LUNE", "AXE", "HOE", "PEG", "ROPE", "KNOT", "BOAT", "RAFT",
  "OAR", "SAIL", "MAST", "NET", "HOOK", "LINE", "BAIT", "TRAP",
  "CAGE", "PEN", "STY", "BARN", "SHED", "POST", "RAIL", "WIRE",
  "MESH", "STAKE", "TARP", "CORD", "TWINE", "MOLE", "HARE", "DEER",
  "GOAT", "MULE", "PONY", "FOAL", "CALF", "LAMB", "CHICK", "DRAKE",
  "HEN", "COCK", "BULL", "STAG", "DOE", "FAWN", "CUB", "PUP",
  "KIT", "BROOD", "SWARM", "LARK", "SWIFT", "PIPIT", "STILT", "COOT",
  "GREBE", "SKUA", "NODDY", "MYNA", "BASS", "BREAM", "TROUT", "SOLE",
  "LING", "HAKE", "TUNA", "PRAWN", "CLAM", "WHELK", "POLYP", "MESA",
  "BUTTE", "KNOLL", "RISE", "SLOPE", "BASIN", "CHASM", "SCARP", "LEDGE",
  "SHELF", "FLAT", "OASIS", "WADI", "GULLY", "DITCH", "DRAIN", "WEIR",
  "DAM", "LEVEE", "BUND", "SLUSH", "CHILL", "BLAZE", "GLOW", "BEAM",
  "SHADE", "GLARE", "GLINT", "UMBER", "SEPIA", "IVORY", "EBONY", "JADE",
  "TEAL", "AQUA", "LIME", "TAWNY", "DUSKY", "MURKY", "HAZY", "MISTY",
  "WINDY", "STONY", "ROCKY", "SANDY", "MUDDY", "LEAFY", "MOSSY", "WEEDY",
  "REEDY", "SOAR", "GLIDE", "DIVE", "SWIM", "WADE", "CRAWL", "CREEP",
  "LEAP", "BOUND", "DART", "DASH", "FLIT", "REAR", "BREED", "MOULT",
  "GROW", "WILT", "DECAY", "BLOKE", "YARN", "CHOOK", "ESKY", "THONG",
  "SCONE", "ROAST", "BREW", "TEA", "MUG", "PAN", "FLASK", "FEAST",
  "SNACK", "BOOM", "VERSE", "GENE", "TIER", "SET", "ART", "SIGIL",
  "GLYPH", "RUNE", "MARK", "CHAIN", "BLOCK", "PROOF", "TRACE"
];

const HARD_WORDS = [
  "THYLACINE", "PADEMELON", "WOMBAT", "ECHIDNA", "PLATYPUS", "POSSUM", "BANDICOOT", "POTOROO",
  "BETTONG", "NUMBAT", "DUNNART", "ANTECHINUS", "WALLABY", "KANGAROO", "WALLAROO", "QUOKKA",
  "GLIDER", "RINGTAIL", "BRUSHTAIL", "MARSUPIAL", "MONOTREME", "MACROPOD", "DASYURID", "DOLPHIN",
  "HUMPBACK", "SEALION", "PLATYPI", "FORESTER", "KOOKABURRA", "CURRAWONG", "PARDALOTE", "HONEYEATER",
  "LYREBIRD", "BOWERBIRD", "COCKATOO", "ROSELLA", "LORIKEET", "PARAKEET", "BUDGERIGAR", "PENGUIN",
  "ALBATROSS", "PELICAN", "CORMORANT", "SHEARWATER", "MUTTONBIRD", "BITTERN", "GOSHAWK", "KESTREL",
  "FALCON", "OSPREY", "PLOVER", "DOTTEREL", "SANDPIPER", "SPOONBILL", "THORNBILL", "SILVEREYE",
  "FANTAIL", "WHISTLER", "BUTCHERBIRD", "MAGPIE", "FIRETAIL", "SCRUBWREN", "NIGHTJAR", "GOANNA",
  "MONITOR", "PERENTIE", "TAIPAN", "TIGERSNAKE", "COPPERHEAD", "CROCODILE", "TORTOISE", "TURTLE",
  "STINGRAY", "SEAHORSE", "SEADRAGON", "GALAXIAS", "WHITEBAIT", "CRAYFISH", "LOBSTER", "ABALONE",
  "URCHIN", "EUCALYPT", "BANKSIA", "WARATAH", "GREVILLEA", "MELALEUCA", "CALLISTEMON", "CASUARINA",
  "LEATHERWOOD", "SASSAFRAS", "MYRTLE", "ACACIA", "WATTLE", "PAPERBARK", "IRONBARK", "STRINGYBARK",
  "BOTTLEBRUSH", "BUTTONGRASS", "SPHAGNUM", "SPINIFEX", "SALTBUSH", "TUSSOCK", "ORCHID", "EPACRIS",
  "RICHEA", "TELOPEA", "LOMATIA", "EUCRYPHIA", "NOTHOFAGUS", "CONIFER", "PIGFACE", "BRACKEN",
  "WATTLEBIRD", "BLACKWOOD", "CELERYTOP", "PENCILPINE", "HUONPINE", "BLUEGUM", "SNOWGUM", "MOUNTAINASH",
  "LICHEN", "RAINFOREST", "MOORLAND", "WOODLAND", "GRASSLAND", "HEATHLAND", "MANGROVE", "SEAGRASS",
  "WETLAND", "ESTUARY", "CATCHMENT", "CORRIDOR", "SANCTUARY", "RESERVE", "HERITAGE", "WILDERNESS",
  "ECOSYSTEM", "BIOSPHERE", "HABITAT", "ENDEMIC", "EXTINCT", "POLLINATOR", "MIGRATION", "BREEDING",
  "NESTING", "FORAGING", "NOCTURNAL", "CARNIVORE", "HERBIVORE", "OMNIVORE", "SCAVENGER", "PREDATOR",
  "INVASIVE", "REWILDING", "INSURANCE", "GENETICS", "GENOMICS", "DIVERSITY", "THREATENED", "VULNERABLE",
  "CRITICAL", "RECOVERY", "MONITORING", "POPULATION", "SURVIVAL", "EXTINCTION", "PROTECTED", "NATIVE",
  "COLONY", "BURROW", "WARREN", "ROOKERY", "CLUTCH", "HATCHING", "JUVENILE", "DORMANCY",
  "TORPOR", "HIBERNATE", "FLEDGLING", "BIOMASS", "CANOPY", "HOBART", "BURNIE", "DEVONPORT",
  "LAUNCESTON", "STRAHAN", "ZEEHAN", "WYNYARD", "SMITHTON", "STANLEY", "ULVERSTONE", "SORELL",
  "RICHMOND", "BICHENO", "SWANSEA", "OATLANDS", "ROSEBERY", "TULLAH", "SCOTTSDALE", "GEEVESTON",
  "HUONVILLE", "CYGNET", "MAYDENA", "BOTHWELL", "LONGFORD", "EVANDALE", "DELORAINE", "QUEENSTOWN",
  "CRADLE", "FRANKLIN", "GORDON", "TARKINE", "FREYCINET", "MACQUARIE", "OVERLAND", "OUTBACK",
  "BUSHLAND", "KIMBERLEY", "NULLARBOR", "GONDWANA", "DAINTREE", "BOOMERVERSE", "GENESIS", "GATEWAY",
  "LEGENDARY", "UNCOMMON", "MYTHIC", "COMMON", "COLLECTOR", "ROYALTY", "ELIGIBLE", "REGISTRY",
  "RULEBOOK", "WHITEPAPER", "WARDEN", "UNDERSTORY", "MIDSTORY", "SEEDBANK", "NURSERY", "SEEDLING",
  "SAPLING", "PLANTING", "REVEGETATE", "RESTORE", "REGROWTH", "OLDGROWTH", "DEADWOOD", "HOLLOWS",
  "TREEFERN", "WATERSHED", "TRIBUTARY", "FLOODPLAIN", "RIPARIAN", "WETLANDS", "LAGOON", "SALTMARSH",
  "SANDBAR", "HEADLAND", "PENINSULA", "ARCHIPELAGO", "ISTHMUS", "PLATEAU", "ESCARPMENT", "MOUNTAIN",
  "FOOTHILL", "VALLEY", "CANYON", "CAVERN", "SINKHOLE", "GLACIER", "MORAINE", "DOLERITE",
  "GRANITE", "BASALT", "SANDSTONE", "LIMESTONE", "QUARTZITE", "MINERAL", "SEDIMENT", "EROSION",
  "WEATHERING", "RAINFALL", "MONSOON", "CYCLONE", "DROUGHT", "BUSHFIRE", "WILDFIRE", "FIRESTICK",
  "BACKBURN", "SMOULDER", "TEMPERATE", "SUBALPINE", "ALPINE", "TROPICAL", "MARITIME", "SEASONAL",
  "CLIMATE", "BIOLOGY", "ECOLOGY", "ZOOLOGY", "BOTANY", "TAXONOMY", "SPECIES", "SUBSPECIES",
  "FAMILY", "HABITATS", "FORAGE", "PREDATION", "SYMBIOSIS", "MUTUALISM", "KEYSTONE", "ENDANGERED",
  "EXTIRPATE", "CAPTIVE", "RELEASE", "SURVEY", "TAGGING", "TRACKING", "CAMERATRAP", "FIELDWORK",
  "RANGER", "CUSTODIAN", "STEWARD", "TASMANIA", "AUSTRALIA", "VICTORIA", "QUEENSLAND", "CANBERRA",
  "ADELAIDE", "BRISBANE", "MELBOURNE", "SYDNEY", "DARWIN", "TASMAN", "FLINDERS", "FURNEAUX",
  "RAILTON", "SHEFFIELD", "LATROBE", "SOMERSET", "MOLECREEK", "LIFFEY", "MERSEY", "CORINNA",
  "MARRAWAH", "BOOBOOK", "PARROT", "PIGEON", "BRONZEWING", "TREEFROG", "FROGMOUTH", "SEAEAGLE"
];

// Serializable — the puzzle must survive between serverless invocations.
interface ActivePuzzle {
  word: string;
  scrambled: string;
  difficulty: 'easy' | 'hard';
  startTime: number;
  deadline: number;          // replaces the old setTimeout
  timeLimit: number;
  points: number;
  answeredUsers: number[];
  solved: boolean;
  solverName?: string;
}

const puzzleKey = (chatId: number | string) => `w:puzzle:${chatId}`;
const puzzleWordsKey = (chatId: number | string) => `w:puzzlewords:${chatId}`;
const MAX_RECENT_PUZZLE_WORDS = 100;

async function getPuzzle(chatId: number): Promise<ActivePuzzle | null> {
  return await stateGet<ActivePuzzle | null>(puzzleKey(chatId), null);
}
async function savePuzzle(chatId: number, p: ActivePuzzle): Promise<void> {
  await stateSet(puzzleKey(chatId), p, 60 * 60);
}
async function clearPuzzle(chatId: number): Promise<void> {
  await stateDel(puzzleKey(chatId));
}

async function getUnusedPuzzleWord(chatId: number, wordList: string[]): Promise<string> {
  const recentWords = await stateGet<string[]>(puzzleWordsKey(chatId), []);

  const availableWords = wordList.filter(w => !recentWords.includes(w));

  // Nearly everything used — start the history over
  if (availableWords.length < 5) {
    await stateSet(puzzleWordsKey(chatId), [], 30 * 24 * 60 * 60);
    return wordList[Math.floor(Math.random() * wordList.length)];
  }

  const word = availableWords[Math.floor(Math.random() * availableWords.length)];

  recentWords.push(word);
  while (recentWords.length > MAX_RECENT_PUZZLE_WORDS) recentWords.shift();
  await stateSet(puzzleWordsKey(chatId), recentWords, 30 * 24 * 60 * 60);

  return word;
}

function scrambleWord(word: string): string {
  const chars = word.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const scrambled = chars.join('');
  if (scrambled === word && word.length > 2) {
    return scrambleWord(word);
  }
  return scrambled;
}

function getWeekNumberForPuzzle(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function getOrCreatePuzzleScore(telegramUserId: string, chatId: string, username: string, firstName: string) {
  const existing = await db.select().from(memberScores)
    .where(and(
      eq(memberScores.telegramUserId, telegramUserId),
      eq(memberScores.chatId, chatId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const inserted = await db.insert(memberScores)
    .values({
      telegramUserId,
      chatId,
      username,
      firstName,
      messageCount: 0,
      triviaPoints: 0,
      triviaCorrect: 0,
      triviaAttempts: 0,
      puzzlePoints: 0,
      puzzleCorrect: 0,
      puzzleAttempts: 0
    })
    .returning();
  
  return inserted[0];
}

async function updatePuzzleScore(telegramUserId: string, chatId: string, earnedPoints: number) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekNum = getWeekNumberForPuzzle(now);
  const weekStr = `${now.getFullYear()}-W${weekNum}`;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const score = await db.select().from(memberScores)
    .where(and(
      eq(memberScores.telegramUserId, telegramUserId),
      eq(memberScores.chatId, chatId)
    ))
    .limit(1);
  
  if (score.length === 0) return;
  
  const s = score[0];
  const newPuzzlePoints = (s.puzzlePoints || 0) + earnedPoints;
  const newPuzzleCorrect = (s.puzzleCorrect || 0) + 1;
  const newPuzzleAttempts = (s.puzzleAttempts || 0) + 1;
  
  const newPuzzleDailyPoints = s.puzzleDailyResetDate === todayStr 
    ? (s.puzzleDailyPoints || 0) + earnedPoints 
    : earnedPoints;
  const newPuzzleWeeklyPoints = s.puzzleWeeklyResetDate === weekStr 
    ? (s.puzzleWeeklyPoints || 0) + earnedPoints 
    : earnedPoints;
  const newPuzzleMonthlyPoints = s.puzzleMonthlyResetDate === monthStr 
    ? (s.puzzleMonthlyPoints || 0) + earnedPoints 
    : earnedPoints;
  
  await db.update(memberScores)
    .set({
      puzzlePoints: newPuzzlePoints,
      puzzleCorrect: newPuzzleCorrect,
      puzzleAttempts: newPuzzleAttempts,
      puzzleDailyPoints: newPuzzleDailyPoints,
      puzzleDailyResetDate: todayStr,
      puzzleWeeklyPoints: newPuzzleWeeklyPoints,
      puzzleWeeklyResetDate: weekStr,
      puzzleMonthlyPoints: newPuzzleMonthlyPoints,
      puzzleMonthlyResetDate: monthStr
    })
    .where(and(
      eq(memberScores.telegramUserId, telegramUserId),
      eq(memberScores.chatId, chatId)
    ));
}

async function incrementPuzzleAttempt(telegramUserId: string, chatId: string) {
  await db.update(memberScores)
    .set({
      puzzleAttempts: sql`COALESCE(puzzle_attempts, 0) + 1`
    })
    .where(and(
      eq(memberScores.telegramUserId, telegramUserId),
      eq(memberScores.chatId, chatId)
    ));
}

// === BIRTHDAY CELEBRATION ===
let lastBirthdayCheckDate = "";

function birthdayDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: COMMUNITY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(p => p.type === "year")?.value || date.getUTCFullYear());
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  return { year, month, day, mmdd: `${month}-${day}` };
}

// Telegram Bot API ChatFullInfo can expose a private user's birthdate when
// their privacy settings make it visible. Check at most once per day and cache
// the result into our community profile. If Telegram doesn't expose it, the
// existing /setbirthday command remains the explicit fallback.
async function syncBirthdayFromTelegramProfile(ctx: MyContext): Promise<void> {
  if (!ctx.from?.id || ctx.from.is_bot) return;
  const userId = String(ctx.from.id);
  const syncKey = KEYS.birthdayProfileSync(userId);
  if (await stateGet<boolean>(syncKey, false)) return;
  await stateSet(syncKey, true, TTL.birthdayProfileSync);

  try {
    const full = await ctx.api.getChat(ctx.from.id) as any;
    const birthdate = full?.birthdate;
    if (!birthdate?.month || !birthdate?.day) return;

    const birthday = `${String(birthdate.month).padStart(2, "0")}-${String(birthdate.day).padStart(2, "0")}`;
    const chatId = ctx.chat?.id?.toString() || "";
    const existing = await db.select().from(communityProfiles)
      .where(eq(communityProfiles.telegramUserId, userId)).limit(1);

    if (existing.length > 0) {
      await db.update(communityProfiles).set({
        birthday,
        chatId: chatId || existing[0].chatId,
        username: ctx.from.username || existing[0].username || "",
        firstName: ctx.from.first_name || existing[0].firstName || "",
      }).where(eq(communityProfiles.telegramUserId, userId));
    } else {
      await db.insert(communityProfiles).values({
        telegramUserId: userId, chatId,
        username: ctx.from.username || "", firstName: ctx.from.first_name || "", birthday,
      });
    }
  } catch {
    // Normal when the user's birthdate is private/not available to the bot.
  }
}

async function maybeSendBirthdayArrivalGreeting(ctx: MyContext): Promise<void> {
  if (!ctx.from?.id || ctx.from.is_bot || !ctx.chat?.id || ctx.chat.id >= 0) return;

  await syncBirthdayFromTelegramProfile(ctx);

  const userId = String(ctx.from.id);
  const profileRows = await db.select().from(communityProfiles)
    .where(eq(communityProfiles.telegramUserId, userId)).limit(1);
  const profile = profileRows[0];
  if (!profile?.birthday) return;

  const today = birthdayDateParts();
  if (profile.birthday !== today.mmdd) return;

  const key = KEYS.birthdayArrival(ctx.chat.id, userId, today.year);
  if (await stateGet<boolean>(key, false)) return;
  await stateSet(key, true, TTL.birthdayArrival);

  const who = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || "birthday legend");
  let msg = `🎂 OI — ${who} just walked into chat ON THEIR BIRTHDAY.\n\n`;
  msg += `Happy birthday from the Rift, ${who}. The Warden has checked the records: today you are officially allowed a little more chaos than usual.`;
  if (profile.location) msg += `\n\nBirthday signal reaching all the way to ${profile.location}.`;
  if (profile.likes) msg += `\nAnd I remember you're into ${profile.likes} — so I hope there is a decent helping of that in the day.`;
  msg += `\n\nHave a bloody great one. The Gateway is still standing, the community is here, and for today at least I'll pretend the paperwork can wait. 🎉`;

  try {
    await ctx.reply(msg);
  } catch (err) {
    console.error("Birthday arrival greeting failed:", err);
  }
}

async function generateBirthdayCakeImage(username: string): Promise<Buffer | null> {
  try {
    const prompt = `A delicious colorful birthday cake with lit candles, decorated with "Happy Birthday ${username}!" written in icing. Australian native flowers as decoration. Cheerful party atmosphere with confetti. Photorealistic, appetizing, celebratory.`;
    const buffer = await generateImageBuffer(prompt, "1024x1024");
    return buffer;
  } catch (error) {
    console.error("Error generating birthday cake image:", error);
    return null;
  }
}

async function checkBirthdays() {
  if (!botInstance) return;
  
  // Use the community timezone (Tasmania by default), not the server/Vercel timezone.
  const today = birthdayDateParts();
  const todayMMDD = today.mmdd;
  const currentYear = today.year;
  
  try {
    // Find all profiles with today's birthday who haven't been celebrated this year
    const birthdayProfiles = await db.select()
      .from(communityProfiles)
      .where(eq(communityProfiles.birthday, todayMMDD));
    
    for (const profile of birthdayProfiles) {
      // Skip if already celebrated this year
      if (profile.lastBirthdayYear === currentYear) continue;
      
      // Skip if no chat ID stored
      if (!profile.chatId) continue;
      
      const chatId = parseInt(profile.chatId);
      if (isNaN(chatId)) continue;
      
      // Check if scheduled posts are enabled for this chat
      const _bdFeats = await getFeatureSettings(profile.chatId);
      if (!_bdFeats.scheduled) continue;
      
      const userName = profile.username ? `@${profile.username}` : profile.firstName || "our friend";
      const displayName = profile.firstName || profile.username || "friend";
      
      // Generate birthday cake image
      const cakeImageBuffer = await generateBirthdayCakeImage(displayName);
      
      // Create personalized birthday message
      let birthdayMessage = `🎉 HAPPY BIRTHDAY ${userName}! 🎂\n\n`;
      birthdayMessage += `The Warden checked the community records and today's yours. Consider this the official Rift birthday roll-call.`;
      
      if (profile.location) {
        birthdayMessage += `\n\nAll the way to ${profile.location}.`;
      }
      
      if (profile.likes) {
        birthdayMessage += `\n\nThe record says you're fond of ${profile.likes}. hope there's some of that in the day.`;
      }
      
      birthdayMessage += `\n\nHave a brilliant birthday from everyone around the Rift. Cake is authorised. Mild birthday chaos is tolerated. 🎈`;
      
      try {
        // Send cake image if available
        if (cakeImageBuffer) {
          await botInstance.api.sendPhoto(chatId, new InputFile(cakeImageBuffer, `${displayName}_birthday.png`), { caption: birthdayMessage });
        } else {
          // Fallback to text only
          await botInstance.api.sendMessage(chatId, birthdayMessage);
        }
        
        // Mark as celebrated this year
        await db.update(communityProfiles)
          .set({ lastBirthdayYear: currentYear })
          .where(eq(communityProfiles.telegramUserId, profile.telegramUserId));
        
        console.log(`Celebrated birthday for ${displayName} in chat ${chatId}`);
      } catch (err: any) {
        console.error(`Failed to send birthday to chat ${chatId}:`, err);
        if (err.description?.includes("chat not found") || err.description?.includes("bot was blocked")) {
          void removeActiveChat(chatId);
        }
      }
    }
  } catch (error) {
    console.error("Error checking birthdays:", error);
  }
}

// Schedule birthday check at 9 AM in the configured community timezone

// === WINNER ANNOUNCEMENTS ===
let lastDailyWinnerDate = "";
let lastWeeklyWinnerWeek = "";
let lastMonthlyWinnerMonth = "";

async function generateWinnerImage(winnerName: string, period: 'Daily' | 'Weekly' | 'Monthly', game: 'Trivia' | 'Puzzle'): Promise<Buffer | null> {
  try {
    const prompt = `A cheerful cartoon Australian bush animal celebrating with a golden trophy and confetti, wearing a winner's crown. Bold stylized text banner reads "${period.toUpperCase()} ${game.toUpperCase()} WINNER" at the top. The character name "${winnerName}" appears on a ribbon below. Celebratory atmosphere with sparkles and stars. Cartoon style, vibrant colours, fun and energetic.`;
    const buffer = await generateImageBuffer(prompt, "1024x1024");
    return buffer;
  } catch (error) {
    console.error(`Error generating winner image for ${winnerName}:`, error);
    return null;
  }
}

async function getWardenWinnerMessage(winnerName: string, period: string, game: string, points: number): Promise<string> {
  try {
    const prompt = `Write a short, dry congratulation from The Warden to ${winnerName} for winning the ${period} ${game} competition with ${points} points. The Warden is plain-spoken and understated — no exclamation marks, no slang, no emojis. Two sentences at most.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.9
    });
    
    return response.choices[0]?.message?.content || `Congrats ${winnerName}! You absolutely crushed it!`;
  } catch (error) {
    console.error("Error getting The Warden winner message:", error);
    return `Well well well, look who dominated! ${winnerName} just showed everyone how it's done with ${points} points! That's what I call a champion move!`;
  }
}

interface TopScorer {
  username: string | null;
  firstName: string | null;
  points: number;
  chatId: string;
}

async function getTopScorers(period: 'daily' | 'weekly' | 'monthly', game: 'trivia' | 'puzzle'): Promise<Map<string, TopScorer>> {
  const result = new Map<string, TopScorer>();
  
  const now = new Date();
  // Use same UTC-based format as the trivia/puzzle scoring code to match stored data
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const weekNum = getWeekNumber(now);
  const weekStr = `${now.getFullYear()}-W${weekNum}`;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  let resetDateField: string;
  let pointsField: string;
  let periodStr: string;
  
  if (game === 'trivia') {
    if (period === 'daily') {
      resetDateField = 'dailyResetDate';
      pointsField = 'dailyPoints';
      periodStr = todayStr;
    } else if (period === 'weekly') {
      resetDateField = 'weeklyResetDate';
      pointsField = 'weeklyPoints';
      periodStr = weekStr;
    } else {
      resetDateField = 'monthlyResetDate';
      pointsField = 'monthlyPoints';
      periodStr = monthStr;
    }
  } else {
    if (period === 'daily') {
      resetDateField = 'puzzleDailyResetDate';
      pointsField = 'puzzleDailyPoints';
      periodStr = todayStr;
    } else if (period === 'weekly') {
      resetDateField = 'puzzleWeeklyResetDate';
      pointsField = 'puzzleWeeklyPoints';
      periodStr = weekStr;
    } else {
      resetDateField = 'puzzleMonthlyResetDate';
      pointsField = 'puzzleMonthlyPoints';
      periodStr = monthStr;
    }
  }
  
  try {
    const allScores = await db.select().from(memberScores);
    
    // Group by chatId and find top scorer for each chat
    const chatGroups = new Map<string, typeof allScores>();
    for (const score of allScores) {
      if (!chatGroups.has(score.chatId)) {
        chatGroups.set(score.chatId, []);
      }
      chatGroups.get(score.chatId)!.push(score);
    }
    
    for (const [chatId, scores] of Array.from(chatGroups.entries())) {
      const validScores = scores.filter((s: typeof allScores[0]) => {
        const resetDate = game === 'trivia' 
          ? (period === 'daily' ? s.dailyResetDate : period === 'weekly' ? s.weeklyResetDate : s.monthlyResetDate)
          : (period === 'daily' ? s.puzzleDailyResetDate : period === 'weekly' ? s.puzzleWeeklyResetDate : s.puzzleMonthlyResetDate);
        const pts = game === 'trivia'
          ? (period === 'daily' ? s.dailyPoints : period === 'weekly' ? s.weeklyPoints : s.monthlyPoints)
          : (period === 'daily' ? s.puzzleDailyPoints : period === 'weekly' ? s.puzzleWeeklyPoints : s.puzzleMonthlyPoints);
        return resetDate === periodStr && (pts || 0) > 0;
      });
      
      if (validScores.length > 0) {
        const sorted = validScores.sort((a: typeof allScores[0], b: typeof allScores[0]) => {
          const ptsA = game === 'trivia'
            ? (period === 'daily' ? a.dailyPoints : period === 'weekly' ? a.weeklyPoints : a.monthlyPoints)
            : (period === 'daily' ? a.puzzleDailyPoints : period === 'weekly' ? a.puzzleWeeklyPoints : a.puzzleMonthlyPoints);
          const ptsB = game === 'trivia'
            ? (period === 'daily' ? b.dailyPoints : period === 'weekly' ? b.weeklyPoints : b.monthlyPoints)
            : (period === 'daily' ? b.puzzleDailyPoints : period === 'weekly' ? b.puzzleWeeklyPoints : b.puzzleMonthlyPoints);
          return (ptsB || 0) - (ptsA || 0);
        });
        
        const winner = sorted[0];
        const winnerPoints = game === 'trivia'
          ? (period === 'daily' ? winner.dailyPoints : period === 'weekly' ? winner.weeklyPoints : winner.monthlyPoints)
          : (period === 'daily' ? winner.puzzleDailyPoints : period === 'weekly' ? winner.puzzleWeeklyPoints : winner.puzzleMonthlyPoints);
        
        result.set(chatId, {
          username: winner.username,
          firstName: winner.firstName,
          points: winnerPoints || 0,
          chatId
        });
      }
    }
  } catch (error) {
    console.error(`Error getting top scorers for ${period} ${game}:`, error);
  }
  
  return result;
}

async function announceWinners(period: 'daily' | 'weekly' | 'monthly') {
  if (!botInstance) return;
  
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
  console.log(`Announcing ${periodLabel} winners...`);
  
  // Announce for both games
  for (const game of ['trivia', 'puzzle'] as const) {
    const gameLabel = game.charAt(0).toUpperCase() + game.slice(1);
    const topScorers = await getTopScorers(period, game);
    
    for (const [chatId, winner] of Array.from(topScorers.entries())) {
      const chatIdNum = parseInt(chatId);
      if (isNaN(chatIdNum)) continue;
      
      // Check if scheduled posts are enabled for this chat
      const _awFeats = await getFeatureSettings(chatId);
      if (!_awFeats.scheduled) continue;
      
      const winnerName = winner.username ? `@${winner.username}` : winner.firstName || "Champion";
      const displayName = winner.firstName || winner.username || "Champion";
      
      try {
        // Generate winner image
        const imageBuffer = await generateWinnerImage(displayName, periodLabel as any, gameLabel as any);
        
        // Get The Warden's encouragement message
        const wardenMessage = await getWardenWinnerMessage(winnerName, periodLabel, gameLabel, winner.points);
        
        const announcement = `${periodLabel.toUpperCase()} ${gameLabel.toUpperCase()} WINNER\n\n` +
          `Congratulations ${winnerName}!\n` +
          `${winner.points} points!\n\n` +
          `${wardenMessage}`;
        
        if (imageBuffer) {
          await botInstance.api.sendPhoto(chatIdNum, new InputFile(imageBuffer, `${displayName}_${period}_${game}_winner.png`), { caption: announcement });
        } else {
          await botInstance.api.sendMessage(chatIdNum, announcement);
        }
        
        console.log(`Announced ${period} ${game} winner ${displayName} in chat ${chatId}`);
      } catch (err: any) {
        console.error(`Failed to announce winner in chat ${chatId}:`, err);
        if (err.description?.includes("chat not found") || err.description?.includes("bot was blocked")) {
          activeChats.delete(chatIdNum);
        }
      }
    }
    
    // If no winners for this game, post encouragement
    if (topScorers.size === 0) {
      console.log(`No ${period} ${game} winners to announce`);
    }
  }
}

// === START BOT ===
// Checks daily for communities whose 7-day trial has expired and downgrades them to free tier
export async function checkExpiredTrials(): Promise<void> {
  {
    try {
      const now = new Date();
      const expiredRows = await db.select().from(communities)
        .where(sql`status = 'trial' AND trial_expires_at IS NOT NULL AND trial_expires_at < ${now.toISOString()}`);

      for (const row of expiredRows) {
        await db.update(communities)
          .set({ status: "free", updatedAt: new Date() })
          .where(eq(communities.chatId, row.chatId));
        communityCache.delete(row.chatId); // Force cache refresh

        const chatIdNum = parseInt(row.chatId);
        if (!isNaN(chatIdNum) && botInstance) {
          try {
            await botInstance.api.sendMessage(
              chatIdNum,
              `Your The Warden 7-day trial has ended.\n\n` +
              `To continue using all features (spam/scam protection, games, scheduled posts, trust system, and more), ` +
              `contact ${OWNER_CONTACT} to activate your subscription.\n\n` +
              `For now, only /help, /info, and /ask are available.`
            );
          } catch {}
        }
        console.log(`[Community] Downgraded expired trial: ${row.chatId} (${row.displayName})`);
      }

      if (expiredRows.length > 0) {
        console.log(`[Community] Expiry check complete — downgraded ${expiredRows.length} trial(s)`);
      }
    } catch (err) {
      console.error("[Community] Error in expiry check:", err);
    }
  }
}


// === SERVERLESS CRON TICK ===
//
// On Vercel there are no long-running timers. setInterval dies with the
// function. Everything that used to be on a timer runs here instead, once per
// cron invocation, and each daily task guards itself with a durable
// "last run" date so it fires once a day no matter how often cron runs.

const TZ = COMMUNITY_TIMEZONE;

function localParts(): { hour: number; dateStr: string; weekday: string } {
  const now = new Date();
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "numeric", hour12: false,
  }).format(now);
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short",
  }).format(now);
  return { hour: parseInt(time, 10), dateStr, weekday };
}

// Runs `task` at most once per local day, at or after `targetHour`.
async function onceDaily(name: string, targetHour: number, task: () => Promise<void>): Promise<void> {
  const { hour, dateStr } = localParts();
  if (hour < targetHour) return;
  const key = `w:cron:${name}`;
  const last = await stateGet<string>(key, "");
  if (last === dateStr) return;
  await stateSet(key, dateStr, 3 * 24 * 60 * 60);
  try {
    await task();
  } catch (err) {
    console.error(`[cron] ${name} failed:`, err);
  }
}

// Ban anyone who joined, was asked to verify, and never did.
// Redis expires the key on its own, so we sweep before that happens.
async function sweepUnverifiedJoins(bot: Bot<MyContext>): Promise<void> {
  const keys = await stateScan("w:cap:");
  const now = Date.now();
  for (const key of keys) {
    const pending = await stateGet<{ chatId: number; userId: number; timestamp: number } | null>(key, null);
    if (!pending) continue;
    if (now - pending.timestamp <= 10 * 60 * 1000) continue;
    await stateDel(key);
    try {
      await bot.api.banChatMember(pending.chatId, pending.userId);
      console.log(`[CAPTCHA] Removed unverified user ${pending.userId} from chat ${pending.chatId}`);
    } catch { /* they may have left already */ }
  }
}


// Close out game rounds in chats that went silent. In an active chat the
// message handler advances trivia normally; this is the safety net for a chat
// where everyone simply walked away mid-round.
async function expireStaleGames(bot: Bot<MyContext>, chatId: number): Promise<void> {
  const puzzle = await getPuzzle(chatId);
  if (puzzle && !puzzle.solved && Date.now() > puzzle.deadline) {
    await clearPuzzle(chatId);
    try {
      await bot.api.sendMessage(chatId, `Time's up. The answer was: ${puzzle.word}`);
    } catch { /* chat may be gone */ }
  }

  const trivia = await getTrivia(chatId);
  // Two minutes past the question deadline means nobody is playing any more.
  if (trivia && Date.now() > trivia.questionDeadline + 2 * 60 * 1000) {
    await clearTrivia(chatId);
    const scores = [...trivia.roundScoreboard].sort((a, b) => b.points - a.points);
    const summary = scores.length
      ? scores.slice(0, 5).map((s, i) => `${i + 1}. ${s.firstName}: ${s.points} pts`).join("\n")
      : "Nobody scored.";
    try {
      await bot.api.sendMessage(chatId,
        `Trivia round closed — the chat went quiet.\n\n${summary}\n\nStart another with /trivia`);
    } catch { /* chat may be gone */ }
  }
}


// === PERMISSION SELF-CHECK ===
//
// Most of the enforcement in this bot needs Telegram permissions it may simply
// not have been given. Without them the Warden looks like it is working while
// quietly failing to remove anything — the worst possible failure, because
// nobody notices until it matters.
//
// This runs on the cron tick and tells you plainly what is missing.

async function checkMyPermissions(bot: Bot<MyContext>, chatId: number): Promise<string[]> {
  const missing: string[] = [];
  try {
    const me = await bot.api.getChatMember(chatId, bot.botInfo.id);
    if (me.status !== "administrator") {
      return ["ADMIN — I am not an admin here. Almost nothing will work."];
    }
    const p = me as unknown as Record<string, boolean>;
    if (!p.can_delete_messages) missing.push("Delete messages — can't remove scam links or spam");
    if (!p.can_restrict_members) missing.push("Ban users — can't mute, ban, or enforce the Boss/TreeFitty extra-bot rule");
    if (!p.can_invite_users) missing.push("Invite users — CAPTCHA unrestrict may fail");
  } catch {
    missing.push("UNKNOWN — couldn't read my own permissions in this chat");
  }
  return missing;
}

async function reportMissingPermissions(bot: Bot<MyContext>, chatId: number): Promise<boolean> {
  const missing = await checkMyPermissions(bot, chatId);
  if (missing.length === 0) return false;

  // Once a day at most, so it's a reminder rather than nagging.
  const key = `w:permwarn:${chatId}`;
  const today = new Date().toISOString().slice(0, 10);
  const last = await stateGet<string>(key, "");
  if (last === today) return true;
  await stateSet(key, today, 3 * 24 * 60 * 60);

  try {
    await bot.api.sendMessage(chatId,
      `PERMISSIONS MISSING\n\n` +
      `I don't have everything I need to protect this group:\n\n` +
      missing.map(m => `- ${m}`).join("\n") +
      `\n\nFix it in Group Settings → Administrators → me. Until then the ` +
      `protections above are not actually enforced.`
    );
  } catch { /* can't even post */ }
  return true;
}

/**
 * One cron invocation. Safe to call as often as you like — every task
 * decides for itself whether it is due.
 */
export async function runCronTick(): Promise<{ ran: string[] }> {
  const ran: string[] = [];
  const bot = createBot();
  setBotInstance(bot);
  registerBotApi(bot.api);
  await loadActiveChats();

  // Every tick
  try { await sweepUnverifiedJoins(bot); ran.push("captcha-sweep"); }
  catch (err) { console.error("[cron] captcha sweep failed:", err); }

  try { await checkExpiredTrials(); ran.push("trial-expiry"); }
  catch (err) { console.error("[cron] trial expiry failed:", err); }

  try { await cleanupOldTrackedMessages(); ran.push("message-cleanup"); }
  catch (err) { console.error("[cron] message cleanup failed:", err); }

  // Tell the admins if I've been given a badge but not the powers behind it.
  for (const chatId of Array.from(activeChats)) {
    try {
      if (await reportMissingPermissions(bot, chatId)) ran.push(`perms-warning:${chatId}`);
    } catch (err) { console.error("[cron] permission check failed:", err); }
  }

  // Daily
  const before = ran.length;
  await onceDaily("quote", 10, async () => { await postDailyQuote(); ran.push("daily-quote"); });
  await onceDaily("birthdays", 9, async () => { await checkBirthdays(); ran.push("birthdays"); });
  await onceDaily("winners-daily", 20, async () => { await announceWinners("daily"); ran.push("winners-daily"); });

  // Nudge chats that have gone quiet, and check on absent admins.
  for (const chatId of Array.from(activeChats)) {
    try {
      if (await autoEngageIfQuiet(bot, chatId)) ran.push(`auto-engage:${chatId}`);
    } catch (err) { console.error("[cron] auto-engage failed:", err); }
  }

  await onceDaily("admin-activity", 11, async () => {
    for (const chatId of Array.from(activeChats)) {
      await checkInactiveAdmins(chatId);
    }
    ran.push("admin-activity");
  });

  // Close out any game round whose clock ran out in a quiet chat.
  for (const chatId of Array.from(activeChats)) {
    try {
      await expireStaleGames(bot, chatId);
    } catch (err) { console.error("[cron] game expiry failed:", err); }
  }

  const { weekday } = localParts();
  if (weekday === "Sun") {
    await onceDaily("winners-weekly", 20, async () => { await announceWinners("weekly"); ran.push("winners-weekly"); });
  }

  if (ran.length === before) ran.push("nothing-due");
  return { ran };
}

/**
 * Builds the bot for webhook use. No polling, no timers — the caller hands
 * each Telegram update straight to it.
 */
export async function createWebhookBot(): Promise<Bot<MyContext>> {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const bot = createBot();
  setBotInstance(bot);
  registerBotApi(bot.api);
  bot.catch((err) => console.error("Bot error:", err));
  await bot.init();
  await loadActiveChats();
  return bot;
}

export async function startBot() {
  if (!BOT_TOKEN) {
    console.log("========================================");
    console.log("RiftWardenBot - Setup Required");
    console.log("========================================");
    console.log("");
    console.log("TELEGRAM_BOT_TOKEN is not set!");
    console.log("");
    console.log("To get your bot token:");
    console.log("1. Open Telegram and search for @BotFather");
    console.log("2. Send /newbot and follow the prompts");
    console.log("3. Add it as TELEGRAM_BOT_TOKEN in your Vercel environment variables");
    console.log("4. Redeploy, then visit /api/set-webhook?key=YOUR_SETUP_KEY");
    console.log("");
    console.log("========================================");
    process.exit(1);
  }

  const bot = createBot();
  setBotInstance(bot);
  registerBotApi(bot.api);

  console.log("RiftWardenBot starting...");
  
  // Load existing member data from database before starting schedulers
  await loadLeaderboardFromDatabase();
  
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  // Start the community bud avatar scheduler
  

  // Clear any pending webhook to prevent conflicts
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
  } catch (e) {
    console.log("Could not clear webhook:", e);
  }

  // Start bot with retry logic for 409 conflicts (common during rapid restarts)
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.start({
        allowed_updates: ["message", "edited_message", "callback_query", "chat_member", "my_chat_member"],
        onStart: () => {
          console.log("RiftWardenBot is running with AI capabilities!");
          console.log("Features: moderation suite, scam & drainer detection, trivia, puzzles, giveaways, trust system, scheduled posts");
        },
      });
      break; // Success, exit retry loop
    } catch (error: any) {
      if (error?.error_code === 409) {
        if (attempt < maxRetries) {
          console.log(`409 conflict detected (attempt ${attempt}/${maxRetries}). Waiting ${retryDelay/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          // After max retries, gracefully run in health-check only mode
          // This allows production to run the bot while dev keeps the health server alive
          console.log("Bot already running elsewhere (likely production). Running in health-check mode only.");
          console.log("Health server remains active on port 5000. Bot features handled by production instance.");
          // Keep the process alive without crashing
          return;
        }
      } else {
        throw error; // Rethrow non-409 errors
      }
    }
  }
}
