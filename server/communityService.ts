/**
 * Shared subscription transition logic.
 *
 * Both Telegram bot commands (/activate, /deactivate, /makefree, /bangroup)
 * and the web dashboard API call these functions so that side effects
 * (DB update, cache invalidation, Telegram group notification) are
 * always executed consistently regardless of the caller.
 */

import { db } from "./db";
import { communities } from "@shared/schema";
import { eq } from "drizzle-orm";
import { invalidateCommunityCache } from "./bot";
import type { Api } from "grammy";

let _botApi: Api | null = null;

/** Called once after the bot starts so notifications can be sent. */
export function registerBotApi(api: Api): void {
  _botApi = api;
}

async function applyDBUpdate(chatId: string, updates: Record<string, unknown>): Promise<void> {
  await db
    .update(communities)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(communities.chatId, chatId));
  invalidateCommunityCache(chatId);
}

async function notifyGroup(chatId: string, message: string): Promise<void> {
  if (!_botApi) return;
  try {
    await _botApi.sendMessage(parseInt(chatId), message);
  } catch {
    // Group may be unreachable (bot removed, chat deleted, etc.) — safe to swallow
  }
}

export async function activateCommunity(chatId: string): Promise<void> {
  await applyDBUpdate(chatId, { status: "active" });
  await notifyGroup(
    chatId,
    "Your The Warden subscription has been ACTIVATED! All 20 feature sections are now unlocked. Thank you for your support!"
  );
}

export async function deactivateCommunity(chatId: string): Promise<void> {
  await applyDBUpdate(chatId, { status: "free" });
  await notifyGroup(
    chatId,
    "Your The Warden subscription has ended. Basic safety moderation continues.\n\n" +
    "Paid features (/ask, games, scheduled posts, trust system, and the full security suite) are now locked.\n\n" +
    `Contact ${(process.env.OWNER_CONTACT_USERNAME || "").trim() ? "@" + (process.env.OWNER_CONTACT_USERNAME || "").replace(/^@/, "").trim() : "the project owner"} to reactivate.`
  );
}

export async function makeComplimentary(chatId: string): Promise<void> {
  await applyDBUpdate(chatId, { status: "complimentary", trialExpiresAt: null });
  await notifyGroup(
    chatId,
    "Great news! This community has been granted full The Warden access as a complimentary gift.\n\n" +
    "All features are now unlocked. Thank you for being part of the Boomerverse universe!"
  );
}

export async function banCommunity(chatId: string): Promise<void> {
  await applyDBUpdate(chatId, { status: "banned" });
}
