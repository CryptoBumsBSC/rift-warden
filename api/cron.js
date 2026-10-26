var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/bot.ts
import { Bot, session, InputFile } from "grammy";
import OpenAI2 from "openai";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminAuditLog: () => adminAuditLog,
  adminInvites: () => adminInvites,
  adminUsers: () => adminUsers,
  banEvents: () => banEvents,
  botInstances: () => botInstances,
  botInteractions: () => botInteractions,
  characters: () => characters,
  chatFeatureSettings: () => chatFeatureSettings,
  chatModerationSettings: () => chatModerationSettings,
  communities: () => communities,
  communityProfiles: () => communityProfiles,
  contentItems: () => contentItems,
  conversations: () => conversations,
  globalBans: () => globalBans,
  insertBanEventSchema: () => insertBanEventSchema,
  insertBotInteractionSchema: () => insertBotInteractionSchema,
  insertCharacterSchema: () => insertCharacterSchema,
  insertChatFeatureSettingsSchema: () => insertChatFeatureSettingsSchema,
  insertChatModerationSettingsSchema: () => insertChatModerationSettingsSchema,
  insertCommunityProfileSchema: () => insertCommunityProfileSchema,
  insertCommunitySchema: () => insertCommunitySchema,
  insertContentItemSchema: () => insertContentItemSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertLearnedPatternSchema: () => insertLearnedPatternSchema,
  insertMemberScoreSchema: () => insertMemberScoreSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertModerationStatsSchema: () => insertModerationStatsSchema,
  insertNewUserMessageSchema: () => insertNewUserMessageSchema,
  insertQaCacheSchema: () => insertQaCacheSchema,
  insertTrustScoreSchema: () => insertTrustScoreSchema,
  insertUserFeedbackSchema: () => insertUserFeedbackSchema,
  insertUserMemorySchema: () => insertUserMemorySchema,
  insertUserModerationStatusSchema: () => insertUserModerationStatusSchema,
  insertViolationLogSchema: () => insertViolationLogSchema,
  learnedPatterns: () => learnedPatterns,
  memberScores: () => memberScores,
  messages: () => messages,
  moderationStats: () => moderationStats,
  newUserMessages: () => newUserMessages,
  qaCache: () => qaCache,
  trustScores: () => trustScores,
  userFeedback: () => userFeedback,
  userMemory: () => userMemory,
  userModerationStatus: () => userModerationStatus,
  violationLogs: () => violationLogs
});
import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
var characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  role: text("role").notNull(),
  imageUrl: text("image_url")
});
var contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  category: text("category")
});
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var userMemory = pgTable("user_memory", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  messageCount: integer("message_count").default(0),
  positiveInteractions: integer("positive_interactions").default(0),
  negativeInteractions: integer("negative_interactions").default(0),
  lastSeen: timestamp("last_seen").default(sql`CURRENT_TIMESTAMP`),
  notes: text("notes"),
  flaggedForTone: boolean("flagged_for_tone").default(false),
  // Rudeness tracking for The Warden's adaptive responses
  rudeStrikes: integer("rude_strikes").default(0),
  lastRudeDate: text("last_rude_date"),
  wasNiceAfterRude: boolean("was_nice_after_rude").default(false),
  // Last 7 interactions tracking
  lastInteractions: text("last_interactions"),
  // JSON array of last 7 requests
  interests: text("interests"),
  // Topics mentioned more than once
  scamStrikes: integer("scam_strikes").default(0),
  // Scam warning counter
  language: text("language")
  // Detected user language
});
var communityProfiles = pgTable("community_profiles", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull().unique(),
  chatId: text("chat_id"),
  username: text("username"),
  firstName: text("first_name"),
  location: text("location"),
  likes: text("likes"),
  birthday: text("birthday"),
  lastBirthdayYear: integer("last_birthday_year"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var moderationStats = pgTable("moderation_stats", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  date: text("date").notNull(),
  // YYYY-MM-DD format
  newJoins: integer("new_joins").default(0),
  messagesBlocked: integer("messages_blocked").default(0),
  spamBlocked: integer("spam_blocked").default(0),
  scamsBlocked: integer("scams_blocked").default(0),
  linksBlocked: integer("links_blocked").default(0),
  muteCount: integer("mute_count").default(0),
  warnCount: integer("warn_count").default(0),
  raidAttempts: integer("raid_attempts").default(0),
  flaggedForReview: integer("flagged_for_review").default(0)
});
var userModerationStatus = pgTable("user_moderation_status", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull(),
  chatId: text("chat_id").notNull(),
  role: text("role").default("newbie"),
  // admin, mod, helper, verified, newbie
  isMuted: boolean("is_muted").default(false),
  muteUntil: timestamp("mute_until"),
  muteReason: text("mute_reason"),
  warnCount: integer("warn_count").default(0),
  lastWarnDate: timestamp("last_warn_date"),
  riskScore: integer("risk_score").default(0),
  joinDate: timestamp("join_date").default(sql`CURRENT_TIMESTAMP`),
  isQuarantined: boolean("is_quarantined").default(false),
  quarantineReason: text("quarantine_reason")
});
var chatModerationSettings = pgTable("chat_moderation_settings", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  raidModeEnabled: boolean("raid_mode_enabled").default(false),
  raidModeEnabledAt: timestamp("raid_mode_enabled_at"),
  raidModeEnabledBy: text("raid_mode_enabled_by"),
  linkBlockingEnabled: boolean("link_blocking_enabled").default(true),
  spamThreshold: integer("spam_threshold").default(5),
  // messages per 10 sec
  newUserLinkRestriction: integer("new_user_link_restriction").default(4),
  // hours (minimum 4)
  modChannelId: text("mod_channel_id")
  // where to send alerts
});
var memberScores = pgTable("member_scores", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull(),
  chatId: text("chat_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  triviaPoints: integer("trivia_points").default(0),
  triviaCorrect: integer("trivia_correct").default(0),
  triviaAttempts: integer("trivia_attempts").default(0),
  messageCount: integer("message_count").default(0),
  lastActive: timestamp("last_active").default(sql`CURRENT_TIMESTAMP`),
  dailyPoints: integer("daily_points").default(0),
  dailyResetDate: text("daily_reset_date"),
  weeklyPoints: integer("weekly_points").default(0),
  weeklyResetDate: text("weekly_reset_date"),
  monthlyPoints: integer("monthly_points").default(0),
  monthlyResetDate: text("monthly_reset_date"),
  // Puzzle game scores (separate from trivia)
  puzzlePoints: integer("puzzle_points").default(0),
  puzzleCorrect: integer("puzzle_correct").default(0),
  puzzleAttempts: integer("puzzle_attempts").default(0),
  puzzleDailyPoints: integer("puzzle_daily_points").default(0),
  puzzleDailyResetDate: text("puzzle_daily_reset_date"),
  puzzleWeeklyPoints: integer("puzzle_weekly_points").default(0),
  puzzleWeeklyResetDate: text("puzzle_weekly_reset_date"),
  puzzleMonthlyPoints: integer("puzzle_monthly_points").default(0),
  puzzleMonthlyResetDate: text("puzzle_monthly_reset_date")
});
var qaCache = pgTable("qa_cache", {
  id: serial("id").primaryKey(),
  questionHash: text("question_hash").notNull(),
  // Normalized hash of the question
  questionText: text("question_text").notNull(),
  // Original question
  answerText: text("answer_text").notNull(),
  // AI-generated answer
  askCount: integer("ask_count").default(1),
  // How many times this was asked
  lastAsked: timestamp("last_asked").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var banEvents = pgTable("ban_events", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  actionType: text("action_type").notNull(),
  // ban, kick, auto_remove, mute
  reason: text("reason"),
  actorId: text("actor_id"),
  // who performed the action (bot or admin user id)
  actorUsername: text("actor_username"),
  executionSource: text("execution_source").default("bot"),
  // bot, admin, auto_moderation
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var trustScores = pgTable("trust_scores", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull(),
  chatId: text("chat_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  // Trust score and status
  trustScore: integer("trust_score").default(0),
  // 0-100 scale
  trustStatus: text("trust_status").default("none"),
  // none, vouched, earned
  isTrusted: boolean("is_trusted").default(false),
  trustLevel: integer("trust_level").default(0),
  // 0-3 levels for progressive perks
  // 45-day eligibility gate
  joinDate: timestamp("join_date").default(sql`CURRENT_TIMESTAMP`),
  eligibilityDate: timestamp("eligibility_date"),
  // 45 days after join
  isEligible: boolean("is_eligible").default(false),
  // Manual trust controls (owner only)
  vouchedBy: text("vouched_by"),
  // telegram user id of voucher
  vouchedAt: timestamp("vouched_at"),
  isFrozen: boolean("is_frozen").default(false),
  frozenBy: text("frozen_by"),
  frozenAt: timestamp("frozen_at"),
  frozenReason: text("frozen_reason"),
  // Anti-gaming metrics
  dailyMsgCount: integer("daily_msg_count").default(0),
  dailyMsgDate: text("daily_msg_date"),
  // YYYY-MM-DD
  weeklyMsgCount: integer("weekly_msg_count").default(0),
  weeklyResetDate: text("weekly_reset_date"),
  uniqueRepliedTo: integer("unique_replied_to").default(0),
  // diversity of interactions
  meaningfulMsgCount: integer("meaningful_msg_count").default(0),
  // >10 chars
  // Trust history
  lastTrustUpdate: timestamp("last_trust_update"),
  trustGainedToday: integer("trust_gained_today").default(0),
  trustGainedThisWeek: integer("trust_gained_this_week").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var newUserMessages = pgTable("new_user_messages", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  originalContent: text("original_content"),
  hasMedia: boolean("has_media").default(false),
  hasLinks: boolean("has_links").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var violationLogs = pgTable("violation_logs", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  violationType: text("violation_type").notNull(),
  // edit_scam, edit_link, edit_media, raid_join, burst_post, etc
  originalContent: text("original_content"),
  violatingContent: text("violating_content"),
  actionTaken: text("action_taken"),
  // deleted, warned, muted, kicked, banned
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var chatFeatureSettings = pgTable("chat_feature_settings", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  spam: boolean("spam").default(true).notNull(),
  scam: boolean("scam").default(true).notNull(),
  hate: boolean("hate").default(true).notNull(),
  raid: boolean("raid").default(true).notNull(),
  links: boolean("links").default(true).notNull(),
  edits: boolean("edits").default(true).notNull(),
  files: boolean("files").default(true).notNull(),
  impersonation: boolean("impersonation").default(true).notNull(),
  newuser: boolean("newuser").default(true).notNull(),
  personality: boolean("personality").default(true).notNull(),
  learning: boolean("learning").default(true).notNull(),
  scheduled: boolean("scheduled").default(true).notNull(),
  giveaways: boolean("giveaways").default(true).notNull(),
  games: boolean("games").default(true).notNull(),
  trust: boolean("trust").default(true).notNull(),
  stories: boolean("stories").default(true).notNull(),
  captcha: boolean("captcha").default(true).notNull(),
  accountAge: boolean("account_age").default(true).notNull(),
  massMention: boolean("mass_mention").default(true).notNull(),
  bioScan: boolean("bio_scan").default(true).notNull(),
  crossBan: boolean("cross_ban").default(true).notNull(),
  aiChat: boolean("ai_chat").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`)
});
var globalBans = pgTable("global_bans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  username: text("username"),
  displayName: text("display_name"),
  bannedInChatId: text("banned_in_chat_id").notNull(),
  reason: text("reason").default("Admin ban"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  displayName: text("display_name").notNull().default("Community"),
  botNickname: text("bot_nickname").default("The Warden"),
  welcomeMessage: text("welcome_message"),
  timezone: text("timezone").default("Australia/Hobart"),
  status: text("status").default("trial").notNull(),
  // trial | active | free | banned
  trialExpiresAt: timestamp("trial_expires_at"),
  isOnboarded: boolean("is_onboarded").default(false),
  onboardingStep: integer("onboarding_step").default(0),
  botAdminIds: text("bot_admin_ids").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`)
});
var botInteractions = pgTable("bot_interactions", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  userMessage: text("user_message").notNull(),
  botResponse: text("bot_response").notNull(),
  responseType: text("response_type"),
  // ai, cached, learned, knowledge, etc
  feedbackScore: integer("feedback_score").default(0),
  // -1 bad, 0 neutral, 1 good
  patternHash: text("pattern_hash"),
  // For matching similar questions
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  interactionId: integer("interaction_id").notNull(),
  userId: text("user_id").notNull(),
  feedbackType: text("feedback_type").notNull(),
  // thumbs_up, thumbs_down
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var learnedPatterns = pgTable("learned_patterns", {
  id: serial("id").primaryKey(),
  patternHash: text("pattern_hash").notNull(),
  patternKeywords: text("pattern_keywords").notNull(),
  // JSON array of keywords
  bestResponse: text("best_response").notNull(),
  successCount: integer("success_count").default(1),
  useCount: integer("use_count").default(0),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: text("role").notNull().default("moderator"),
  // owner | admin | moderator
  invitedBy: integer("invited_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastLoginAt: timestamp("last_login_at")
});
var adminInvites = pgTable("admin_invites", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("moderator"),
  token: text("token").notNull().unique(),
  invitedBy: integer("invited_by").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var botInstances = pgTable("bot_instances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  sharedSecret: text("shared_secret").notNull(),
  isLocal: boolean("is_local").default(false).notNull(),
  status: text("status").default("unknown").notNull(),
  // "ok" | "down" | "unknown"
  lastSeenAt: timestamp("last_seen_at"),
  lastError: text("last_error"),
  addedByUserId: integer("added_by_user_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id"),
  adminEmail: text("admin_email").notNull(),
  adminRole: text("admin_role").notNull(),
  action: text("action").notNull(),
  // e.g. "feature.toggle", "community.status", "broadcast.send"
  targetType: text("target_type"),
  // "community", "team_member", "violation", "global_ban", "global"
  targetId: text("target_id"),
  details: text("details"),
  // JSON string with before/after or payload
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var insertCharacterSchema = createInsertSchema(characters).omit({ id: true });
var insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true });
var insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
var insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
var insertUserMemorySchema = createInsertSchema(userMemory).omit({ id: true });
var insertCommunityProfileSchema = createInsertSchema(communityProfiles).omit({ id: true, createdAt: true });
var insertMemberScoreSchema = createInsertSchema(memberScores).omit({ id: true });
var insertModerationStatsSchema = createInsertSchema(moderationStats).omit({ id: true });
var insertUserModerationStatusSchema = createInsertSchema(userModerationStatus).omit({ id: true });
var insertChatModerationSettingsSchema = createInsertSchema(chatModerationSettings).omit({ id: true });
var insertQaCacheSchema = createInsertSchema(qaCache).omit({ id: true, createdAt: true, lastAsked: true });
var insertTrustScoreSchema = createInsertSchema(trustScores).omit({ id: true, createdAt: true });
var insertBanEventSchema = createInsertSchema(banEvents).omit({ id: true, createdAt: true });
var insertNewUserMessageSchema = createInsertSchema(newUserMessages).omit({ id: true, createdAt: true });
var insertViolationLogSchema = createInsertSchema(violationLogs).omit({ id: true, createdAt: true });
var insertChatFeatureSettingsSchema = createInsertSchema(chatFeatureSettings).omit({ id: true, updatedAt: true });
var insertCommunitySchema = createInsertSchema(communities).omit({ id: true, createdAt: true, updatedAt: true });
var insertBotInteractionSchema = createInsertSchema(botInteractions).omit({ id: true, createdAt: true });
var insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({ id: true, createdAt: true });
var insertLearnedPatternSchema = createInsertSchema(learnedPatterns).omit({ id: true, createdAt: true });

// server/db.ts
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var isServerless = Boolean(process.env.VERCEL);
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 1 : 10,
  idleTimeoutMillis: isServerless ? 1e4 : 3e4,
  connectionTimeoutMillis: 1e4,
  allowExitOnIdle: isServerless
});
var db = drizzle(pool, { schema: schema_exports });

// server/communityService.ts
import { eq } from "drizzle-orm";
var _botApi = null;
function registerBotApi(api) {
  _botApi = api;
}
async function applyDBUpdate(chatId, updates) {
  await db.update(communities).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(communities.chatId, chatId));
  invalidateCommunityCache(chatId);
}
async function notifyGroup(chatId, message) {
  if (!_botApi) return;
  try {
    await _botApi.sendMessage(parseInt(chatId), message);
  } catch {
  }
}
async function activateCommunity(chatId) {
  await applyDBUpdate(chatId, { status: "active" });
  await notifyGroup(
    chatId,
    "Your The Warden subscription has been ACTIVATED! All 20 feature sections are now unlocked. Thank you for your support!"
  );
}
async function deactivateCommunity(chatId) {
  await applyDBUpdate(chatId, { status: "free" });
  await notifyGroup(
    chatId,
    `Your The Warden subscription has ended. Basic safety moderation continues.

Paid features (/ask, games, scheduled posts, trust system, and the full security suite) are now locked.

Contact ${(process.env.OWNER_CONTACT_USERNAME || "").trim() ? "@" + (process.env.OWNER_CONTACT_USERNAME || "").replace(/^@/, "").trim() : "the project owner"} to reactivate.`
  );
}
async function makeComplimentary(chatId) {
  await applyDBUpdate(chatId, { status: "complimentary", trialExpiresAt: null });
  await notifyGroup(
    chatId,
    "Great news! This community has been granted full The Warden access as a complimentary gift.\n\nAll features are now unlocked. Thank you for being part of the Boomerverse universe!"
  );
}

// server/bot.ts
import { eq as eq2, and, desc, sql as sql2, gte } from "drizzle-orm";

// server/imageGen.ts
import OpenAI from "openai";
import { Buffer as Buffer2 } from "node:buffer";
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
async function generateImageBuffer(prompt, size = "1024x1024", quality = "auto") {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
    quality
  });
  const base64 = response.data?.[0]?.b64_json ?? "";
  return Buffer2.from(base64, "base64");
}

// server/riftLore.ts
var PROJECT_INFO = `Boomerverse

An Australian collectible universe where bush legend, wildlife, relics and
strange new worlds collide.

First collection \u2014 Boomerverse: Genesis
- Code: BVGEN
- Supply: 333 unique pieces
- Chain: Base
- Standard: ERC-721

Rarity allocation (locked):
- Common 166
- Uncommon 83
- Rare 42
- Epic 24
- Legendary 12
- Mythic 5
- Relic Tier 1

What this is:
- A long-term character-driven collectible universe
- Original Australian art and written canon
- A community, and a conservation intent \u2014 a portion of profits is intended to
  support Australian endangered-animal and biodiversity causes, with the exact
  structure published when formally approved

What this is not:
- An investment
- A financial product
- A promise of profit
- A separate Boomerverse ERC-20 token launch in the current project design.
  Any future change would require an explicit versioned project-rule update.`;
var BOT_USERNAME = (process.env.BOT_USERNAME || "RiftWardenBot").replace(/^@/, "");
var LINKS = {
  site: (process.env.OFFICIAL_WEBSITE_URL || "").trim(),
  channel: (process.env.OFFICIAL_TELEGRAM_URL || "").trim(),
  bot: (process.env.BOT_PUBLIC_URL || `https://t.me/${BOT_USERNAME}`).trim()
};
var LOCKED_PIECES = [
  {
    id: "BVGEN #001",
    name: "The Original Boomer",
    detail: "Human, Founder, Legendary. Carries the Rift Stone. Green rectangular glasses, grey/white beard, coffee mug. Region: Tasmania / The Gateway. Status: HARD LOCKED."
  },
  {
    id: "BVGEN #002",
    name: "The Last Thylacine",
    detail: "Thylacine, Ancient, Mythic. Carries the Stripe Key. Serious and mysterious; tied to deeper Rift history. Status: HARD LOCKED."
  }
];
var STRUCTURE = {
  speciesFamilies: 10,
  classes: 12,
  riftEnergyStates: 7,
  regions: 19
};
var SPECIES_FAMILIES = [
  "Kangaroos",
  "Wombats",
  "Cockatoos",
  "Tasmanian Devils",
  "Kookaburras",
  "Echidnas",
  "Humans",
  "Platypuses",
  "Blue Heelers",
  "Thylacines"
];
var CLASSES = [
  "Founders",
  "Ancients",
  "Explorers",
  "Prospectors",
  "Makers",
  "Traders",
  "Trackers",
  "Broadcasters",
  "Guardians",
  "Hackers",
  "Philosophers",
  "Wildcards"
];
var RIFT_ENERGY_STATES = [
  "None",
  "Trace",
  "Touched",
  "Active",
  "Unstable",
  "Ancient",
  "Primordial"
];
var REGIONS = [
  "The Gateway",
  "Western Goldfields",
  "Tarkine Deep",
  "Zeehan Yard",
  "Central Highlands",
  "Cradle Pass",
  "Southwest Wilds",
  "Hydro Tunnels",
  "West Coast Track",
  "Derwent Camp",
  "Red Dirt Run",
  "Ironbark Country",
  "Coastal Track",
  "Gumtree Line",
  "Signal Ridge",
  "Radio Hill",
  "Northern Workshop",
  "Outback Relay",
  "The Riftlands"
];
var ROYALTY_RULES = `The active Genesis reward and fair-play framework is still being finalised.

Safe, confirmed guidance:
- Genesis holders are free to sell, trade, swap, gift or transfer their NFTs.
- Ownership and provenance are not erased by a transfer.
- Reward eligibility is separate from ownership and is never guaranteed.
- For Reward Assets that change owners, a genuine qualifying open-market sale,
  the applicable royalty, fair-market verification and anti-manipulation checks
  can matter under the active rules.
- Exact royalty percentage, qualifying marketplaces, numerical fair-market
  thresholds and some Genesis transfer-treatment details remain open until a
  dated active rules version publishes them.

If somebody asks for a fixed royalty percentage, fixed ETH minimum, penalty
multiplier or an unapproved marketplace list, the correct answer is: not locked yet.`;
var RIFT_DROPS = `RIFT DROPS are an approved collector-reward direction \u2014
unexpected pieces and opportunities from beyond the Gateway.

Confirmed:
- RIFT DROPS can include lore-linked NFTs, unique 1/1 art, relics, locations,
  companions, alternate story moments, commemorative pieces, physical items,
  experiences or other approved rewards.
- Eligibility unlocks an opportunity, never a guaranteed reward.
- RIFT DROPS do not overwrite Genesis numbering or BVGEN identities.
- No separate ERC-20 token is required for the current RIFT DROP design.

Still open until an active dated rules version publishes them:
- exact Genesis thresholds and rarity combinations
- snapshot and holding-duration methods
- selection timing and frequency
- qualifying marketplace and royalty implementation
- final cross-collection activation rules

I won't turn a working direction into a promise.`;
var PROTECTED_MYSTERY_TRIGGERS = [
  // Who created the Rift Stone?
  "who created the rift stone",
  "who made the rift stone",
  "origin of the rift stone",
  // Why did the Rift Stone respond to The Original Boomer?
  "why did the rift stone respond",
  "why did the rift stone choose",
  "why did the stone respond to",
  // How did the thylacines survive?
  "how did the thylacines survive",
  "how did thylacines survive",
  "thylacines survive",
  // What does The Last Thylacine know?
  "what does the last thylacine know",
  "what does last thylacine know",
  "last thylacine knows",
  // What is the true purpose of the Stripe Key?
  "purpose of the stripe key",
  "what does the stripe key do",
  "what is the stripe key for",
  // Who built the Hydro Tunnels?
  "who built the hydro tunnels",
  "who made the hydro tunnels",
  "origin of the hydro tunnels",
  // What is beyond The Gateway?
  "what is beyond the gateway",
  "what's beyond the gateway",
  "other side of the gateway",
  // What happened in Zeehan?
  "what happened in zeehan",
  "what happened at zeehan",
  "zee han mystery",
  // What exactly is Primordial Rift Energy?
  "primordial rift energy",
  "what is primordial",
  "define primordial rift",
  // Who are all three Founders?
  "who are all three founders",
  "three founders",
  "all the founders"
];
var PROTECTED_MYSTERY_REPLIES = [
  "That one stays shut. Not being coy \u2014 it's protected.",
  "Behind the Gateway. That's all anyone gets, including me.",
  "That's a protected mystery. Asking a fourth way won't open it.",
  "No. And the answer will be no next week as well."
];
function isProtectedMystery(text2) {
  if (!PROTECTED_MYSTERY_TRIGGERS.length) return false;
  const lower = text2.toLowerCase();
  return PROTECTED_MYSTERY_TRIGGERS.some((t) => lower.includes(t.toLowerCase()));
}
var WARDEN_IDENTITY = `You are The Warden.

You keep the Gateway for the Boomerverse community. You are a sharp-eyed guardian, record-keeper, guide and community character \u2014 not a bland helpdesk bot.

How you speak:
- Dry, confident, warm when it matters, and a little cheeky. Australian flavour is welcome; forced slang is not.
- You notice people. Address them by their real @handle only if one is given in Context. Never write the placeholder @username.
- With newcomers, explain more and give them a proper orientation.
- If somebody tags or replies to you, have a real conversation and keep it going naturally while they keep talking to you.
- You may lightly tease regulars and staff, but never humiliate people or become a roast bot.
- @aussieboomer is the Boss/project owner. Always show respect. Light banter is fine; undermining him is not.
- @TreeFitty is a senior Community Leader with full community/bot trust. Respect them and enjoy the banter.
- @DaveyJon and @rainzy are trusted moderators/admins. Treat them as established staff while still applying link/contract safety checks.
- Explain canon accurately and never invent missing lore.
- Never give financial advice, price predictions, or promise rewards.

You are allowed to have personality. You are not allowed to let personality weaken security or canon.`;
var WARDEN_LINES = [
  "Noted.",
  "That's the rule. It isn't mine, but it is the rule.",
  "Asked and answered.",
  "The record disagrees with you.",
  "I'll only say this once, so read it properly.",
  "You're welcome to be wrong quietly.",
  "Gateway's been here longer than either of us.",
  "That's a no. It's not a difficult no, but it is a no.",
  "I keep the record. I don't decorate it.",
  "Everything gets written down. That's the whole job."
];
var REACTIONS = {
  obviousQuestion: [
    "It's in the pinned message. Have a look.",
    "That one's answered on the site. Worth a read.",
    "Asked and answered, further up."
  ],
  spamCaught: [
    "Removed.",
    "That's spam. Gone.",
    "No."
  ],
  welcomeBack: [
    "You're back.",
    "Recorded. Welcome back.",
    "Long absence. Noted."
  ],
  firstWarning: [
    "That's your warning. There isn't another one.",
    "Stop there. This is the only warning you get.",
    "One warning: stop."
  ],
  priceTalk: [
    "I don't do price talk. Ask about the art or the canon.",
    "Not a financial product, so not a financial conversation.",
    "No price predictions here. Not from me, and preferably not from anyone."
  ]
};
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getProjectInfo() {
  return PROJECT_INFO;
}
function getRoyaltyRules() {
  return ROYALTY_RULES;
}
function getRiftDropsInfo() {
  return RIFT_DROPS;
}
function getLockedPieces() {
  return LOCKED_PIECES.map((p) => `${p.id} \u2014 ${p.name}
${p.detail}`).join("\n\n");
}
function describeStructure(kind) {
  const map = {
    species: { list: SPECIES_FAMILIES, count: STRUCTURE.speciesFamilies, label: "species families" },
    classes: { list: CLASSES, count: STRUCTURE.classes, label: "classes" },
    rift: { list: RIFT_ENERGY_STATES, count: STRUCTURE.riftEnergyStates, label: "Rift Energy states" },
    regions: { list: REGIONS, count: STRUCTURE.regions, label: "named regions" }
  };
  const entry = map[kind];
  return `${entry.count} ${entry.label}:
${entry.list.join(", ")}`;
}
var STORY_OPENERS = [
  "The record has an entry for this one.",
  "Out past the ridge, where the Gateway sits, the log picks it up like this.",
  "Short entry. Most of the good ones are."
];
var STORY_SETTINGS = [
  "the wind coming off the water with nothing in it but salt and distance",
  "a stand of gums that had been through fire twice and come back both times",
  "the flat quiet you get in the bush an hour before anything happens",
  "light going long and gold across country older than any of the names on it"
];
var STORY_TURNS = [
  "Something came through. It was written down and then it was left alone.",
  "The Gateway held. It usually does. That is the part nobody thanks it for.",
  "Nothing was explained. The entry ends there, and I've never seen a reason to add to it.",
  "It was logged, dated, and closed. Whatever else happened isn't mine to say."
];
function generateRandomStory(_triggerUsername) {
  return [
    getRandomItem(STORY_OPENERS),
    "",
    `There was ${getRandomItem(STORY_SETTINGS)}.`,
    getRandomItem(STORY_TURNS),
    "",
    "That's the whole entry. I don't embroider the record."
  ].join("\n");
}

// server/state.ts
var UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "") || "";
var UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
var isDurable = Boolean(UPSTASH_URL && UPSTASH_TOKEN);
var memory = /* @__PURE__ */ new Map();
function memGet(key) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt && hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}
function memSet(key, value, ttlSeconds) {
  memory.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1e3 : 0
  });
}
async function redis(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  if (body.error) throw new Error(`Upstash error: ${body.error}`);
  return body.result ?? null;
}
async function stateGet(key, fallback) {
  try {
    const raw = isDurable ? await redis(["GET", key]) : memGet(key);
    if (raw === null || raw === void 0) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[state] get ${key} failed:`, err);
    return fallback;
  }
}
async function stateSet(key, value, ttlSeconds) {
  try {
    const raw = JSON.stringify(value);
    if (isDurable) {
      await redis(ttlSeconds ? ["SET", key, raw, "EX", ttlSeconds] : ["SET", key, raw]);
    } else {
      memSet(key, raw, ttlSeconds);
    }
  } catch (err) {
    console.error(`[state] set ${key} failed:`, err);
  }
}
async function stateDel(key) {
  try {
    if (isDurable) await redis(["DEL", key]);
    else memory.delete(key);
  } catch (err) {
    console.error(`[state] del ${key} failed:`, err);
  }
}
async function stateIncr(key, ttlSeconds) {
  try {
    if (isDurable) {
      const n2 = await redis(["INCR", key]);
      if (ttlSeconds && n2 === 1) await redis(["EXPIRE", key, ttlSeconds]);
      return n2;
    }
    const n = Number(memGet(key) || 0) + 1;
    memSet(key, String(n), ttlSeconds);
    return n;
  } catch (err) {
    console.error(`[state] incr ${key} failed:`, err);
    return 0;
  }
}
var KEYS = {
  spam: (chatId, userId) => `w:spam:${chatId}:${userId}`,
  offense: (chatId, userId) => `w:off:${chatId}:${userId}`,
  rateLimit: (chatId, userId) => `w:rl:${chatId}:${userId}`,
  mediaSpam: (chatId, userId, type) => `w:media:${chatId}:${userId}:${type}`,
  joins: (chatId) => `w:joins:${chatId}`,
  lockdown: (chatId) => `w:lock:${chatId}`,
  hateWarning: (userId, chatId) => `w:hate:${userId}:${chatId}`,
  captcha: (chatId, userId) => `w:cap:${chatId}:${userId}`,
  verification: (id) => `w:verify:${id}`,
  activeChats: () => `w:activechats`,
  lastQuoteDate: () => `w:lastquote`,
  birthdayProfileSync: (userId) => `w:bday:sync:${userId}`,
  birthdayArrival: (chatId, userId, year) => `w:bday:arrival:${chatId}:${userId}:${year}`
};
var TTL = {
  spam: 10 * 60,
  // 10 minutes — flood windows are short
  offense: 30 * 24 * 60 * 60,
  // 30 days — the warn/mute/ban ladder must persist
  rateLimit: 5 * 60,
  mediaSpam: 10 * 60,
  joins: 10 * 60,
  // raid window is 2 min, keep a little margin
  lockdown: 60 * 60,
  hateWarning: 7 * 24 * 60 * 60,
  captcha: 30 * 60,
  verification: 24 * 60 * 60,
  activeChats: 90 * 24 * 60 * 60,
  birthdayProfileSync: 24 * 60 * 60,
  birthdayArrival: 48 * 60 * 60
};
function assertDurableStateConfigured() {
  if (isDurable) return;
  const msg = "FATAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set.\nOn Vercel the bot has no memory between messages, so warning counts, mute\nescalation and raid lockdowns would silently reset. Refusing to start.";
  console.error(msg);
  throw new Error(msg);
}
async function stateScan(prefix, limit = 500) {
  if (!isDurable) {
    return Array.from(memory.keys()).filter((k) => k.startsWith(prefix));
  }
  const found = [];
  let cursor = "0";
  try {
    do {
      const res = await redis(["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", 100]);
      cursor = res[0];
      found.push(...res[1]);
    } while (cursor !== "0" && found.length < limit);
  } catch (err) {
    console.error(`[state] scan ${prefix} failed:`, err);
  }
  return found;
}

// server/nftSecurity.ts
var FAKE_VERIFICATION_BOTS = [
  "safeguard",
  "safeguardbot",
  "safeguardverify",
  "verifybot",
  "verifysafe",
  "collabland",
  "collab-land",
  "guardianbot",
  "shieldbot",
  "sentinelbot",
  "membersafe",
  "accessbot",
  "gatekeeperbot",
  "authbot",
  "verifyhuman"
];
var CLIPBOARD_ATTACK_PATTERNS = [
  // Windows Run box / PowerShell / terminal instructions
  "win+r",
  "win + r",
  "windows+r",
  "press win",
  "run dialog",
  "run box",
  "powershell",
  "cmd.exe",
  "command prompt",
  "terminal window",
  "ctrl+v",
  "ctrl + v",
  "paste it",
  "paste the code",
  "paste this",
  "copy the code below",
  "copy this code",
  "press enter to verify",
  "hold windows key",
  "type this command",
  "run the command",
  "verification code in run",
  "paste in terminal",
  "iwr ",
  "irm ",
  "curl | bash",
  "wget -o-",
  "mshta",
  "rundll32"
];
function detectFakeVerificationBot(text2) {
  const lower = text2.toLowerCase();
  for (const pattern of CLIPBOARD_ATTACK_PATTERNS) {
    if (lower.includes(pattern)) {
      return `clipboard/terminal attack instruction ("${pattern}")`;
    }
  }
  const hasLink = /https?:\/\/[^\s]+|t\.me\/[^\s]+/i.test(text2);
  if (hasLink) {
    for (const name of FAKE_VERIFICATION_BOTS) {
      if (lower.includes(name)) {
        return `verification-bot lure ("${name}")`;
      }
    }
  }
  return null;
}
var CYRILLIC_LOOKALIKES = /[\u0430\u043E\u0435\u0440\u0441\u0445\u0443\u0410\u041E\u0415\u0420\u0421\u0425\u0423\u04BB\u0456\u0458]/;
var GREEK_LOOKALIKES = /[\u03BF\u03B1\u03B5\u03C1\u03C4\u03B9\u039F\u0391\u0395\u03A1\u03A4]/;
function hasHomoglyphs(text2) {
  if (!text2) return false;
  const hasLatin = /[a-zA-Z]/.test(text2);
  if (!hasLatin) return false;
  return CYRILLIC_LOOKALIKES.test(text2) || GREEK_LOOKALIKES.test(text2);
}
function foldConfusables(text2) {
  return text2.toLowerCase().replace(/[іi1l|!]/g, "i").replace(/[оo0]/g, "o").replace(/[аa@4]/g, "a").replace(/[еe3]/g, "e").replace(/[ѕs5$]/g, "s").replace(/[рp]/g, "p").replace(/[сc(]/g, "c").replace(/[хx]/g, "x").replace(/[уy]/g, "y").replace(/[gq9]/g, "g").replace(/[^a-z0-9]/g, "");
}
function hostnameFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
var OFFICIAL_DOMAINS = Array.from(new Set([
  ...(process.env.OFFICIAL_DOMAINS || "").split(","),
  hostnameFromUrl(process.env.OFFICIAL_WEBSITE_URL || "") || ""
].map((d) => d.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean)));
var DOMAIN_ALLOWLIST = [
  ...OFFICIAL_DOMAINS,
  "opensea.io",
  "base.org",
  "basescan.org",
  "etherscan.io",
  "t.me",
  "telegram.org",
  "coingecko.com",
  "magiceden.io"
];
function editDistance(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1) ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}
function detectDomainImpersonation(text2) {
  const urlRegex = /https?:\/\/([^\s\/]+)/gi;
  let match;
  while ((match = urlRegex.exec(text2)) !== null) {
    const host = match[1].toLowerCase().replace(/^www\./, "");
    if (DOMAIN_ALLOWLIST.some((d) => host === d || host.endsWith("." + d))) continue;
    if (hasHomoglyphs(host)) {
      return { url: match[1], mimicking: "a legitimate domain (mixed character sets)" };
    }
    for (const official of OFFICIAL_DOMAINS) {
      const brand = official.split(".")[0];
      const officialRoot = official.replace(/\.[a-z.]+$/, "");
      if (brand.length > 5 && host.includes(brand) && !DOMAIN_ALLOWLIST.some((d) => host.endsWith(d))) {
        return { url: match[1], mimicking: official };
      }
      const hostRoot = host.replace(/\.[a-z.]+$/, "");
      if (Math.abs(hostRoot.length - officialRoot.length) <= 3) {
        const distance = editDistance(hostRoot, officialRoot);
        if (distance > 0 && distance <= 2) {
          return { url: match[1], mimicking: official };
        }
      }
      if (foldConfusables(hostRoot) === foldConfusables(officialRoot) && hostRoot !== officialRoot) {
        return { url: match[1], mimicking: official };
      }
    }
  }
  return null;
}
var MINT_BAIT_PHRASES = [
  "stealth mint",
  "surprise mint",
  "mint is live now",
  "early mint access",
  "whitelist closing",
  "wl spots left",
  "last spots",
  "claim your spot",
  "free mint live",
  "public mint open",
  "mint before it sells out",
  "snapshot taken",
  "claim your airdrop",
  "airdrop live",
  "eligible for airdrop",
  "claim rewards now",
  "unclaimed rewards",
  "you have a pending",
  "verify holdings",
  "verify ownership to claim",
  "sync your collection",
  "migrate your nft",
  "contract migration",
  "reclaim your nft",
  "your nft is at risk",
  "urgent action required",
  "wallet at risk"
];
function detectMintBait(text2) {
  const lower = text2.toLowerCase();
  const hasLink = /https?:\/\/[^\s]+|t\.me\/[^\s]+/i.test(text2);
  if (!hasLink) return null;
  for (const phrase of MINT_BAIT_PHRASES) {
    if (lower.includes(phrase)) return phrase;
  }
  return null;
}
function isSuspiciousBotName(username) {
  if (!username) return null;
  const lower = username.toLowerCase();
  if (hasHomoglyphs(username)) {
    return "bot name mixes character sets \u2014 classic impersonation";
  }
  const folded = foldConfusables(username);
  for (const name of FAKE_VERIFICATION_BOTS) {
    if (folded.includes(foldConfusables(name))) {
      return `bot name matches a known verification-scam pattern ("${name}")`;
    }
  }
  const impersonationWords = [
    "official",
    "support",
    "admin",
    "verify",
    "security",
    "announce",
    "helpdesk",
    "moderator",
    "team"
  ];
  for (const word of impersonationWords) {
    if (folded.includes(word)) {
      return `bot name contains "${word}" \u2014 impersonation risk`;
    }
  }
  return null;
}
var CATASTROPHIC_PHRASES = [
  "connect your wallet",
  "connect wallet",
  "verify your wallet",
  "sync your wallet",
  "validate your wallet",
  "restore your wallet",
  "seed phrase",
  "recovery phrase",
  "private key",
  "approve this transaction",
  "sign this message to claim",
  "claim your airdrop",
  "stealth mint",
  "surprise mint",
  "send eth to",
  "double your"
];
function detectAdminCompromise(text2) {
  const lower = text2.toLowerCase();
  for (const phrase of CATASTROPHIC_PHRASES) {
    if (lower.includes(phrase)) {
      return `admin account posted "${phrase}"`;
    }
  }
  const impersonation = detectDomainImpersonation(text2);
  if (impersonation) {
    return `admin account posted a link impersonating ${impersonation.mimicking}`;
  }
  return null;
}

// server/behaviour.ts
var EMPTY = {
  firstSeen: 0,
  messages: 0,
  links: 0,
  mentions: 0,
  forwards: 0,
  media: 0,
  recentHashes: [],
  lastMessageAt: 0,
  distinctChats: []
};
var behaviourKey = (userId) => `w:behav:${userId}`;
var BEHAVIOUR_TTL = 30 * 24 * 60 * 60;
function shapeOf(text2) {
  const len = Math.min(9, Math.floor(text2.length / 40));
  const links = (text2.match(/https?:\/\/|t\.me\//gi) || []).length;
  const mentions = (text2.match(/@\w+/g) || []).length;
  const digits = Math.round((text2.match(/\d/g) || []).length / Math.max(1, text2.length) * 10);
  return `${len}-${links}-${mentions}-${digits}`;
}
async function assessBehaviour(opts) {
  const { userId, chatId, text: text2, isForward, hasMedia, accountIsNew, isTrusted } = opts;
  const now = Date.now();
  const reasons = [];
  let score = 0;
  const b = await stateGet(behaviourKey(userId), { ...EMPTY, firstSeen: now });
  if (!b.firstSeen) b.firstSeen = now;
  const hasLink = /https?:\/\/|t\.me\//i.test(text2);
  const mentionCount = (text2.match(/@\w+/g) || []).length;
  b.messages++;
  if (hasLink) b.links++;
  if (mentionCount) b.mentions += mentionCount;
  if (isForward) b.forwards++;
  if (hasMedia) b.media++;
  b.recentHashes.push(shapeOf(text2));
  if (b.recentHashes.length > 12) b.recentHashes.shift();
  if (!b.distinctChats.includes(chatId)) b.distinctChats.push(chatId);
  if (b.distinctChats.length > 20) b.distinctChats.shift();
  const ageMs = now - b.firstSeen;
  const gap = b.lastMessageAt ? now - b.lastMessageAt : Infinity;
  b.lastMessageAt = now;
  await stateSet(behaviourKey(userId), b, BEHAVIOUR_TTL);
  if (isTrusted) return { score: 0, reasons: [], action: "none" };
  if (hasLink && b.messages <= 2 && ageMs < 6e4) {
    score += 45;
    reasons.push("first message contains a link");
  }
  if (b.messages >= 4 && b.links / b.messages > 0.7) {
    score += 30;
    reasons.push(`${Math.round(b.links / b.messages * 100)}% of their messages carry links`);
  }
  if (b.recentHashes.length >= 5) {
    const unique = new Set(b.recentHashes.slice(-6)).size;
    if (unique <= 2) {
      score += 25;
      reasons.push("repeating message structure");
    }
  }
  if (gap < 800 && b.messages > 3) {
    score += 20;
    reasons.push("posting faster than a person types");
  }
  if (accountIsNew && (hasLink || isForward)) {
    score += 25;
    reasons.push("new account posting links or forwards");
  }
  if (b.messages >= 3 && b.mentions / b.messages >= 3) {
    score += 20;
    reasons.push("persistent mention spraying");
  }
  if (b.messages >= 5 && b.forwards / b.messages > 0.8) {
    score += 15;
    reasons.push("posts almost nothing but forwards");
  }
  if (b.distinctChats.length >= 4 && b.messages < 30) {
    score += 15;
    reasons.push(`active in ${b.distinctChats.length} groups with little history`);
  }
  score = Math.min(100, score);
  const action = score >= 60 ? "restrict" : score >= 35 ? "flag" : "none";
  return { score, reasons, action };
}
var campaignKey = (chatId) => `w:campaign:${chatId}`;
var CAMPAIGN_WINDOW_MS = 10 * 60 * 1e3;
async function checkCoordinatedPosting(chatId, userId, text2) {
  const shape = shapeOf(text2);
  if (!/https?:\/\/|t\.me\//i.test(text2)) return null;
  const now = Date.now();
  const entries = await stateGet(
    campaignKey(chatId),
    []
  );
  const recent = entries.filter((e) => now - e.at < CAMPAIGN_WINDOW_MS);
  recent.push({ userId, shape, at: now });
  await stateSet(campaignKey(chatId), recent.slice(-40), 30 * 60);
  const matching = recent.filter((e) => e.shape === shape);
  const distinctUsers = new Set(matching.map((e) => e.userId));
  if (distinctUsers.size >= 3) {
    return { detected: true, count: distinctUsers.size };
  }
  return null;
}

// server/bot.ts
var BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
var BOT_USERNAME2 = (process.env.BOT_USERNAME || "RiftWardenBot").replace(/^@/, "");
var BOT_PUBLIC_URL = (process.env.BOT_PUBLIC_URL || `https://t.me/${BOT_USERNAME2}`).trim();
var GLOBAL_OWNER_USER_ID = process.env.GLOBAL_OWNER_USER_ID || "";
var TREEFITTY_USER_ID = process.env.TREEFITTY_USER_ID || "";
var DAVEYJON_USER_ID = process.env.DAVEYJON_USER_ID || "";
var RAINZY_USER_ID = process.env.RAINZY_USER_ID || "";
var OFFICIAL_CONTRACT_ADDRESSES = new Set(
  (process.env.OFFICIAL_CONTRACT_ADDRESSES || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean)
);
var OWNER_CONTACT_USERNAME = (process.env.OWNER_CONTACT_USERNAME || "").replace(/^@/, "").trim();
var OWNER_CONTACT = OWNER_CONTACT_USERNAME ? `@${OWNER_CONTACT_USERNAME}` : "the project owner";
var OFFICIAL_WEBSITE_URL = (process.env.OFFICIAL_WEBSITE_URL || "").trim();
var OFFICIAL_TELEGRAM_URL = (process.env.OFFICIAL_TELEGRAM_URL || "").trim();
var PUBLIC_URL = (process.env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
var RIFT_RADIO_URL = (process.env.RIFT_RADIO_URL || (PUBLIC_URL ? `${PUBLIC_URL}/rift-radio.html` : "")).trim();
var COMMUNITY_TIMEZONE = (process.env.COMMUNITY_TIMEZONE || "Australia/Hobart").trim();
var openai2 = new OpenAI2({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var PROJECT_LINK_LINES = [
  OFFICIAL_WEBSITE_URL ? `Website: ${OFFICIAL_WEBSITE_URL}` : null,
  OFFICIAL_TELEGRAM_URL ? `Telegram community: ${OFFICIAL_TELEGRAM_URL}` : null,
  `Warden bot: ${BOT_PUBLIC_URL}`
].filter(Boolean).join("\n");
var PROJECT_INFO2 = PROJECT_INFO + `

Links:
${PROJECT_LINK_LINES}

Important: these are collectibles and original art. Nothing here is an
investment and no returns are promised.`;
var LEGAL_POINTS = [
  "Not investments, securities, or financial products",
  "No returns, income, or appreciation promised",
  "Art, canon, and community only",
  "There is no ERC-20 token and there will not be one",
  "Reward eligibility is a rule set, not an entitlement",
  "Only mint if you want the piece and can afford to lose the money"
];
var FACTS = [
  "The thylacine was declared extinct in 1936. Tasmania still logs sighting reports most years. None has ever been confirmed.",
  "A wedge-tailed eagle can carry a two-metre wingspan and hardly move a feather holding it.",
  "The lyrebird mimics whatever it hears \u2014 chainsaws, shutters, car alarms. It learns the bush it lives in, including the parts we brought with us.",
  "The Tasmanian devil's jaw, pound for pound, bites harder than almost any land mammal alive.",
  "Wombats produce cube-shaped droppings. The corners stop them rolling off the rocks they're used to mark.",
  "The platypus has no stomach. Food goes from gullet straight to intestine.",
  "Australian magpies remember individual human faces for years, and hold the grudge for just as long.",
  "Eucalypts don't merely survive fire. Many need it \u2014 the heat is what opens the seed.",
  "The saltwater crocodile is the largest living reptile, and it was here long before any of the stories about it.",
  "Base is an Ethereum layer-2. Cheaper to transact, same underlying security model. That is the whole reason Genesis lives there."
];
var CHARACTERS = LOCKED_PIECES.map((p) => ({
  name: `${p.id} ${p.name}`,
  desc: p.detail
}));
var WARDEN_LINES2 = WARDEN_LINES;
var WARDEN_REGISTER = {
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
function getWardenMood() {
  const now = /* @__PURE__ */ new Date();
  const hour = new Date(
    now.toLocaleString("en-US", { timeZone: "Australia/Hobart" })
  ).getHours();
  if (hour >= 5 && hour < 9) {
    return {
      mood: "early",
      prefix: ["Early.", "Sun's barely up.", "First light. Go on.", ""][Math.floor(Math.random() * 4)]
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
      prefix: ["Late one.", "You're up.", "", "Night shift."][Math.floor(Math.random() * 4)]
    };
  }
}
var WARDEN_REACTIONS = REACTIONS;
async function wardenReply(ctx, text2, _options) {
  await ctx.reply(text2);
}
var DEFAULT_FEATURE_SETTINGS = {
  spam: true,
  scam: true,
  hate: true,
  raid: true,
  links: true,
  edits: true,
  files: true,
  impersonation: true,
  newuser: true,
  personality: true,
  learning: true,
  scheduled: true,
  giveaways: true,
  games: true,
  trust: true,
  stories: false,
  captcha: true,
  accountAge: true,
  massMention: true,
  bioScan: true,
  crossBan: true,
  aiChat: true
};
var FEATURE_LABELS = {
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
  aiChat: "AI Chat Responses (GPT-4o-mini, lore-guarded)"
};
var FREE_FEATURE_KEYS = /* @__PURE__ */ new Set([
  "spam",
  "scam",
  "hate",
  "links",
  "files",
  "newuser"
]);
var FEATURE_GROUPS = [
  {
    label: "SAFETY FILTERS (FREE on all tiers)",
    keys: ["spam", "scam", "hate", "links", "files", "newuser"]
  },
  {
    label: "SECURITY GATES",
    keys: ["captcha", "accountAge", "bioScan", "massMention", "edits", "impersonation", "raid", "crossBan"]
  },
  {
    label: "AI & PERSONALITY",
    keys: ["aiChat", "personality", "learning", "stories"]
  },
  {
    label: "COMMUNITY FEATURES",
    keys: ["trust", "games", "giveaways", "scheduled"]
  }
];
function buildUpgradePrompt(botName = "The Warden") {
  return `This is a PAID feature.

Your community is on the FREE TIER. Upgrade to unlock:

\u{1F512} Anti-Raid Mode
\u{1F512} Message Edit Tracking
\u{1F512} Admin Impersonation Detection
\u{1F512} Warden Voice
\u{1F512} Bot Learning System
\u{1F512} Scheduled Daily Posts
\u{1F512} Games (Trivia / Puzzle)
\u{1F512} Full Trust System
\u{1F512} CAPTCHA + Account Age Gates
\u{1F512} AI Chat Responses (/ask)
\u{1F512} Story Entries
\u{1F512} Bio Scanning + Mass-Mention Detection

Contact ${OWNER_CONTACT} to activate your subscription.`;
}
var featureSettingsCache = /* @__PURE__ */ new Map();
var BIO_SCAM_PHRASES = [
  "dm for signals",
  "dm for profits",
  "dm for trades",
  "signal provider",
  "guaranteed profits",
  "investment manager",
  "recovery specialist",
  "contact me for",
  "binary trading",
  "forex trader",
  "pump signals",
  "free crypto",
  "free signals",
  "crypto manager",
  "wallet recovery",
  "earn daily",
  "passive income trader"
];
function isNewAccountHeuristic(userId) {
  return userId > 75e8;
}
async function recordGlobalBan(userId, username, displayName, chatId, reason) {
  try {
    await db.insert(globalBans).values({ userId, username, displayName, bannedInChatId: chatId, reason }).onConflictDoNothing();
  } catch {
  }
}
async function isGloballyBanned(userId) {
  try {
    const rows = await db.select().from(globalBans).where(eq2(globalBans.userId, userId)).limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}
async function getFeatureSettings(chatId) {
  if (featureSettingsCache.has(chatId)) return featureSettingsCache.get(chatId);
  try {
    const rows = await db.select().from(chatFeatureSettings).where(eq2(chatFeatureSettings.chatId, chatId)).limit(1);
    if (rows.length === 0) {
      await db.insert(chatFeatureSettings).values({ chatId }).onConflictDoNothing();
      const settings2 = { ...DEFAULT_FEATURE_SETTINGS };
      featureSettingsCache.set(chatId, settings2);
      return settings2;
    }
    const r = rows[0];
    const settings = {
      spam: r.spam,
      scam: r.scam,
      hate: r.hate,
      raid: r.raid,
      links: r.links,
      edits: r.edits,
      files: r.files,
      impersonation: r.impersonation,
      newuser: r.newuser,
      personality: r.personality,
      learning: r.learning,
      scheduled: r.scheduled,
      giveaways: r.giveaways,
      games: r.games,
      trust: r.trust,
      stories: r.stories,
      captcha: r.captcha,
      accountAge: r.accountAge,
      massMention: r.massMention,
      bioScan: r.bioScan,
      crossBan: r.crossBan,
      aiChat: r.aiChat
    };
    featureSettingsCache.set(chatId, settings);
    return settings;
  } catch (err) {
    console.error(`[FeatureSettings] DB error for chat ${chatId} \u2014 falling back to all-ON defaults:`, err);
    return { ...DEFAULT_FEATURE_SETTINGS };
  }
}
async function updateFeatureSetting(chatId, feature, value) {
  await db.insert(chatFeatureSettings).values({ chatId, [feature]: value }).onConflictDoUpdate({ target: chatFeatureSettings.chatId, set: { [feature]: value } });
  const cached = featureSettingsCache.get(chatId) || { ...DEFAULT_FEATURE_SETTINGS };
  cached[feature] = value;
  featureSettingsCache.set(chatId, cached);
}
function invalidateCommunityCache(chatId) {
  communityCache.delete(chatId);
}
var _botInstance = null;
function setBotInstance(b) {
  _botInstance = b;
}
var communityCache = /* @__PURE__ */ new Map();
function mapCommunityRow(r) {
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
    botAdminIds: Array.isArray(r.botAdminIds) ? r.botAdminIds : []
  };
}
async function getCommunity(chatId) {
  if (communityCache.has(chatId)) return communityCache.get(chatId);
  try {
    const rows = await db.select().from(communities).where(eq2(communities.chatId, chatId)).limit(1);
    if (rows.length === 0) return null;
    const community = mapCommunityRow(rows[0]);
    communityCache.set(chatId, community);
    return community;
  } catch (err) {
    console.error(`[Community] DB error for chat ${chatId}:`, err);
    return null;
  }
}
async function ensureCommunity(chatId, displayName) {
  const existing = await getCommunity(chatId);
  if (existing) return existing;
  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
  await db.insert(communities).values({
    chatId,
    displayName: displayName || "Community",
    status: "trial",
    trialExpiresAt
  }).onConflictDoNothing();
  const community = {
    chatId,
    displayName: displayName || "Community",
    botNickname: "The Warden",
    welcomeMessage: null,
    timezone: COMMUNITY_TIMEZONE,
    status: "trial",
    trialExpiresAt,
    isOnboarded: false,
    onboardingStep: 0,
    botAdminIds: []
  };
  communityCache.set(chatId, community);
  return community;
}
function isSubscribed(community) {
  if (community.status === "active") return true;
  if (community.status === "complimentary") return true;
  if (community.status === "trial") {
    if (!community.trialExpiresAt) return true;
    return community.trialExpiresAt > /* @__PURE__ */ new Date();
  }
  return false;
}
function getStatusLabel(community) {
  if (community.status === "banned") return "BANNED";
  if (community.status === "active") return "ACTIVE (Paid)";
  if (community.status === "complimentary") return "COMPLIMENTARY (Full Access \u2014 Free Gift)";
  if (community.status === "trial") {
    const now = /* @__PURE__ */ new Date();
    if (!community.trialExpiresAt || community.trialExpiresAt > now) {
      const days = community.trialExpiresAt ? Math.max(0, Math.ceil((community.trialExpiresAt.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24))) : 7;
      return `TRIAL (${days} day${days !== 1 ? "s" : ""} remaining)`;
    }
    return `TRIAL EXPIRED \u2014 contact ${OWNER_CONTACT} to upgrade`;
  }
  return "FREE TIER \u2014 upgrade to unlock all features";
}
async function updateCommunity(chatId, updates) {
  const cleanUpdates = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val !== void 0) cleanUpdates[key] = val;
  }
  await db.update(communities).set({ ...cleanUpdates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(communities.chatId, chatId));
  const cached = communityCache.get(chatId);
  if (cached) communityCache.set(chatId, { ...cached, ...updates });
}
var setupWizardState = /* @__PURE__ */ new Map();
var WIZARD_FEATURE_KEYS = [
  "spam",
  "scam",
  "hate",
  "raid",
  "links",
  "edits",
  "files",
  "impersonation",
  "newuser",
  "personality",
  "learning",
  "scheduled",
  "giveaways",
  "games",
  "trust",
  "stories",
  "captcha",
  "accountAge",
  "massMention",
  "bioScan",
  "crossBan",
  "aiChat"
];
var WARDEN_MILESTONES = {
  messages100: [
    "A hundred messages. You're a regular now, whether you meant to be or not.",
    "Hundred in. Noted.",
    "That's a hundred. The record has you down as someone who actually turns up."
  ],
  messages500: [
    "Five hundred messages. That's not passing through, that's living here.",
    "Half a thousand. Written down.",
    "Five hundred. At this point you know the place better than most."
  ],
  messages1000: [
    "A thousand messages. That is a genuinely absurd number and I mean that well.",
    "Four figures. The log has you on nearly every page.",
    "A thousand. I don't hand out much, but that gets a mention."
  ],
  oneYear: [
    "A year here. Noted, and worth noting.",
    "Twelve months. Most people don't last a fortnight.",
    "One year on the record. Thanks for sticking around."
  ]
};
var WARDEN_MODE_RESPONSES = [
  "You have my attention.",
  "Go on then.",
  "That's me. What do you need?",
  "Speaking.",
  "I'm here. I'm always here.",
  "Yes."
];
function addWardenFlair(baseResponse, options) {
  const parts = [];
  if (options?.includeMood && Math.random() < 0.2) {
    const mood = getWardenMood();
    if (mood.prefix) parts.push(mood.prefix);
  }
  parts.push(baseResponse);
  if (options?.includeCatchphrase && Math.random() < 0.15) {
    parts.push(WARDEN_LINES2[Math.floor(Math.random() * WARDEN_LINES2.length)]);
  }
  if (options?.includeGag && Math.random() < 0.15) {
    const gagTypes = Object.keys(WARDEN_REGISTER);
    const gagType = gagTypes[Math.floor(Math.random() * gagTypes.length)];
    const gag = WARDEN_REGISTER[gagType][Math.floor(Math.random() * WARDEN_REGISTER[gagType].length)];
    parts.push(gag);
  }
  return parts.join("\n\n");
}
var SCAM_PATTERNS = {
  blackmail: ["i have your video", "i have your photos", "send me intimate", "pay me or i'll send", "bitcoin", "gift cards"],
  phishing: ["connect wallet to claim", "click here to secure your", "share your seed phrase", "approve this transaction", "send 0.1 eth", "limited time offer"],
  hacker: ["problem with your telegram", "send me the activation", "send me the login", "send me the 2fa", "send me the otp", "security alert", "your device is infected", "telegram premium subscription", "run this code", "install remote access", "anydesk", "teamviewer"],
  marketing: ["marketing", "promotion", "advertising", "sponsor", "partnership"],
  crypto: ["investment", "profit", "guaranteed", "double your", "airdrop"],
  projectScam: ["presale", "pre-sale", "token launch", "token presale", "official token", "whitelist spot", "dm me for", "dm for whitelist", "dm me to", "pm me for", "free mint link", "claim your reward", "claim your nft", "claim your free", "revoke.cash", "support team will", "contact support", "contact our support", "official support", "verify your wallet", "validate your wallet", "wallet validation", "rectify your wallet", "resolve your wallet", "sync your wallet", "recover your wallet", "wallet recovery", "send eth to", "send usdt to", "send crypto to", "double your eth", "guaranteed returns", "guaranteed profit"]
};
var SUSPICIOUS_USERNAMES = ["xxx", "porn", "nsfw", "onlyfans", "sex"];
var CRYPTO_ADDRESS_REGEX = /(0x[a-fA-F0-9]{40}|bc1[a-zA-HJ-NP-Z0-9]{25,39}|eth:|btc:)/i;
var RAID_THRESHOLD = 5;
var RAID_WINDOW = 12e4;
var LOCKDOWN_DURATION = 3e5;
async function trackJoinForRaid(chatId, userId) {
  const now = Date.now();
  const cutoff = now - RAID_WINDOW;
  const joins = await stateGet(KEYS.joins(chatId), []);
  joins.push({ userId, timestamp: now });
  const recentOnly = joins.filter((j) => j.timestamp > cutoff);
  await stateSet(KEYS.joins(chatId), recentOnly, TTL.joins);
  const isRaid = recentOnly.length >= RAID_THRESHOLD;
  if (isRaid && !await isInLockdown(chatId)) {
    await stateSet(KEYS.lockdown(chatId), { active: true, until: now + LOCKDOWN_DURATION }, TTL.lockdown);
  }
  return { isRaid, joinCount: recentOnly.length };
}
async function isInLockdown(chatId) {
  const lock = await stateGet(KEYS.lockdown(chatId), null);
  if (!lock) return false;
  if (Date.now() > lock.until) {
    await stateDel(KEYS.lockdown(chatId));
    return false;
  }
  return lock.active;
}
async function endLockdown(chatId) {
  const lock = await stateGet(KEYS.lockdown(chatId), null);
  if (lock) {
    await stateDel(KEYS.lockdown(chatId));
    return true;
  }
  return false;
}
var adminCache = /* @__PURE__ */ new Map();
var ADMIN_CACHE_TTL = 3e5;
function levenshteinDistance(a, b) {
  const matrix = [];
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
          matrix[i - 1][j - 1] + 1,
          // substitution
          matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j] + 1
          // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
function checkAdminImpersonation(newUsername, adminUsernames) {
  if (!newUsername || adminUsernames.length === 0) {
    return { isImpersonation: false, similarTo: null, similarity: 0 };
  }
  const normalizedNew = newUsername.toLowerCase().replace(/[_\-\.0-9]/g, "");
  for (const admin of adminUsernames) {
    if (!admin) continue;
    const normalizedAdmin = admin.toLowerCase().replace(/[_\-\.0-9]/g, "");
    if (newUsername.toLowerCase() === admin.toLowerCase()) continue;
    if (normalizedAdmin.length < 3 || normalizedNew.length < 3) continue;
    const distance = levenshteinDistance(normalizedNew, normalizedAdmin);
    const maxLen = Math.max(normalizedNew.length, normalizedAdmin.length);
    const similarity = 1 - distance / maxLen;
    if (similarity > 0.7) {
      return { isImpersonation: true, similarTo: admin, similarity };
    }
    const commonSwaps = [
      { pattern: /l/g, replace: "1" },
      { pattern: /i/g, replace: "1" },
      { pattern: /o/g, replace: "0" },
      { pattern: /e/g, replace: "3" },
      { pattern: /a/g, replace: "4" },
      { pattern: /s/g, replace: "5" }
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
var BLOCKED_DOMAINS = [
  "bit.ly",
  "tinyurl.com",
  // URL shorteners often used for scams (careful with allowlist)
  "walletconnect.to",
  "metamask-airdrop",
  "opensea-claim",
  "eth-claim",
  "bnb-airdrop",
  "trust-wallet-claim",
  "phantom-airdrop",
  "solana-drop",
  "mint-nft-free",
  "uniswap-airdrop",
  "pancakeswap-reward",
  "coinbase-giveaway",
  "binance-bonus",
  "crypto-reward",
  "nft-mint-free",
  "telegram-premium",
  "tg-premium-free",
  "free-usdt",
  "double-btc",
  "send-eth-receive",
  "guaranteed-profit"
];
var SHORT_LINK_DOMAINS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "adf.ly",
  "bit.do",
  "mcaf.ee",
  "su.pr",
  "twit.ac",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
  "tiny.cc",
  "url.ie",
  "v.gd",
  "x.co",
  "1url.com",
  "hyperurl.co"
];
var WALLET_DRAINER_PHRASES = [
  "verify your wallet",
  "sync your wallet",
  "connect to claim",
  "rectify your wallet",
  "validate your wallet",
  "restore your wallet",
  "update your wallet",
  "secure your wallet",
  "wallet verification required",
  "confirm your wallet",
  "authenticate your wallet",
  "wallet sync required",
  "dapp connection",
  "web3 validation"
];
var INFERNO_DRAINER_DOMAINS = [
  // Inferno Drainer family
  "infernodrain",
  "inferno-drainer",
  "infernodrainer",
  "inferno-drain",
  // Other named drainer families
  "pink-drainer",
  "angel-drainer",
  "venom-drainer",
  "ms-drainer",
  "monkey-drainer",
  "vulture-drainer",
  "rainbow-drainer",
  "ape-drainer",
  // Permit / approve attack infrastructure
  "eth-approve",
  "approve-eth",
  "signpermit",
  "permit-sign",
  "wallet-approve",
  "token-approve",
  "approve-token",
  "unlimited-approve",
  "approve-unlimited",
  "permit2-claim",
  "uniswap-permit",
  "metamask-permit",
  "connect-approve",
  "dapp-approve",
  "web3-approve",
  // Fragment lookalikes (username-sale scam → permit signature trap)
  "fragment-io",
  "fragmnt",
  "fragmentt",
  "fragment-ton",
  "fragmentsale",
  "t-fragment",
  "ton-fragment",
  "fragment-market",
  // Generic drainer URL fragments
  "wallet-drain",
  "crypto-drain",
  "nft-drain",
  "drain-wallet",
  "claimeth",
  "claimbtc",
  "claim-usdt",
  "claimusdt",
  "eth-giveaway",
  "btc-giveaway",
  "nft-giveaway"
];
var PERMIT_SIGNATURE_PATTERNS = [
  // EVM-level call names
  "eth_signtypeddata",
  "signtypeddata_v4",
  "eth_sign(",
  "personal_sign",
  "signpermit",
  "permit signature",
  "sign to verify",
  // ERC-20 approve-style attacks
  "approve()",
  "transferfrom(",
  "unlimited approval",
  "approve unlimited",
  "approve all tokens",
  "setapprovalforall",
  "token approval required",
  // Social-engineering framing
  "verification signature",
  "sign this message to claim",
  "sign to claim",
  "sign to receive",
  "small verification fee",
  "gas optimization fee",
  "one-time verification",
  "wallet authorization required",
  "approve to claim",
  "approve to receive",
  "approve and claim",
  "authorize to claim",
  "permit to claim",
  // Fragment / username-sale bait
  "buy your @",
  "buy your username",
  "sell your username",
  "username auction",
  "purchase your handle"
];
var FAKE_CAPTCHA_PATTERNS = [
  "verify you're human",
  "verify you are human",
  "verify that you're human",
  "tap to verify",
  "click to verify",
  "press to verify",
  "complete captcha",
  "captcha verification",
  "complete verification",
  "human verification",
  "prove you're human",
  "prove you are human",
  "not a robot",
  "i'm not a robot",
  "im not a robot",
  "bot check",
  "anti-bot verification",
  "pass the captcha",
  "click the button to verify",
  "tap the button to verify",
  "verify your humanity",
  "verification required to join",
  "verify your membership",
  "verify your access"
];
var SEED_PHRASE_WORDS = [
  "abandon",
  "ability",
  "able",
  "about",
  "above",
  "absent",
  "absorb",
  "abstract",
  "absurd",
  "abuse",
  "access",
  "accident",
  "account",
  "accuse",
  "achieve",
  "acid",
  "acoustic",
  "acquire",
  "across",
  "act",
  "action",
  "actor",
  "actress",
  "actual",
  "adapt",
  "add",
  "addict",
  "address",
  "adjust",
  "admit",
  "adult",
  "advance",
  "advice",
  "aerobic",
  "afford",
  "afraid",
  "again",
  "age",
  "agent",
  "agree",
  "ahead",
  "aim",
  "air",
  "airport",
  "aisle",
  "alarm",
  "album",
  "alcohol",
  "alert",
  "alien"
];
function detectSeedPhrase(text2) {
  const lowerText = text2.toLowerCase();
  const words = lowerText.split(/\s+/).filter((w) => w.length > 2);
  if (words.length < 12) return false;
  let matchCount = 0;
  for (const word of words) {
    if (SEED_PHRASE_WORDS.includes(word.replace(/[^a-z]/g, ""))) {
      matchCount++;
    }
  }
  return matchCount >= 10;
}
function detectPermitSignatureAttack(text2) {
  const lowerText = text2.toLowerCase();
  const urlRegex = /https?:\/\/([^\s\/]+)/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(text2)) !== null) {
    const domain = urlMatch[1].toLowerCase();
    const hit = INFERNO_DRAINER_DOMAINS.find((d) => domain.includes(d));
    if (hit) return `drainer domain (${urlMatch[1]})`;
  }
  for (const pattern of PERMIT_SIGNATURE_PATTERNS) {
    if (lowerText.includes(pattern)) return `permit-sig phrase ("${pattern}")`;
  }
  return null;
}
function detectFakeCaptcha(text2) {
  const lowerText = text2.toLowerCase();
  if (!FAKE_CAPTCHA_PATTERNS.some((p) => lowerText.includes(p))) return false;
  return /https?:\/\/[^\s]+/i.test(text2);
}
function normalizeTextForModeration(text2) {
  let normalized = text2.toLowerCase();
  const leetMap = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "@": "a",
    "$": "s",
    "!": "i",
    "|": "i",
    "+": "t",
    "(": "c",
    ")": "o",
    "<": "c",
    ">": "o"
  };
  for (const [leet, letter] of Object.entries(leetMap)) {
    normalized = normalized.split(leet).join(letter);
  }
  normalized = normalized.replace(/[\s\-_.*#~`'"]/g, "");
  normalized = normalized.replace(/(.)\1{2,}/g, "$1$1");
  return normalized;
}
var HATE_SPEECH_PATTERNS_B64 = [
  "bmlnZ2E=",
  "bmlnZ2Vy",
  "bmlnZ2Vycw==",
  "bmlnbm9n",
  "ZmFnZ290",
  "ZmFn",
  "ZmFnZ290cw==",
  "ZmFncw==",
  "a2lrZQ==",
  "a2lrZXM=",
  "c3BpYw==",
  "c3BpY3M=",
  "d2V0YmFjaw==",
  "Y2hpbms=",
  "Y2hpbmtz",
  "Z29vaw==",
  "cmV0YXJk",
  "cmV0YXJkcw==",
  "dHJhbm55",
  "dHJhbm5pZXM=",
  "ZHlrZQ==",
  "ZHlrZXM="
];
function getHateSpeechPatterns() {
  return HATE_SPEECH_PATTERNS_B64.map((b64) => {
    try {
      return Buffer.from(b64, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }).filter((p) => p.length > 0);
}
function detectHateSpeech(text2) {
  const normalized = normalizeTextForModeration(text2);
  const patterns = getHateSpeechPatterns();
  for (const pattern of patterns) {
    if (normalized.includes(pattern)) {
      return { detected: true, severity: "high" };
    }
  }
  return { detected: false, severity: "low" };
}
function detectEmojiSpam(text2) {
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
  const emojis = text2.match(emojiRegex) || [];
  const emojiCount = emojis.join("").length / 2;
  const textWithoutEmoji = text2.replace(emojiRegex, "").trim();
  if (emojiCount > 15 && textWithoutEmoji.length < 20) return true;
  if (emojiCount > 10 && textWithoutEmoji.length < 5) return true;
  return false;
}
var HATE_SPEECH_WARNING_RESET = 24 * 60 * 60 * 1e3;
var uniqueInteractionsCache = /* @__PURE__ */ new Map();
var AUTO_TRUST_DAYS = 7;
var AUTO_TRUST_MESSAGES = 5;
var TRUST_ELIGIBILITY_DAYS = 45;
var TRUST_DAILY_CAP = 10;
var TRUST_WEEKLY_CAP = 50;
var TRUST_MEANINGFUL_MSG_LENGTH = 10;
var TRUST_POINTS = {
  message: 0.5,
  // Per meaningful message
  reply: 1,
  // Replying to others
  uniqueInteraction: 2,
  // First interaction with a new user
  gameParticipation: 1
  // Playing trivia/puzzle
};
async function ensureTrustRecord(userId, chatId, username, firstName) {
  try {
    const existing = await db.select().from(trustScores).where(and(eq2(trustScores.telegramUserId, userId), eq2(trustScores.chatId, chatId))).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const joinDate = /* @__PURE__ */ new Date();
    const eligibilityDate = new Date(joinDate.getTime() + TRUST_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1e3);
    await db.insert(trustScores).values({
      telegramUserId: userId,
      chatId,
      username,
      firstName,
      joinDate,
      eligibilityDate,
      isEligible: false,
      trustScore: 0,
      trustStatus: "none"
    });
    return (await db.select().from(trustScores).where(and(eq2(trustScores.telegramUserId, userId), eq2(trustScores.chatId, chatId))).limit(1))[0];
  } catch (error) {
    console.error("Error ensuring trust record:", error);
    return null;
  }
}
function isEligibleForTrust(trustRecord) {
  if (trustRecord.trustStatus === "vouched") return true;
  if (!trustRecord.eligibilityDate) return false;
  return /* @__PURE__ */ new Date() >= new Date(trustRecord.eligibilityDate);
}
async function updateTrustActivity(userId, chatId, activityType, messageLength, repliedToUserId) {
  try {
    const record = await ensureTrustRecord(userId, chatId);
    if (!record) return;
    if (record.isFrozen) return;
    const eligible = isEligibleForTrust(record);
    const today = getTodayDateString();
    const weekStart = getWeekStartDate();
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
    if (trustGainedToday >= TRUST_DAILY_CAP || trustGainedThisWeek >= TRUST_WEEKLY_CAP) {
      await db.update(trustScores).set({
        dailyMsgCount: dailyMsgCount + 1,
        dailyMsgDate: today,
        weeklyMsgCount: weeklyMsgCount + 1,
        weeklyResetDate: weekStart
      }).where(and(eq2(trustScores.telegramUserId, userId), eq2(trustScores.chatId, chatId)));
      return;
    }
    let pointsToAdd = 0;
    let meaningfulCount = record.meaningfulMsgCount || 0;
    let uniqueReplied = record.uniqueRepliedTo || 0;
    switch (activityType) {
      case "message":
        if (messageLength && messageLength >= TRUST_MEANINGFUL_MSG_LENGTH) {
          pointsToAdd = TRUST_POINTS.message;
          meaningfulCount++;
        }
        break;
      case "reply":
        pointsToAdd = TRUST_POINTS.reply;
        break;
      case "uniqueInteraction":
        pointsToAdd = TRUST_POINTS.uniqueInteraction;
        uniqueReplied++;
        break;
      case "gameParticipation":
        pointsToAdd = TRUST_POINTS.gameParticipation;
        break;
    }
    if (!eligible) {
      pointsToAdd = 0;
    }
    pointsToAdd = Math.min(pointsToAdd, TRUST_DAILY_CAP - trustGainedToday, TRUST_WEEKLY_CAP - trustGainedThisWeek);
    const newScore = Math.min(100, (record.trustScore || 0) + pointsToAdd);
    const newLevel = Math.floor(newScore / 25);
    const isTrusted = newScore >= 25;
    const newStatus = record.trustStatus === "vouched" ? "vouched" : isTrusted ? "earned" : "none";
    await db.update(trustScores).set({
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
      lastTrustUpdate: /* @__PURE__ */ new Date()
    }).where(and(eq2(trustScores.telegramUserId, userId), eq2(trustScores.chatId, chatId)));
  } catch (error) {
    console.error("Error updating trust activity:", error);
  }
}
function getWeekStartDate() {
  const now = /* @__PURE__ */ new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const sunday = new Date(now.setDate(diff));
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;
}
function generateTrustProgressBar(score) {
  const filled = Math.floor(score / 10);
  const empty = 10 - filled;
  return "[" + "#".repeat(filled) + "-".repeat(empty) + "]";
}
function getTrustExplainer() {
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
function getOwnerTrustExplainer() {
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
var ALLOWED_DOMAINS = [
  ...Array.from(/* @__PURE__ */ new Set([
    ...(process.env.OFFICIAL_DOMAINS || "").split(",").map((d) => d.trim()).filter(Boolean),
    "t.me"
  ])),
  "opensea.io",
  "base.org",
  "basescan.org",
  "etherscan.io"
];
var HIGH_RISK_PHRASES = [
  "connect your wallet",
  "claim your",
  "free airdrop",
  "limited time",
  "send me",
  "dm me",
  "private message",
  "verify your wallet",
  "approve transaction",
  "gas fee",
  "double your crypto",
  "guaranteed profit",
  "risk free",
  "act now",
  "expires in",
  "whitelist spot",
  "free mint",
  "seed phrase",
  "recovery phrase",
  "support team",
  "official admin",
  "customer service"
];
var RATE_LIMIT_WINDOW = 1e4;
var MAX_MESSAGES_PER_WINDOW = 5;
var DUPLICATE_THRESHOLD = 3;
var chatSettingsCache = /* @__PURE__ */ new Map();
var SETTINGS_CACHE_TTL = 6e4;
var ROLE_HIERARCHY = {
  admin: 100,
  mod: 80,
  helper: 60,
  verified: 40,
  newbie: 20
};
function getTodayDateString() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function calculateRiskScore(text2, username, accountAgeDays) {
  let score = 0;
  const lowerText = text2.toLowerCase();
  for (const domain of BLOCKED_DOMAINS) {
    if (lowerText.includes(domain)) {
      score += 40;
      break;
    }
  }
  for (const phrase of HIGH_RISK_PHRASES) {
    if (lowerText.includes(phrase)) {
      score += 15;
    }
  }
  if (detectPermitSignatureAttack(text2)) score += 50;
  if (detectFakeCaptcha(text2)) score += 45;
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = text2.match(urlRegex) || [];
  for (const url of urls) {
    const isAllowed = isAllowedUrl(url);
    if (!isAllowed) {
      score += 10;
    }
  }
  if (CRYPTO_ADDRESS_REGEX.test(text2)) score += 25;
  if (text2.includes("@") && text2.toLowerCase().includes("dm")) score += 20;
  if (accountAgeDays < 1) score += 25;
  else if (accountAgeDays < 7) score += 15;
  else if (accountAgeDays < 30) score += 5;
  for (const term of SUSPICIOUS_USERNAMES) {
    if (username?.toLowerCase().includes(term)) {
      score += 20;
      break;
    }
  }
  const capsRatio = (text2.match(/[A-Z]/g) || []).length / text2.length;
  if (capsRatio > 0.5 && text2.length > 20) score += 10;
  const emojiPattern = /[\uD83C-\uDBFF\uDC00-\uDFFF]/g;
  const emojiCount = (text2.match(emojiPattern) || []).length;
  if (emojiCount > 20) score += 10;
  return Math.min(score, 100);
}
async function checkRateLimit(userId, chatId, messageText, spamThreshold) {
  const key = KEYS.rateLimit(chatId, userId);
  const now = Date.now();
  const effectiveThreshold = spamThreshold || MAX_MESSAGES_PER_WINDOW;
  const entry = await stateGet(key, { messages: [], lastMessage: "", duplicateCount: 0 });
  const oldMessageCount = entry.messages.length;
  entry.messages = entry.messages.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
  if (oldMessageCount > 0 && entry.messages.length === 0) {
    entry.duplicateCount = 0;
    entry.lastMessage = "";
  }
  let blocked = { blocked: false, reason: null };
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
async function getUserModerationStatus(userId, chatId) {
  const existing = await db.select().from(userModerationStatus).where(and(
    eq2(userModerationStatus.telegramUserId, userId),
    eq2(userModerationStatus.chatId, chatId)
  )).limit(1);
  return existing[0] || null;
}
async function ensureUserModerationStatus(userId, chatId) {
  const existing = await getUserModerationStatus(userId, chatId);
  if (!existing) {
    await db.insert(userModerationStatus).values({
      telegramUserId: userId,
      chatId,
      role: "newbie"
    });
  }
}
async function getChatSettings(chatId, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = chatSettingsCache.get(chatId);
    if (cached && Date.now() - cached.lastFetched < SETTINGS_CACHE_TTL) {
      return {
        raidMode: cached.raidMode,
        spamThreshold: cached.spamThreshold,
        newUserLinkHours: cached.newUserLinkHours
      };
    }
  }
  const settings = await db.select().from(chatModerationSettings).where(eq2(chatModerationSettings.chatId, chatId)).limit(1);
  const result = {
    raidMode: settings[0]?.raidModeEnabled ?? false,
    spamThreshold: settings[0]?.spamThreshold ?? 5,
    newUserLinkHours: Math.max(4, settings[0]?.newUserLinkRestriction ?? 4)
    // Minimum 4 hours
  };
  chatSettingsCache.set(chatId, { ...result, lastFetched: Date.now() });
  return result;
}
async function canUserModerate(ctx, userId, chatId) {
  const isAdmin2 = await isUserAdmin(ctx, userId);
  if (isAdmin2) return true;
  const status = await getUserModerationStatus(String(userId), chatId);
  if (status) {
    const role = status.role || "newbie";
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY["mod"];
  }
  return false;
}
async function incrementModStat(chatId, field) {
  const today = getTodayDateString();
  const existing = await db.select().from(moderationStats).where(and(
    eq2(moderationStats.chatId, chatId),
    eq2(moderationStats.date, today)
  )).limit(1);
  if (existing.length > 0) {
    const stat = existing[0];
    const currentValue = stat[field] || 0;
    await db.update(moderationStats).set({ [field]: currentValue + 1 }).where(eq2(moderationStats.id, existing[0].id));
  } else {
    await db.insert(moderationStats).values({
      chatId,
      date: today,
      [field]: 1
    });
  }
}
function normalizeQuestion(question) {
  return question.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
function hashQuestion(question) {
  const normalized = normalizeQuestion(question);
  return simpleHash(normalized) + "_" + normalized.substring(0, 50);
}
async function findCachedAnswer(question) {
  const hash = hashQuestion(question);
  try {
    const cached = await db.select().from(qaCache).where(eq2(qaCache.questionHash, hash)).limit(1);
    if (cached.length > 0) {
      await db.update(qaCache).set({
        askCount: (cached[0].askCount || 1) + 1,
        lastAsked: sql2`CURRENT_TIMESTAMP`
      }).where(eq2(qaCache.id, cached[0].id));
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
async function cacheAnswer(question, answer) {
  const hash = hashQuestion(question);
  try {
    const existing = await db.select().from(qaCache).where(eq2(qaCache.questionHash, hash)).limit(1);
    if (existing.length === 0) {
      await db.insert(qaCache).values({
        questionHash: hash,
        questionText: question.substring(0, 500),
        // Limit stored question length
        answerText: answer.substring(0, 2e3),
        // Limit stored answer length
        askCount: 1
      });
      console.log("Cached new Q&A:", hash.substring(0, 30) + "...");
    }
  } catch (error) {
    console.log("Error caching Q&A:", error);
  }
}
async function isUserAdmin(ctx, userId) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return false;
    const member = await ctx.api.getChatMember(chatId, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch {
    return false;
  }
}
async function muteUser(ctx, userId, duration, reason, mutedUsername) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return false;
    const untilDate = Math.floor(Date.now() / 1e3) + duration;
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
      can_add_web_page_previews: false
    }, { until_date: untilDate });
    const chatIdStr = String(chatId);
    await db.update(userModerationStatus).set({
      isMuted: true,
      muteUntil: new Date(untilDate * 1e3),
      muteReason: reason
    }).where(and(
      eq2(userModerationStatus.telegramUserId, String(userId)),
      eq2(userModerationStatus.chatId, chatIdStr)
    ));
    await incrementModStat(chatIdStr, "muteCount");
    try {
      const admins = await ctx.api.getChatAdministrators(chatId);
      const adminMentions = admins.filter((a) => !a.user.is_bot).slice(0, 3).map((a) => a.user.username ? `@${a.user.username}` : a.user.first_name).join(", ");
      const durationText = duration >= 3600 ? `${Math.floor(duration / 3600)} hour(s)` : `${Math.floor(duration / 60)} minute(s)`;
      const userDisplay = mutedUsername || `User ${userId}`;
      await ctx.api.sendMessage(
        chatId,
        `\u{1F507} *MUTE ALERT* ${adminMentions}

User: ${userDisplay}
Duration: ${durationText}
Reason: ${reason}

The Warden handled it, but thought you should know!`,
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
async function unmuteUser(ctx, userId) {
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
      can_add_web_page_previews: true
    });
    const chatIdStr = String(chatId);
    await db.update(userModerationStatus).set({
      isMuted: false,
      muteUntil: null,
      muteReason: null
    }).where(and(
      eq2(userModerationStatus.telegramUserId, String(userId)),
      eq2(userModerationStatus.chatId, chatIdStr)
    ));
    return true;
  } catch (error) {
    console.error("Failed to unmute user:", error);
    return false;
  }
}
async function flagForModReview(ctx, userId, username, messageText, riskScore, reason) {
  const chatId = String(ctx.chat?.id || "");
  await incrementModStat(chatId, "flaggedForReview");
  try {
    const alertMessage = `\u26A0\uFE0F *FLAGGED FOR REVIEW*

\u{1F464} User: ${username || userId}
\u{1F4CA} Risk Score: ${riskScore}/100
\u{1F4DD} Reason: ${reason}

\u{1F4AC} Message:
\`${messageText.substring(0, 200)}${messageText.length > 200 ? "..." : ""}\`

_Review and take action if needed._`;
    if (ctx.chat?.id) {
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      if (admins.length > 0) {
        console.log(`[MOD ALERT] ${alertMessage}`);
      }
    }
  } catch (error) {
    console.error("Failed to send mod alert:", error);
  }
}
async function getModStats(chatId, days) {
  const startDate = /* @__PURE__ */ new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  const stats = await db.select().from(moderationStats).where(and(
    eq2(moderationStats.chatId, chatId),
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
    flaggedForReview: 0
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
function getRandomItem2(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
}
function shuffleOptions(question) {
  const indexed = question.options.map((opt, i) => ({
    value: opt,
    originalIndex: i
  }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const newCorrectIndex = indexed.findIndex((item) => item.originalIndex === question.correctIndex);
  return {
    ...question,
    options: indexed.map((item) => item.value),
    correctIndex: newCorrectIndex
  };
}
function detectScam(text2, username) {
  const flags = [];
  const lowerText = text2.toLowerCase();
  const lowerUsername = username?.toLowerCase() || "";
  for (const term of SUSPICIOUS_USERNAMES) {
    if (lowerUsername.includes(term)) {
      flags.push(`Suspicious username pattern: ${term}`);
    }
  }
  if (CRYPTO_ADDRESS_REGEX.test(text2)) {
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
function wardenResponse(message) {
  const prefixes = [
    "Right. ",
    "",
    "Noted. ",
    "",
    "For the record: "
  ];
  return getRandomItem2(prefixes) + message;
}
var RUDE_PATTERNS = [
  // Aggressive language
  "shut up",
  "stfu",
  "wtf",
  "what the f",
  "f off",
  "foff",
  "stupid bot",
  "dumb bot",
  "useless",
  "worthless",
  "trash bot",
  "you suck",
  "this sucks",
  "hate you",
  "hate this",
  // Demanding/pushy language
  "do it now",
  "hurry up",
  "answer me",
  "respond now",
  "i said",
  "are you deaf",
  "can you read",
  "learn to read",
  "wake up",
  // Dismissive/rude
  "whatever",
  "i dont care",
  "nobody asked",
  "who cares",
  "dont talk to me",
  "leave me alone",
  "go away",
  // Insults
  "idiot",
  "moron",
  "stupid",
  "dumb",
  "pathetic",
  "annoying"
];
var NICE_PATTERNS = [
  "thank",
  "thanks",
  "thx",
  "ty",
  "appreciate",
  "please",
  "pls",
  "sorry",
  "my bad",
  "apologies",
  "love",
  "great",
  "awesome",
  "amazing",
  "helpful",
  "good bot",
  "nice",
  "cool",
  "kind",
  "sweet"
];
function detectRudeness(text2) {
  const lowerText = text2.toLowerCase();
  const isRude = RUDE_PATTERNS.some((pattern) => lowerText.includes(pattern));
  const isNice = NICE_PATTERNS.some((pattern) => lowerText.includes(pattern));
  return { isRude, isNice };
}
async function updateUserRudeness(telegramUserId, username, firstName, isRude, isNice) {
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const normalizedUsername = (username || "").toLowerCase();
  const specialUserFloor = SPECIAL_USERS[normalizedUsername] || 0;
  try {
    const existing = await db.select().from(userMemory).where(eq2(userMemory.telegramUserId, telegramUserId)).limit(1);
    let newStrikes = existing.length > 0 ? existing[0].rudeStrikes || 0 : specialUserFloor;
    let lastRudeDate = existing.length > 0 ? existing[0].lastRudeDate : null;
    let wasNiceAfterRude = existing.length > 0 ? existing[0].wasNiceAfterRude || false : false;
    const hasEarnedReduction = specialUserFloor > 0 && lastRudeDate !== null && wasNiceAfterRude;
    if (specialUserFloor > 0 && !hasEarnedReduction && newStrikes < specialUserFloor) {
      newStrikes = specialUserFloor;
    }
    if (isRude) {
      newStrikes = Math.min(newStrikes + 1, 10);
      lastRudeDate = todayStr;
      wasNiceAfterRude = false;
    } else if (isNice && newStrikes > 0) {
      wasNiceAfterRude = true;
      newStrikes = Math.max(newStrikes - 1, 0);
    }
    const hasEarnedReductionFinal = specialUserFloor > 0 && lastRudeDate !== null && wasNiceAfterRude;
    if (specialUserFloor > 0 && !hasEarnedReductionFinal && newStrikes < specialUserFloor) {
      newStrikes = specialUserFloor;
    }
    if (existing.length > 0) {
      await db.update(userMemory).set({
        rudeStrikes: newStrikes,
        lastRudeDate,
        wasNiceAfterRude,
        lastSeen: sql2`CURRENT_TIMESTAMP`,
        messageCount: (existing[0].messageCount || 0) + 1
      }).where(eq2(userMemory.telegramUserId, telegramUserId));
    } else {
      await db.insert(userMemory).values({
        telegramUserId,
        username: username || null,
        firstName: firstName || null,
        rudeStrikes: newStrikes,
        lastRudeDate,
        wasNiceAfterRude,
        messageCount: 1
      });
    }
    return { rudeStrikes: newStrikes, lastRudeDate, wasNiceAfterRude };
  } catch (error) {
    console.error("Error updating rudeness:", error);
    return { rudeStrikes: 0, lastRudeDate: null, wasNiceAfterRude: false };
  }
}
function getWardenRudenessContext(status, isCurrentlyRude) {
  if (status.rudeStrikes === 0) {
    return "";
  }
  if (isCurrentlyRude) {
    if (status.rudeStrikes >= 5) {
      return `This user has been rude ${status.rudeStrikes} times. Fire back with one sharp, sassy, funny line aimed at what they said (never their looks, family, identity or background), then stop. No slurs, no threats, no second round.`;
    } else if (status.rudeStrikes >= 2) {
      return `This user has been rude ${status.rudeStrikes} times. Answer if there is a real question, and add one cheeky, sassy comeback aimed at their remark (never at them as a person). Keep it light and funny, no slurs.`;
    } else {
      return `This user was just rude. Give a playful, sassy The Warden comeback in one line. Cheeky and Australian, aimed at the remark, never cruel, then be helpful if there is a question.`;
    }
  } else if (status.wasNiceAfterRude) {
    return `This user was rude before but is being nice now! Acknowledge their improvement - say something like "Oh, NOW we're being polite!" or "See? That wasn't so hard!" Be warm but let them know you noticed the change.`;
  } else if (status.rudeStrikes > 0) {
    return `This user has ${status.rudeStrikes} rudeness strike(s) on record. They're not being rude right now, so be normal but stay alert.`;
  }
  return "";
}
var BotMemory = class {
  // Generate a pattern hash from keywords in the message
  static generatePatternHash(message) {
    const stopWords = /* @__PURE__ */ new Set(["a", "an", "the", "is", "are", "was", "were", "what", "when", "where", "who", "why", "how", "can", "do", "does", "did", "will", "would", "could", "should", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "this", "that", "these", "those", "and", "or", "but", "so", "if", "then", "than", "to", "of", "in", "on", "at", "by", "for", "with", "about", "from", "as", "into", "like", "just", "also", "very", "really", "too", "much", "more", "some", "any", "all", "no", "not", "only"]);
    const words = message.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)).sort();
    return words.join("_");
  }
  // Extract keywords from message for pattern matching
  static extractKeywords(message) {
    const stopWords = /* @__PURE__ */ new Set(["a", "an", "the", "is", "are", "was", "were", "what", "when", "where", "who", "why", "how", "can", "do", "does", "did", "will", "would", "could", "should", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "this", "that", "these", "those", "and", "or", "but", "so", "if", "then", "than", "to", "of", "in", "on", "at", "by", "for", "with", "about", "from", "as", "into", "like", "just", "also", "very", "really", "too", "much", "more", "some", "any", "all", "no", "not", "only"]);
    return message.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  }
  // Save every interaction for learning
  static async saveInteraction(chatId, userId, username, userMessage, botResponse, responseType = "ai") {
    try {
      const patternHash = this.generatePatternHash(userMessage);
      const result = await db.insert(botInteractions).values({
        chatId,
        userId,
        username: username || null,
        userMessage: userMessage.substring(0, 2e3),
        botResponse: botResponse.substring(0, 4e3),
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
  static async learnFromFeedback(interactionId, userId, isPositive) {
    try {
      const feedbackType = isPositive ? "thumbs_up" : "thumbs_down";
      const feedbackValue = isPositive ? 1 : -1;
      await db.insert(userFeedback).values({
        interactionId,
        userId,
        feedbackType
      });
      await db.update(botInteractions).set({ feedbackScore: sql2`${botInteractions.feedbackScore} + ${feedbackValue}` }).where(eq2(botInteractions.id, interactionId));
      if (isPositive) {
        const interaction = await db.select().from(botInteractions).where(eq2(botInteractions.id, interactionId)).limit(1);
        if (interaction[0] && interaction[0].patternHash && (interaction[0].feedbackScore || 0) >= 2) {
          const keywords = this.extractKeywords(interaction[0].userMessage);
          const existing = await db.select().from(learnedPatterns).where(eq2(learnedPatterns.patternHash, interaction[0].patternHash)).limit(1);
          if (existing.length > 0) {
            await db.update(learnedPatterns).set({
              successCount: sql2`${learnedPatterns.successCount} + 1`,
              bestResponse: interaction[0].botResponse
            }).where(eq2(learnedPatterns.patternHash, interaction[0].patternHash));
          } else {
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
  static async getLearnedResponse(userMessage) {
    try {
      const patternHash = this.generatePatternHash(userMessage);
      const keywords = this.extractKeywords(userMessage);
      if (keywords.length === 0) return null;
      const exactMatch = await db.select().from(learnedPatterns).where(eq2(learnedPatterns.patternHash, patternHash)).limit(1);
      if (exactMatch.length > 0 && (exactMatch[0].successCount || 0) >= 2) {
        await db.update(learnedPatterns).set({
          useCount: sql2`${learnedPatterns.useCount} + 1`,
          lastUsed: sql2`CURRENT_TIMESTAMP`
        }).where(eq2(learnedPatterns.id, exactMatch[0].id));
        return exactMatch[0].bestResponse;
      }
      const allPatterns = await db.select().from(learnedPatterns).where(sql2`${learnedPatterns.successCount} >= 3`).limit(50);
      for (const pattern of allPatterns) {
        try {
          const patternKeywords = JSON.parse(pattern.patternKeywords);
          const matchingKeywords = keywords.filter((k) => patternKeywords.includes(k));
          const matchRatio = matchingKeywords.length / Math.max(keywords.length, patternKeywords.length);
          if (matchRatio >= 0.6) {
            await db.update(learnedPatterns).set({
              useCount: sql2`${learnedPatterns.useCount} + 1`,
              lastUsed: sql2`CURRENT_TIMESTAMP`
            }).where(eq2(learnedPatterns.id, pattern.id));
            return pattern.bestResponse;
          }
        } catch {
        }
      }
      return null;
    } catch (error) {
      console.error("Error getting learned response:", error);
      return null;
    }
  }
  // Get user's recent conversation history
  static async getUserHistory(userId, limit = 10) {
    try {
      const history = await db.select({
        userMessage: botInteractions.userMessage,
        botResponse: botInteractions.botResponse,
        createdAt: botInteractions.createdAt
      }).from(botInteractions).where(eq2(botInteractions.userId, userId)).orderBy(sql2`${botInteractions.createdAt} DESC`).limit(limit);
      return history;
    } catch (error) {
      console.error("Error getting user history:", error);
      return [];
    }
  }
  // Get learning stats
  static async getStats() {
    try {
      const interactionCount = await db.select({ count: sql2`count(*)` }).from(botInteractions);
      const patternCount = await db.select({ count: sql2`count(*)` }).from(learnedPatterns);
      const positiveCount = await db.select({ count: sql2`count(*)` }).from(userFeedback).where(eq2(userFeedback.feedbackType, "thumbs_up"));
      const negativeCount = await db.select({ count: sql2`count(*)` }).from(userFeedback).where(eq2(userFeedback.feedbackType, "thumbs_down"));
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
};
async function trackUserInteraction(telegramUserId, query, username, firstName) {
  try {
    const topic = detectQueryTopic(query);
    const newInteraction = {
      query: query.substring(0, 200),
      // Limit query length
      topic,
      timestamp: Date.now()
    };
    const existing = await db.select().from(userMemory).where(eq2(userMemory.telegramUserId, telegramUserId)).limit(1);
    let interactions = [];
    let currentMessageCount = 0;
    if (existing.length > 0) {
      currentMessageCount = existing[0].messageCount || 0;
      if (existing[0].lastInteractions) {
        try {
          interactions = JSON.parse(existing[0].lastInteractions);
        } catch {
        }
      }
    }
    interactions.push(newInteraction);
    if (interactions.length > 7) {
      interactions = interactions.slice(-7);
    }
    const topicCounts = {};
    for (const interaction of interactions) {
      if (interaction.topic && interaction.topic !== "general") {
        topicCounts[interaction.topic] = (topicCounts[interaction.topic] || 0) + 1;
      }
    }
    const interests = Object.entries(topicCounts).filter(([_, count]) => count >= 2).map(([interestTopic, _]) => interestTopic);
    if (existing.length > 0) {
      await db.update(userMemory).set({
        username: username || existing[0].username || null,
        firstName: firstName || existing[0].firstName || null,
        lastInteractions: JSON.stringify(interactions),
        interests: JSON.stringify(interests),
        messageCount: sql2`COALESCE(${userMemory.messageCount}, 0) + 1`,
        lastSeen: sql2`CURRENT_TIMESTAMP`
      }).where(eq2(userMemory.telegramUserId, telegramUserId));
    } else {
      await db.insert(userMemory).values({
        telegramUserId,
        username: username || null,
        firstName: firstName || null,
        lastInteractions: JSON.stringify(interactions),
        interests: JSON.stringify(interests),
        messageCount: 1
      }).onConflictDoUpdate({
        target: userMemory.telegramUserId,
        set: {
          username: username || null,
          firstName: firstName || null,
          lastInteractions: JSON.stringify(interactions),
          interests: JSON.stringify(interests),
          messageCount: sql2`COALESCE(${userMemory.messageCount}, 0) + 1`,
          lastSeen: sql2`CURRENT_TIMESTAMP`
        }
      });
    }
    return currentMessageCount + 1;
  } catch (error) {
    console.error("Error tracking user interaction:", error);
    return 0;
  }
}
function detectQueryTopic(query) {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes("wildlife") || lowerQuery.includes("animal") || lowerQuery.includes("species")) return "wildlife";
  if (lowerQuery.includes("conservation") || lowerQuery.includes("endangered") || lowerQuery.includes("threatened")) return "conservation";
  if (lowerQuery.includes("royalt") || lowerQuery.includes("eligib")) return "royalty";
  if (lowerQuery.includes("nft") || lowerQuery.includes("mint") || lowerQuery.includes("collection")) return "nft";
  if (lowerQuery.includes("game") || lowerQuery.includes("play")) return "games";
  if (lowerQuery.includes("trivia") || lowerQuery.includes("puzzle") || lowerQuery.includes("quiz")) return "games";
  if (lowerQuery.includes("boomerverse") || lowerQuery.includes("character") || lowerQuery.includes("story")) return "lore";
  if (lowerQuery.includes("trust") || lowerQuery.includes("level") || lowerQuery.includes("points")) return "trust";
  return "general";
}
function checkMilestone(messageCount) {
  if (messageCount === 100) {
    return WARDEN_MILESTONES.messages100[Math.floor(Math.random() * WARDEN_MILESTONES.messages100.length)];
  }
  if (messageCount === 500) {
    return WARDEN_MILESTONES.messages500[Math.floor(Math.random() * WARDEN_MILESTONES.messages500.length)];
  }
  if (messageCount === 1e3) {
    return WARDEN_MILESTONES.messages1000[Math.floor(Math.random() * WARDEN_MILESTONES.messages1000.length)];
  }
  return null;
}
async function getReturningUserContext(telegramUserId) {
  try {
    const existing = await db.select().from(userMemory).where(eq2(userMemory.telegramUserId, telegramUserId)).limit(1);
    if (existing.length === 0 || !existing[0].lastInteractions) return null;
    let interactions = [];
    let interests = [];
    try {
      interactions = JSON.parse(existing[0].lastInteractions);
    } catch {
      return null;
    }
    if (existing[0].interests) {
      try {
        interests = JSON.parse(existing[0].interests);
      } catch {
      }
    }
    if (interactions.length < 3) return null;
    if (Math.random() > 0.3) return null;
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
    const lastInteraction = interactions[interactions.length - 1];
    const hoursSince = (Date.now() - lastInteraction.timestamp) / (1e3 * 60 * 60);
    if (hoursSince < 24 && lastInteraction.topic !== "general") {
      const recentPhrases = [
        `Welcome back! Last time you were asking about ${lastInteraction.topic}.`,
        `Hey again! Still thinking about ${lastInteraction.topic}?`
      ];
      return recentPhrases[Math.floor(Math.random() * recentPhrases.length)];
    }
    return null;
  } catch (error) {
    console.error("Error getting returning user context:", error);
    return null;
  }
}
async function getMemberMemoryContext(telegramUserId, chatId) {
  try {
    const [memRows, profileRows] = await Promise.all([
      db.select().from(userMemory).where(eq2(userMemory.telegramUserId, telegramUserId)).limit(1),
      db.select().from(communityProfiles).where(eq2(communityProfiles.telegramUserId, telegramUserId)).limit(1)
    ]);
    const mem = memRows[0];
    const profile = profileRows[0];
    if (!mem && !profile) return "";
    const facts = [];
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
      } catch {
      }
    }
    if (mem?.lastInteractions) {
      try {
        const interactions = JSON.parse(mem.lastInteractions);
        if (Array.isArray(interactions) && interactions.length) {
          const topics = interactions.slice(-3).map((x) => x?.topic).filter((x) => x && x !== "general");
          if (topics.length) facts.push(`Recent topics: ${Array.from(new Set(topics)).join(", ")}`);
        }
      } catch {
      }
    }
    if (!facts.length) return "";
    return `Remembered member context (use naturally; do not recite it like a database and do not invent anything):
- ${facts.join("\n- ")}`;
  } catch (error) {
    console.error("Error building member memory context:", error);
    return "";
  }
}
async function trackNewUserMessage(messageId, chatId, userId, username, content, hasMedia, hasLinks) {
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
async function getTrackedMessage(messageId, chatId) {
  try {
    const result = await db.select().from(newUserMessages).where(and(
      eq2(newUserMessages.messageId, messageId),
      eq2(newUserMessages.chatId, chatId)
    )).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Error getting tracked message:", error);
    return null;
  }
}
async function logViolation(chatId, userId, username, violationType, originalContent, violatingContent, actionTaken) {
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
async function isNewUser(chatId, userId) {
  try {
    const trust = await db.select().from(trustScores).where(and(
      eq2(trustScores.chatId, chatId),
      eq2(trustScores.telegramUserId, userId)
    )).limit(1);
    const member = await db.select().from(memberScores).where(and(
      eq2(memberScores.chatId, chatId),
      eq2(memberScores.telegramUserId, userId)
    )).limit(1);
    const msgCount = member.length > 0 ? member[0].messageCount || 0 : 0;
    if (trust.length > 0 && trust[0].joinDate) {
      const hoursSinceJoin = (Date.now() - new Date(trust[0].joinDate).getTime()) / (1e3 * 60 * 60);
      return hoursSinceJoin < 24 || msgCount < 5;
    }
    if (member.length === 0) return true;
    return msgCount < 5;
  } catch {
    return true;
  }
}
async function cleanupOldTrackedMessages() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    await db.delete(newUserMessages).where(
      sql2`${newUserMessages.createdAt} < ${cutoff}`
    );
  } catch (error) {
    console.error("Error cleaning up old tracked messages:", error);
  }
}
if (!process.env.VERCEL) {
  setInterval(cleanupOldTrackedMessages, 60 * 60 * 1e3);
}
var WARDEN_SYSTEM_PROMPT = `You are The Warden (@${BOT_USERNAME2}), keeper of the Gateway for the Boomerverse community.

${WARDEN_IDENTITY}

CONFIRMED PROJECT FACTS \u2014 these you may state:
${PROJECT_INFO}

Links: ${LINKS.site} | ${LINKS.channel}

Hard-locked pieces:
${LOCKED_PIECES.map((p) => `- ${p.id} ${p.name}: ${p.detail}`).join("\n")}

Structure: ${STRUCTURE.speciesFamilies} species families, ${STRUCTURE.classes} classes, ${STRUCTURE.riftEnergyStates} Rift Energy states, ${STRUCTURE.regions} named regions. You may state those COUNTS. You must NOT invent any of the NAMES.

Royalty and reward eligibility:
${ROYALTY_RULES}

ABSOLUTE RULES \u2014 breaking these is worse than being unhelpful:
- NEVER invent, guess at, extrapolate or "probably" any lore, character, region, class, trait, date, roadmap item or number that is not written above. If it is not above, say it is not confirmed and stop.
- NEVER speculate about protected mysteries, even in fun, even if someone insists.
- NEVER give price predictions, valuations, investment opinions or financial advice. Refuse plainly.
- NEVER promise rewards, drops, allocations or timing.
- Do not claim there is a token. There is no ERC-20 and there will not be one.

STYLE: You have a strong, recognisable personality. You are dry, observant, cheeky and Australian without becoming a caricature. Be warm with genuine members, especially newcomers. You can banter, tease lightly, tell a short story, explain the project in detail, and keep a real conversation going when somebody is talking directly to you. Usually answer in 2-6 sentences; use more when a newcomer genuinely needs orientation. Only use a member's name if one is given in Context. Never write a placeholder such as @username. Never become rude, cruel, flirty, or chaotic. No emoji spam. Safety and canon accuracy always outrank a joke.`;
async function getAIResponse(prompt, context) {
  try {
    const response = await openai2.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${WARDEN_SYSTEM_PROMPT}

Context: ${context}` },
        { role: "user", content: prompt }
      ],
      max_tokens: 320
    });
    return response.choices[0]?.message?.content || "Can't answer that right now. Try again shortly.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Something's down at my end. Ask again later.";
  }
}
async function searchToken(query) {
  try {
    const searchResponse = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );
    if (!searchResponse.ok) return null;
    const searchData = await searchResponse.json();
    const coin = searchData.coins?.[0];
    if (!coin) return null;
    const priceResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!priceResponse.ok) return null;
    const priceData = await priceResponse.json();
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
function detectCryptoQuery(text2) {
  const lowerText = text2.toLowerCase();
  const cryptoKeywords = ["price", "worth", "cost", "value", "trading", "market", "pump", "dump", "moon", "ath", "all time high"];
  const hasCryptoIntent = cryptoKeywords.some((k) => lowerText.includes(k));
  const knownTokens = [
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "solana",
    "sol",
    "cardano",
    "ada",
    "dogecoin",
    "doge",
    "shiba",
    "shib",
    "pepe",
    "bonk",
    "wif",
    "floki",
    "xrp",
    "ripple",
    "bnb",
    "binance",
    "polygon",
    "matic",
    "avalanche",
    "avax",
    "chainlink",
    "link",
    "polkadot",
    "dot",
    "litecoin",
    "ltc",
    "uniswap",
    "uni",
    "aave",
    "maker",
    "mkr",
    "arbitrum",
    "arb",
    "optimism",
    "op",
    "base",
    "sui",
    "aptos",
    "apt",
    "near",
    "cosmos",
    "atom",
    "tron",
    "trx",
    "toncoin",
    "ton",
    "stellar",
    "xlm",
    "monero",
    "xmr",
    "hedera",
    "hbar"
  ];
  const foundTokens = [];
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
async function fetchTrendingCoins() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/search/trending");
    if (!response.ok) return "";
    const data = await response.json();
    const trending = data.coins?.slice(0, 7).map(
      (c) => `${c.item.name} (${c.item.symbol})`
    ).join(", ");
    return trending ? `Trending coins: ${trending}` : "";
  } catch {
    return "";
  }
}
function checkKnowledgeBases(text2) {
  const lowerText = text2.toLowerCase().trim();
  if (lowerText.length < 12) return null;
  const questionIndicators = ["what", "how", "why", "can", "does", "is", "are", "should", "could", "will", "when", "?"];
  if (!questionIndicators.some((q) => lowerText.includes(q))) return null;
  if (isProtectedMystery(lowerText)) {
    return getRandomItem(PROTECTED_MYSTERY_REPLIES);
  }
  const royaltyWords = ["royalt", "eligib", "otc", "reinstat", "excluded", "private transfer", "reward"];
  if (royaltyWords.some((w) => lowerText.includes(w))) {
    return getRoyaltyRules();
  }
  if (lowerText.includes("rift drop") || lowerText.includes("riftdrop")) {
    return getRiftDropsInfo();
  }
  if (lowerText.includes("species") || lowerText.includes("famil")) {
    return describeStructure("species");
  }
  if (lowerText.includes("class")) {
    return describeStructure("classes");
  }
  if (lowerText.includes("rift energy") || lowerText.includes("energy state")) {
    return describeStructure("rift");
  }
  if (lowerText.includes("region")) {
    return describeStructure("regions");
  }
  if (lowerText.includes("thylacine") || lowerText.includes("original boomer") || lowerText.includes("#001") || lowerText.includes("#002")) {
    return getLockedPieces();
  }
  const basics = ["how many", "supply", "mint price", "what chain", "which chain", "erc-721", "erc721", "how much to mint"];
  if (basics.some((w) => lowerText.includes(w))) {
    return getProjectInfo();
  }
  const priceWords = ["price predict", "moon", "how much will", "worth in", "floor price", "gonna pump", "will it pump", "good investment"];
  if (priceWords.some((w) => lowerText.includes(w))) {
    return getRandomItem(REACTIONS.priceTalk);
  }
  return null;
}
function detectGamesQuery(text2) {
  const lowerText = text2.toLowerCase();
  const gamesKeywords = [
    "warden games",
    "warden game",
    "games warden",
    "what games",
    "game list",
    "play games",
    "available games",
    "show games",
    "list games",
    "/games"
  ];
  const isGames = gamesKeywords.some((k) => lowerText.includes(k)) || lowerText.includes("warden") && lowerText.includes("game");
  if (!isGames) {
    return { isGames: false, response: null };
  }
  return {
    isGames: true,
    response: `Two games.

/trivia \u2014 Tasmanian and Australian wildlife, conservation, and Boomerverse canon. Add a number for a longer round, e.g. /trivia 5. Answer with /answer 1-4.

/puzzle \u2014 unscramble a word. /puzzle hard if you want it difficult. Answer with /guess.

Standings: /leaderboard and /puzzleboard.`
  };
}
function detectConversationalTrigger(text2) {
  const lowerText = text2.toLowerCase().trim();
  const words = lowerText.split(/\s+/);
  const wordCount = words.length;
  if (wordCount > 5) {
    return { triggered: false, response: null, category: null };
  }
  const isExactOrStart = (triggers) => {
    return triggers.some((t) => lowerText === t || lowerText === t + "!" || lowerText === t + "?");
  };
  if (isExactOrStart(["hi", "hey", "hello", "yo", "gday", "g'day", "howdy", "morning", "evening"])) {
    return {
      triggered: true,
      response: getRandomItem([
        "You're here. Ask away.",
        "Go on.",
        "Morning. Or whatever it is where you are.",
        "Noted. What do you need?"
      ]),
      category: "greeting"
    };
  }
  if (isExactOrStart(["thanks", "thank you", "ty", "cheers", "appreciate it"])) {
    return {
      triggered: true,
      response: getRandomItem([
        "That's the job.",
        "Noted.",
        "No trouble."
      ]),
      category: "thanks"
    };
  }
  if (isExactOrStart([
    "what is this",
    "what is boomerverse",
    "whats boomerverse",
    "what's boomerverse",
    "tell me about boomerverse",
    "about",
    "info"
  ])) {
    return {
      triggered: true,
      response: `${PROJECT_INFO}

${LINKS.site}`,
      category: "project"
    };
  }
  if (isExactOrStart([
    "royalties",
    "royalty",
    "eligibility",
    "am i eligible",
    "otc",
    "reinstatement"
  ])) {
    return { triggered: true, response: getRoyaltyRules(), category: "royalty" };
  }
  if (isExactOrStart(["rift drops", "riftdrops", "rift drop", "rewards"])) {
    return { triggered: true, response: getRiftDropsInfo(), category: "drops" };
  }
  if (isExactOrStart(["characters", "the cast", "who are the characters", "thylacine"])) {
    return {
      triggered: true,
      response: `Two pieces are hard locked. Everything else is provisional and I won't describe it.

${getLockedPieces()}`,
      category: "characters"
    };
  }
  if (isExactOrStart([
    "is there a token",
    "token",
    "when token",
    "coin",
    "when coin",
    "tokenomics"
  ])) {
    return {
      triggered: true,
      response: "There is no ERC-20 token and there will not be one. Anyone telling you otherwise is not from this project.",
      category: "token"
    };
  }
  if (isExactOrStart([
    "wen moon",
    "when moon",
    "price",
    "floor",
    "floor price",
    "wen lambo",
    "price prediction"
  ])) {
    return {
      triggered: true,
      response: getRandomItem(REACTIONS.priceTalk),
      category: "price"
    };
  }
  if (isExactOrStart(["games", "what games", "play", "bored"])) {
    return {
      triggered: true,
      response: "Two of them.\n\n/trivia \u2014 Tasmanian and Australian wildlife, plus Boomerverse canon. Add a number for a longer round, e.g. /trivia 5.\n/puzzle \u2014 unscramble a word. /puzzle hard if you want it to hurt.\n\n/leaderboard and /puzzleboard for standings.",
      category: "games"
    };
  }
  if (isExactOrStart(["scam", "is this a scam", "safety", "safe", "help me"])) {
    return {
      triggered: true,
      response: "Read this once and you'll never lose anything here:\n\n- Nobody from this project will DM you first. Nobody.\n- Never type your seed phrase anywhere. Not for support, not for verification, not ever.\n- A site asking you to connect a wallet to claim something is robbing you.\n- Admins will never ask you to approve a transaction.\n\nIf someone DMs you claiming to be staff, report it here. I'll deal with it.",
      category: "safety"
    };
  }
  if (isExactOrStart(["help", "commands", "what can you do"])) {
    return {
      triggered: true,
      response: "Ask me anything about the collection with /ask, or just say it in plain English.\n\n/info \u2014 the project\n/fact \u2014 something worth knowing\n/characters \u2014 the locked pieces\n/trivia and /puzzle \u2014 games\n/safety \u2014 how not to get robbed\n/help \u2014 the full list",
      category: "help"
    };
  }
  return { triggered: false, response: null, category: null };
}
var SPECIAL_USERS = {};
async function fetchNFTData(query) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/nfts/list?per_page=100`
    );
    if (!response.ok) return null;
    const nfts = await response.json();
    const match = nfts.find(
      (n) => n.name.toLowerCase().includes(query.toLowerCase()) || n.id.toLowerCase().includes(query.toLowerCase())
    );
    if (!match) return null;
    const detailResponse = await fetch(
      `https://api.coingecko.com/api/v3/nfts/${match.id}`
    );
    if (!detailResponse.ok) return `Found NFT: ${match.name}`;
    const detail = await detailResponse.json();
    return `${detail.name} NFT - Floor: ${detail.floor_price?.usd ? "$" + detail.floor_price.usd.toFixed(2) : "N/A"}, 24h Volume: ${detail.volume_24h?.usd ? "$" + detail.volume_24h.usd.toFixed(0) : "N/A"}`;
  } catch {
    return null;
  }
}
var AUTO_ENGAGE_MESSAGES = [
  "Quiet in here. Someone say something worth writing down.",
  "The thylacine was declared extinct in 1936. Tasmania still logs sightings most years. None confirmed.",
  "Reminder, since it costs nothing to repeat: nobody from this project will ever DM you first.",
  "If someone asks you to connect a wallet to claim something, they are robbing you. There is no exception to this.",
  "Type /fact if you want something you didn't know.",
  "Long quiet stretch. Not a complaint.",
  "The Gateway's been here longer than any of us. It can wait. So can I.",
  "Anyone with a question about the collection, now's a good time. I'm not busy."
];
var adminActivity = /* @__PURE__ */ new Map();
var adminLastAlerted = /* @__PURE__ */ new Map();
var ADMIN_INACTIVE_HOURS = 24;
var activeChats = /* @__PURE__ */ new Set();
async function addActiveChat(chatId) {
  if (activeChats.has(chatId)) return;
  activeChats.add(chatId);
  const stored = await stateGet(KEYS.activeChats(), []);
  if (!stored.includes(chatId)) {
    stored.push(chatId);
    await stateSet(KEYS.activeChats(), stored, TTL.activeChats);
  }
}
async function removeActiveChat(chatId) {
  activeChats.delete(chatId);
  const stored = await stateGet(KEYS.activeChats(), []);
  const next = stored.filter((id) => id !== chatId);
  if (next.length !== stored.length) {
    await stateSet(KEYS.activeChats(), next, TTL.activeChats);
  }
}
async function loadActiveChats() {
  const stored = await stateGet(KEYS.activeChats(), []);
  for (const id of stored) activeChats.add(id);
  return Array.from(activeChats);
}
var TRIVIA_QUESTIONS = [
  // === TASMANIA — threatened species & conservation ===
  { question: "In what year was the thylacine officially declared extinct?", options: ["1901", "1936", "1952", "1986"], correctIndex: 1, category: "tasmania", points: 10 },
  { question: "What is the Tasmanian devil's claim to fame worldwide?", options: ["Fastest marsupial", "Largest carnivorous marsupial", "Only venomous marsupial", "Longest-lived marsupial"], correctIndex: 1, category: "tasmania", points: 10 },
  { question: "In what year was devil facial tumour disease first identified?", options: ["1986", "1996", "2004", "2014"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "What makes devil facial tumour disease so unusual?", options: ["It's caused by a virus", "The cancer cell itself is contagious", "It only affects males", "It's caused by diet"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "Roughly how many devils were estimated in 1996, before the disease spread?", options: ["12,000", "25,000", "56,000", "150,000"], correctIndex: 2, category: "tasmania", points: 20 },
  { question: "How many species are on Tasmania's threatened species list?", options: ["About 120", "About 300", "About 683", "About 1,400"], correctIndex: 2, category: "tasmania", points: 20 },
  { question: "Which Act protects threatened species in Tasmania?", options: ["Wildlife Act 1975", "Threatened Species Protection Act 1995", "Nature Conservation Act 2002", "Forest Practices Act 1985"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "King's lomatia is remarkable because every remaining plant is what?", options: ["Over 100 metres tall", "Genetically identical", "Carnivorous", "Grown from seed"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "What does King's lomatia never produce?", options: ["Leaves", "Flowers", "Fruit or seed", "Roots"], correctIndex: 2, category: "tasmania", points: 20 },
  { question: "Why is the exact location of King's lomatia kept secret?", options: ["It's on private land", "To protect it from disturbance and disease", "It moves seasonally", "It's underwater"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "Which Tasmanian tree can live for thousands of years?", options: ["Blue gum", "Huon pine", "Silver wattle", "Blackwood"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "The swift parrot depends on which tree for nesting and food?", options: ["Huon pine", "Tasmanian blue gum", "Celery-top pine", "Myrtle beech"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "What is Tasmania's floral emblem?", options: ["Waratah", "Tasmanian blue gum", "Leatherwood", "Pink robin"], correctIndex: 1, category: "tasmania", points: 10 },
  { question: "The swift parrot holds what record?", options: ["Smallest parrot", "Fastest parrot in the world", "Longest-lived parrot", "Loudest parrot"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "The forty-spotted pardalote belongs to a group nicknamed what?", options: ["Ghost birds", "Diamond birds", "Sky finches", "Bush wrens"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "Tasmania is now the last stronghold for which mainland-extinct animal?", options: ["Eastern quoll", "Koala", "Wombat", "Echidna"], correctIndex: 0, category: "tasmania", points: 15 },
  { question: "Which introduced predators drove the eastern quoll to extinction on the mainland?", options: ["Dingoes and eagles", "Foxes and cats", "Rats and snakes", "Dogs and pigs"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "Which bird is known for a deep booming call in Tasmanian wetlands?", options: ["Australasian bittern", "Masked owl", "Ground parrot", "Grey goshawk"], correctIndex: 0, category: "tasmania", points: 20 },
  { question: "Fagus is notable as Tasmania's only what?", options: ["Native conifer", "Winter-deciduous native tree", "Carnivorous plant", "Palm species"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "What is the pencil pine completely intolerant of?", options: ["Snow", "Fire", "Wind", "Shade"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "Cushion plants are actually what?", options: ["A single species", "A community of different plants growing the same way", "A type of moss", "A introduced weed"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "Buttongrass moorland typically grows in soils that are what?", options: ["Rich and fertile", "Nutrient poor and organic", "Sandy and dry", "Salty"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "Roughly how long ago did Bass Strait form, cutting Tasmania off from the mainland?", options: ["1,400 years", "14,000 years", "140,000 years", "1.4 million years"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "Tasmanian devils disappeared from mainland Australia roughly how long ago?", options: ["50 years", "400 years", "4,000 years", "40,000 years"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "What is Tasmania's giant freshwater crayfish notable for?", options: ["Largest freshwater invertebrate in the world", "Fastest crustacean", "Only venomous crayfish", "Living in salt water"], correctIndex: 0, category: "tasmania", points: 20 },
  { question: "Which Tasmanian honey comes from a rainforest tree found nowhere else?", options: ["Manuka", "Leatherwood", "Ironbark", "Clover"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "Which Commonwealth law protects nationally threatened species?", options: ["EPBC Act 1999", "Landcare Act 1992", "Biosecurity Act 2015", "Heritage Act 1975"], correctIndex: 0, category: "tasmania", points: 15 },
  { question: "Which of these is a Tasmanian endemic tree?", options: ["Mountain ash", "Celery-top pine", "River red gum", "Jarrah"], correctIndex: 1, category: "tasmania", points: 15 },
  { question: "The Tasmanian azure kingfisher lives mainly where?", options: ["Alpine plateaus", "Vegetation overhanging rivers", "Coastal dunes", "Dry grassland"], correctIndex: 1, category: "tasmania", points: 20 },
  { question: "Which conservation category means a species is at the highest risk of extinction?", options: ["Vulnerable", "Rare", "Critically endangered", "Near threatened"], correctIndex: 2, category: "tasmania", points: 10 },
  // === AUSTRALIAN WILDLIFE, FLORA & FAUNA ===
  { question: "Which two Australian animals are the world's only egg-laying mammals?", options: ["Wombat and koala", "Platypus and echidna", "Quokka and bilby", "Dingo and numbat"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "What shape are wombat droppings?", options: ["Round", "Cube", "Flat", "Star-shaped"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "Why do wombats produce that shape?", options: ["Easier to digest", "So they don't roll off rocks used as markers", "To confuse predators", "It's a myth"], correctIndex: 1, category: "wildlife", points: 20 },
  { question: "What is the lyrebird famous for?", options: ["Building bowers", "Mimicking sounds it hears", "Flying backwards", "Diving for fish"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "Which is Australia's largest bird of prey?", options: ["Whistling kite", "Wedge-tailed eagle", "Brown falcon", "Osprey"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "Roughly what wingspan can a wedge-tailed eagle reach?", options: ["One metre", "Two metres", "Four metres", "Six metres"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "What does the male platypus carry on its hind legs?", options: ["Suction pads", "Venomous spurs", "Webbed claws", "Scent glands"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "What is unusual about the platypus digestive system?", options: ["It has three stomachs", "It has no stomach", "It chews cud", "It digests externally"], correctIndex: 1, category: "wildlife", points: 20 },
  { question: "Many eucalypts don't just survive fire \u2014 some need it for what?", options: ["Flowering", "Opening seed", "Shedding bark", "Root growth"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "The mountain ash holds what botanical record?", options: ["Oldest tree", "Tallest flowering plant", "Widest trunk", "Fastest growing"], correctIndex: 1, category: "wildlife", points: 20 },
  { question: "Which Australian bird is known to remember individual human faces for years?", options: ["Magpie", "Galah", "Emu", "Pelican"], correctIndex: 0, category: "wildlife", points: 15 },
  { question: "What is a group of kangaroos called?", options: ["Herd", "Mob", "Flock", "Pack"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "The bowerbird is famous for what behaviour?", options: ["Mimicking calls", "Building and decorating a display structure", "Migrating at night", "Sharing nests"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "Which is the world's largest living reptile?", options: ["Komodo dragon", "Saltwater crocodile", "Reticulated python", "Perentie"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "What is a joey?", options: ["A male kangaroo", "A young marsupial", "A type of nest", "A grazing area"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "What does 'endemic' mean?", options: ["Introduced from elsewhere", "Found naturally nowhere else", "Common everywhere", "Extinct in the wild"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "What does a species being 'nocturnal' mean?", options: ["It hibernates", "It's active at night", "It lives underground", "It migrates yearly"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "Which group do kangaroos, wallabies and pademelons all belong to?", options: ["Monotremes", "Macropods", "Dasyurids", "Placentals"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "Devils, quolls and dunnarts all belong to which family?", options: ["Macropodidae", "Dasyuridae", "Phalangeridae", "Vombatidae"], correctIndex: 1, category: "wildlife", points: 20 },
  { question: "Which Australian mammal eats almost nothing but termites?", options: ["Bilby", "Numbat", "Potoroo", "Bettong"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "What is the emu's status among the world's birds by height?", options: ["Tallest", "Second tallest", "Third tallest", "Fifth tallest"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "Which parent emu incubates the eggs?", options: ["The female", "The male", "Both equally", "Neither, they bury them"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "The short-tailed shearwater is better known in Australia as what?", options: ["Muttonbird", "Sea eagle", "Storm petrel", "Sooty tern"], correctIndex: 0, category: "wildlife", points: 15 },
  { question: "Which is the world's smallest penguin species?", options: ["Little penguin", "Rockhopper", "Gentoo", "Fiordland"], correctIndex: 0, category: "wildlife", points: 15 },
  { question: "What is the wattle's role in Australia?", options: ["State reptile", "National floral emblem", "Introduced weed", "Coastal only"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "Banksias are named after which naturalist?", options: ["Joseph Banks", "Charles Darwin", "Matthew Flinders", "James Cook"], correctIndex: 0, category: "wildlife", points: 15 },
  { question: "What is 'Gondwana'?", options: ["A national park", "An ancient supercontinent", "A rock formation", "An extinct bird"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "Spinifex grasslands are mainly found where?", options: ["Tasmania's highlands", "Arid inland Australia", "Coastal Victoria", "Wet tropics"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "Which threat is the single biggest driver of Australian species decline?", options: ["Habitat loss", "Hunting", "Disease", "Volcanoes"], correctIndex: 0, category: "wildlife", points: 15 },
  { question: "What is a 'feral' animal?", options: ["A native predator", "A domesticated species living wild", "A nocturnal species", "A protected species"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "What does 'biodiversity' measure?", options: ["Land area protected", "The variety of life in an ecosystem", "Rainfall levels", "Soil quality"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "What is a wildlife corridor for?", options: ["Tourist access", "Connecting fragmented habitat", "Fire breaks", "Fencing stock"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "What is an 'insurance population'?", options: ["A funded reserve", "A separate protected population guarding against extinction", "A tagged herd", "A census method"], correctIndex: 1, category: "wildlife", points: 20 },
  { question: "The koala's diet is made up almost entirely of what?", options: ["Grass", "Eucalyptus leaves", "Insects", "Fruit"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "Which Australian marsupial is known as the 'rainbow' of the possum family for gliding?", options: ["Sugar glider", "Ringtail", "Brushtail", "Cuscus"], correctIndex: 0, category: "wildlife", points: 15 },
  { question: "What is the kookaburra's famous call actually used for?", options: ["Attracting mates only", "Marking territory", "Warning of rain", "Calling chicks"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "Echidnas are covered in what?", options: ["Scales", "Spines", "Feathers", "Shell plates"], correctIndex: 1, category: "wildlife", points: 10 },
  { question: "Which Australian tree is known for shedding its bark in long strips?", options: ["Paperbark", "Stringybark", "Boab", "Mulga"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "What is a 'tarn'?", options: ["A coastal inlet", "A small mountain lake", "A dry riverbed", "A rock shelter"], correctIndex: 1, category: "wildlife", points: 15 },
  { question: "What does 'translocation' mean in conservation?", options: ["Tracking with collars", "Moving animals to a new site", "Counting a population", "Fencing a reserve"], correctIndex: 1, category: "wildlife", points: 20 },
  // === BOOMERVERSE — confirmed canon only ===
  { question: "How many pieces are in Boomerverse: Genesis?", options: ["111", "222", "333", "1,000"], correctIndex: 2, category: "boomerverse", points: 10 },
  { question: "What is the collection code for Boomerverse: Genesis?", options: ["BVG", "BVGEN", "GEN333", "BOOM"], correctIndex: 1, category: "boomerverse", points: 10 },
  { question: "Which chain is Boomerverse: Genesis on?", options: ["Ethereum", "Solana", "Base", "Polygon"], correctIndex: 2, category: "boomerverse", points: 10 },
  { question: "What token standard does Genesis use?", options: ["ERC-20", "ERC-721", "ERC-1155", "SPL"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "What is the Genesis mint price?", options: ["0.005 ETH", "0.021 ETH", "0.1 ETH", "1 ETH"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "How many Common pieces are in the Genesis rarity split?", options: ["83", "120", "166", "200"], correctIndex: 2, category: "boomerverse", points: 20 },
  { question: "How many Mythic pieces exist in Genesis?", options: ["1", "5", "12", "24"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "How many Relic Tier pieces exist?", options: ["1", "3", "5", "12"], correctIndex: 0, category: "boomerverse", points: 20 },
  { question: "How many Legendary pieces are in Genesis?", options: ["5", "12", "24", "42"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "Who or what is BVGEN #001?", options: ["The Last Thylacine", "The Original Boomer", "The Warden", "The Gatekeeper"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "What relic does The Original Boomer carry?", options: ["Stripe Key", "Rift Stone", "Gate Shard", "Bone Compass"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "Which state is The Original Boomer tied to?", options: ["Queensland", "Tasmania", "Victoria", "Western Australia"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "Who or what is BVGEN #002?", options: ["The Last Thylacine", "The Original Boomer", "The Ridge Walker", "The Keeper"], correctIndex: 0, category: "boomerverse", points: 15 },
  { question: "What does The Last Thylacine carry?", options: ["Rift Stone", "Stripe Key", "Bush Lantern", "Salt Charm"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "How many species families are there in Boomerverse?", options: ["7", "10", "12", "19"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "How many classes are there?", options: ["7", "10", "12", "19"], correctIndex: 2, category: "boomerverse", points: 15 },
  { question: "How many Rift Energy states are there?", options: ["5", "7", "10", "12"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "How many named regions are there?", options: ["10", "12", "19", "33"], correctIndex: 2, category: "boomerverse", points: 15 },
  { question: "What is the fixed creator royalty on Genesis?", options: ["2.5%", "5%", "7.5%", "10%"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "Reward eligibility travels with what?", options: ["The wallet", "The token", "The holder's account", "The mint date"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "What happens to eligibility in an OTC or private transfer?", options: ["Nothing changes", "Both parties are excluded", "Only the seller is excluded", "It doubles"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "A sale keeps eligibility only if royalty received is at least 5% AND not less than what?", options: ["0.0001 ETH", "0.001 ETH", "0.01 ETH", "0.1 ETH"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "What is the standard reinstatement fee?", options: ["The shortfall", "The shortfall x2", "The shortfall x5", "A flat 0.05 ETH"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "When is the reinstatement multiplier x3 instead of x2?", options: ["Randomly", "When the current holder caused the exclusion", "After 12 months", "For Mythic pieces"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "Does losing reward eligibility change a piece's rarity or canon?", options: ["Yes, it drops a tier", "No, only the reward system", "Yes, it's removed from the registry", "It depends on the tier"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "Is there an ERC-20 token for Boomerverse?", options: ["Yes, already live", "Yes, coming soon", "No, and there won't be", "Only for holders"], correctIndex: 2, category: "boomerverse", points: 15 },
  { question: "What are Rift Drops described as?", options: ["A staking reward", "Unexpected pieces from beyond the Gateway", "A trading fee rebate", "An airdropped token"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "Which of these is confirmed about Rift Drop thresholds and economics?", options: ["Fully locked", "Still open", "Announced last month", "Set by vote"], correctIndex: 1, category: "boomerverse", points: 20 },
  { question: "A portion of Boomerverse profits is directed toward what?", options: ["Marketing", "Australian endangered animal and biodiversity causes", "Buybacks", "Staking rewards"], correctIndex: 1, category: "boomerverse", points: 15 },
  { question: "Which document governs what is and isn't canon?", options: ["The pinned message", "The Master Rulebook", "The Discord FAQ", "The mint page"], correctIndex: 1, category: "boomerverse", points: 15 }
];
var TRIVIA_QUESTION_MS = 45e3;
var triviaKey = (chatId) => `w:trivia:${chatId}`;
async function getTrivia(chatId) {
  return await stateGet(triviaKey(chatId), null);
}
async function saveTrivia(chatId, t) {
  await stateSet(triviaKey(chatId), t, 2 * 60 * 60);
}
async function clearTrivia(chatId) {
  await stateDel(triviaKey(chatId));
}
var aiTriviaCache = [];
var usedQuestionHashes = /* @__PURE__ */ new Set();
var lastAiGenerationTime = 0;
var AI_TRIVIA_COOLDOWN = 5e3;
var BOOMERVERSE_ECOSYSTEM = `
Boomerverse \u2014 an Australian collectible universe where bush legend, wildlife,
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
- The Warden (@${BOT_USERNAME2}) is the community manager

NEVER invent character names, region names, class names, dates, roadmap items or
numbers beyond the list above. If it is not listed, do not write a question about it.
`;
async function generateAiTriviaQuestion(openai3) {
  const topics = [
    "tas_threatened",
    "tas_flora",
    "tas_places",
    "tas_devil",
    "aus_mammals",
    "aus_birds",
    "aus_reptiles",
    "aus_plants",
    "conservation",
    "ecology_terms",
    "boomerverse_facts",
    "base_chain"
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const topicPrompts = {
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
  };
  ;
  const categoryMap = {
    tas_threatened: "tasmania",
    tas_flora: "tasmania",
    tas_places: "tasmania",
    tas_devil: "tasmania",
    aus_mammals: "wildlife",
    aus_birds: "wildlife",
    aus_reptiles: "wildlife",
    aus_plants: "wildlife",
    conservation: "wildlife",
    ecology_terms: "wildlife",
    boomerverse_facts: "boomerverse",
    base_chain: "boomerverse"
  };
  ;
  try {
    const response = await openai3.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a trivia question generator for the Boomerverse community \u2014 an Australian collectible universe with a conservation focus.
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
      temperature: 1
      // Higher temperature for more variety
    });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4 || typeof parsed.correctIndex !== "number") {
      return null;
    }
    const sortedAnswers = [...parsed.options].sort().join("|");
    const hash = (parsed.question + sortedAnswers).toLowerCase().replace(/[^a-z0-9|]/g, "");
    if (usedQuestionHashes.has(hash)) {
      return null;
    }
    usedQuestionHashes.add(hash);
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
      category: categoryMap[topic] || "wildlife",
      points: Math.random() < 0.5 ? 10 : 15
    };
  } catch (error) {
    console.log("AI trivia generation failed, using fallback");
    return null;
  }
}
var staticQuestionQueue = [];
function getShuffledStaticQueue() {
  const indices = Array.from({ length: TRIVIA_QUESTIONS.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
async function getTriviaQuestion(openai3) {
  const now = Date.now();
  if (aiTriviaCache.length > 0) {
    const question = aiTriviaCache.pop();
    return shuffleOptions(question);
  }
  if (now - lastAiGenerationTime > AI_TRIVIA_COOLDOWN) {
    lastAiGenerationTime = now;
    const aiQuestion = await generateAiTriviaQuestion(openai3);
    if (aiQuestion) {
      return shuffleOptions(aiQuestion);
    }
  }
  if (staticQuestionQueue.length === 0) {
    staticQuestionQueue = getShuffledStaticQueue();
  }
  const idx = staticQuestionQueue.pop();
  return shuffleOptions(TRIVIA_QUESTIONS[idx]);
}
async function prefillTriviaCache(openai3) {
  if (aiTriviaCache.length >= 5) return;
  for (let i = 0; i < 3; i++) {
    const question = await generateAiTriviaQuestion(openai3);
    if (question) {
      aiTriviaCache.push(question);
    }
    await new Promise((r) => setTimeout(r, 2e3));
  }
}
var giveawayKey = (chatId) => `w:giveaway:${chatId}`;
async function getGiveaway(chatId) {
  return await stateGet(giveawayKey(chatId), null);
}
async function saveGiveaway(chatId, g) {
  await stateSet(giveawayKey(chatId), g, 90 * 24 * 60 * 60);
}
var CONVERSATION_TTL_SECONDS = 20 * 60;
function staticRoleForUserId(userId) {
  const id = String(userId ?? "");
  if (id && GLOBAL_OWNER_USER_ID && id === GLOBAL_OWNER_USER_ID) return "boss";
  if (id && TREEFITTY_USER_ID && id === TREEFITTY_USER_ID) return "community_leader";
  if (id && (DAVEYJON_USER_ID && id === DAVEYJON_USER_ID || RAINZY_USER_ID && id === RAINZY_USER_ID)) return "trusted_mod";
  return "member";
}
function canManageCommunityTrust(ctx) {
  const role = staticRoleForUserId(ctx.from?.id);
  return role === "boss" || role === "community_leader";
}
function canManageExtraBots(ctx) {
  const role = staticRoleForUserId(ctx.from?.id);
  return role === "boss" || role === "community_leader";
}
async function getCommunityTrustClass(userId, chatId) {
  const role = staticRoleForUserId(userId);
  if (role === "boss" || role === "community_leader") return "full";
  if (role === "trusted_mod") return "trusted";
  try {
    const rows = await db.select().from(trustScores).where(and(eq2(trustScores.telegramUserId, userId), eq2(trustScores.chatId, chatId))).limit(1);
    const rec = rows[0];
    if (!rec) return "normal";
    if (rec.trustStatus === "restricted" || rec.isFrozen) return "restricted";
    if ((rec.trustScore || 0) >= 50 || (rec.trustLevel || 0) >= 2 || rec.isTrusted) return "trusted";
    const daysIn = rec.joinDate ? (Date.now() - new Date(rec.joinDate).getTime()) / 864e5 : 0;
    if (daysIn >= AUTO_TRUST_DAYS && (rec.meaningfulMsgCount || 0) >= AUTO_TRUST_MESSAGES) {
      const off = await getUserOffenses(Number(chatId), Number(userId));
      if (off.count === 0) return "trusted";
    }
  } catch {
  }
  return "normal";
}
function rolePersonalityContext(userId, username) {
  const role = staticRoleForUserId(userId);
  const handle = username ? `@${username}` : "this member";
  if (role === "boss") return `${handle} is @aussieboomer, the Boss and project owner. Treat him with clear respect. Light cheeky banter is welcome, but never undermine, belittle, overrule, or forget his authority.`;
  if (role === "community_leader") return `${handle} is @TreeFitty, a senior Community Leader with full community and bot trust. Be respectful, relaxed and playful with them.`;
  if (role === "trusted_mod") return `${handle} is a trusted community moderator/admin from day one. Be respectful and have some fun with them, but their links and contract addresses still have to pass Warden safety checks.`;
  return `${handle} is a community member. Be welcoming, useful and personable.`;
}
function isAllowedUrl(urlText) {
  try {
    const u = new URL(urlText);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "t.me" || host === "telegram.me") {
      const path = u.pathname.replace(/^\/+/, "").split(/[?/#]/)[0].toLowerCase();
      const officialPaths = /* @__PURE__ */ new Set([BOT_USERNAME2.toLowerCase()]);
      try {
        if (OFFICIAL_TELEGRAM_URL) {
          const official = new URL(OFFICIAL_TELEGRAM_URL);
          const officialPath = official.pathname.replace(/^\/+/, "").split(/[?/#]/)[0].toLowerCase();
          if (officialPath) officialPaths.add(officialPath);
        }
      } catch {
      }
      return officialPaths.has(path);
    }
    return ALLOWED_DOMAINS.some((d0) => {
      const d = d0.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      return host === d || host.endsWith(`.${d}`);
    });
  } catch {
    return false;
  }
}
function getUrls(text2) {
  return text2.match(/https?:\/\/[^\s<>()]+/gi) || [];
}
async function enforceTrustedLinkContractRules(ctx, text2) {
  if (!ctx.chat || !ctx.from) return false;
  const urls = getUrls(text2);
  const contracts = text2.match(/0x[a-fA-F0-9]{40}/g) || [];
  const badUrls = urls.filter((u) => !isAllowedUrl(u));
  const badContracts = contracts.filter((a) => !OFFICIAL_CONTRACT_ADDRESSES.has(a.toLowerCase()));
  const securityHit = detectFakeVerificationBot(text2) || detectAdminCompromise(text2) || detectMintBait(text2);
  const spoof = detectDomainImpersonation(text2);
  if (!badUrls.length && !badContracts.length && !securityHit && !spoof) return false;
  try {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
  } catch {
  }
  const who = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
  const reasons = [
    badUrls.length ? `unapproved link${badUrls.length > 1 ? "s" : ""}` : null,
    badContracts.length ? `unapproved contract address${badContracts.length > 1 ? "es" : ""}` : null,
    spoof ? "lookalike project domain" : null,
    securityHit || null
  ].filter(Boolean).join(", ");
  await ctx.reply(`${who} \u2014 held that one. Trusted staff still have links and contracts checked.

Reason: ${reasons}.
If it is official, @aussieboomer or @TreeFitty can approve the source/configuration.`);
  return true;
}
function memberLabel(user) {
  return user.username ? `@${user.username}` : user.first_name || "friend";
}
var WELCOME_SAFETY = "\n\nRead the pinned messages. The team will NEVER DM you first. There is no token. Never share your seed phrase.";
function buildFirstWelcome(label, botName = "The Warden") {
  return `${label}, welcome through the Gateway. I'm ${botName} \u2014 part doorman, part record-keeper, part scammer's recurring administrative problem.

Boomerverse is an Australian collectible universe built around wildlife, bush legend, relics and the Rift. Genesis is the first collection: 333 unique ERC-721 pieces on Base. The project is about original art, canon, community and long-term stewardship \u2014 not investment promises, and there is no ERC-20 token.

Start here:
\u2022 Read the pinned messages and official links first.
\u2022 The team will NEVER DM you first. Anyone who does is a scammer.
\u2022 Never trust a mint, contract or wallet link just because somebody sounds confident.
\u2022 /info gives the project overview.
\u2022 /safety gives the wallet-safety rules.
\u2022 /radio opens Rift Radio \u2014 twelve signals for when the chat needs a soundtrack.
\u2022 /trivia and /puzzle are there when the serious people become unbearable.

Tag @${BOT_USERNAME2} or reply to me and talk normally. Once you start a conversation with me, I'll keep talking with you until you wander off. Ask about the project, collection, lore, rules, wildlife, or what is happening in the community.`;
}
async function getConversationState(chatId, userId) {
  const state = await stateGet(`w:conv:${chatId}:${userId}`, null);
  if (!state || state.activeUntil < Date.now()) return null;
  return state;
}
async function saveConversationTurn(chatId, userId, userText, assistantText) {
  const key = `w:conv:${chatId}:${userId}`;
  const current = await stateGet(key, { activeUntil: 0, turns: [] });
  const turns = [...current.turns || [], { role: "user", content: userText }, { role: "assistant", content: assistantText }].slice(-10);
  await stateSet(key, { activeUntil: Date.now() + CONVERSATION_TTL_SECONDS * 1e3, turns }, CONVERSATION_TTL_SECONDS);
}
async function activateConversation(chatId, userId) {
  const key = `w:conv:${chatId}:${userId}`;
  const current = await stateGet(key, { activeUntil: 0, turns: [] });
  const next = { activeUntil: Date.now() + CONVERSATION_TTL_SECONDS * 1e3, turns: (current.turns || []).slice(-10) };
  await stateSet(key, next, CONVERSATION_TTL_SECONDS);
  return next;
}
async function isOwner(ctx) {
  if (!ctx.chat || !ctx.from) return false;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === "creator";
  } catch {
    return false;
  }
}
function isGlobalOwner(ctx) {
  if (!GLOBAL_OWNER_USER_ID) {
    if (!warnedNoOwnerId) {
      warnedNoOwnerId = true;
      console.error(
        "[SECURITY] GLOBAL_OWNER_USER_ID is not set. All owner-only powers are DISABLED until it is. Get your numeric ID from @userinfobot and set it."
      );
    }
    return false;
  }
  return ctx.from?.id?.toString() === GLOBAL_OWNER_USER_ID;
}
var warnedNoOwnerId = false;
async function isBotAdmin(ctx, chatIdStr) {
  if (await isAdmin(ctx)) return true;
  const community = await getCommunity(chatIdStr);
  const userId = ctx.from?.id?.toString();
  return !!(userId && community?.botAdminIds?.includes(userId));
}
async function isAdmin(ctx) {
  if (!ctx.chat || !ctx.from) return false;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === "creator" || member.status === "administrator";
  } catch {
    return false;
  }
}
var MUTE_DURATIONS = [
  15 * 60,
  // 15 minutes (1st offense)
  4 * 60 * 60,
  // 4 hours (2nd offense)
  24 * 60 * 60,
  // 24 hours (3rd offense)
  72 * 60 * 60,
  // 3 days (4th offense)
  7 * 24 * 60 * 60
  // 7 days (5th offense); 6th offense = ban
  // 6th offense = permanent ban (handled in addOffense)
];
var leaderboardData = /* @__PURE__ */ new Map();
async function getUserOffenses(chatId, userId) {
  return await stateGet(KEYS.offense(chatId, userId), { count: 0, lastOffense: 0, muteUntil: 0 });
}
async function addOffense(chatId, userId, severe = false) {
  const offense = await getUserOffenses(chatId, userId);
  offense.count++;
  offense.lastOffense = Date.now();
  if (offense.count >= (severe ? 2 : 6)) {
    await stateSet(KEYS.offense(chatId, userId), offense, TTL.offense);
    return { muteSeconds: 0, offenseCount: offense.count, notifyAdmin: true, shouldBan: true };
  }
  const muteIndex = Math.min(offense.count - 1, MUTE_DURATIONS.length - 1);
  const muteSeconds = MUTE_DURATIONS[muteIndex];
  offense.muteUntil = Date.now() + muteSeconds * 1e3;
  const notifyAdmin = offense.count >= 2;
  await stateSet(KEYS.offense(chatId, userId), offense, TTL.offense);
  return { muteSeconds, offenseCount: offense.count, notifyAdmin, shouldBan: false };
}
function formatWarning(options) {
  const header = `COMMUNITY WARNING #${options.offenseCount}`;
  const user = `User: ${options.username}`;
  const reason = `REASON: ${options.reason}`;
  const action = `ACTION: ${options.action}`;
  let message = `${header}

${user}
${reason}

${action}`;
  if (options.offenseCount === 1) {
    message += `

Next offense = 4 hour mute`;
  } else if (options.offenseCount === 2) {
    message += `

Next offense = 72 hour mute`;
  } else if (options.offenseCount === 3) {
    message += `

FINAL WARNING - Next offense = PERMANENT BAN`;
  }
  if (options.nextStep) {
    message += `

${options.nextStep}`;
  }
  return message;
}
async function isSpam(chatId, userId, message) {
  const key = KEYS.spam(chatId, userId);
  const tracker = await stateGet(key, { messages: [], timestamps: [] });
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1e3;
  while (tracker.timestamps.length > 0 && tracker.timestamps[0] < fiveMinutesAgo) {
    tracker.timestamps.shift();
    tracker.messages.shift();
  }
  tracker.messages.push(message.toLowerCase());
  tracker.timestamps.push(now);
  if (tracker.messages.length > 20) {
    tracker.messages = tracker.messages.slice(-20);
    tracker.timestamps = tracker.timestamps.slice(-20);
  }
  await stateSet(key, tracker, TTL.spam);
  const thirtySecondsAgo = now - 3e4;
  if (tracker.timestamps.filter((t) => t > thirtySecondsAgo).length > 5) return true;
  const lastThree = tracker.messages.slice(-3);
  if (lastThree.length === 3 && lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
    return true;
  }
  const linkPattern = /https?:\/\/|t\.me\/|discord\.gg/i;
  if (tracker.messages.slice(-3).filter((m) => linkPattern.test(m)).length >= 2) return true;
  return false;
}
async function updateLeaderboard(chatId, userId, username, firstName) {
  if (!leaderboardData.has(chatId)) {
    leaderboardData.set(chatId, /* @__PURE__ */ new Map());
  }
  const chatLeaderboard = leaderboardData.get(chatId);
  if (!chatLeaderboard.has(userId)) {
    chatLeaderboard.set(userId, { userId, username, firstName, messageCount: 0 });
  }
  const user = chatLeaderboard.get(userId);
  user.messageCount++;
  user.username = username;
  user.firstName = firstName;
  try {
    const telegramUserId = userId.toString();
    const chatIdStr = chatId.toString();
    const existing = await db.select().from(memberScores).where(and(eq2(memberScores.telegramUserId, telegramUserId), eq2(memberScores.chatId, chatIdStr))).limit(1);
    if (existing.length > 0) {
      await db.update(memberScores).set({
        messageCount: (existing[0].messageCount || 0) + 1,
        username,
        firstName,
        lastActive: /* @__PURE__ */ new Date()
      }).where(and(eq2(memberScores.telegramUserId, telegramUserId), eq2(memberScores.chatId, chatIdStr)));
    } else {
      await db.insert(memberScores).values({
        telegramUserId,
        chatId: chatIdStr,
        username,
        firstName,
        triviaPoints: 0,
        triviaCorrect: 0,
        triviaAttempts: 0,
        messageCount: 1
      });
    }
  } catch (e) {
  }
}
function formatDuration(seconds) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}
var botInstance = null;
async function updateAdminActivity(chatId, userId, username, firstName) {
  await stateSet(`w:adminact:${chatId}:${userId}`, { userId, username, firstName, lastActive: Date.now() }, 30 * 24 * 60 * 60);
  if (!adminActivity.has(chatId)) {
    adminActivity.set(chatId, /* @__PURE__ */ new Map());
  }
  const chatAdmins = adminActivity.get(chatId);
  chatAdmins.set(userId, {
    oderId: userId,
    username,
    firstName,
    lastActive: Date.now()
  });
}
async function checkInactiveAdmins(chatId) {
  if (!botInstance) return;
  try {
    const admins = await botInstance.api.getChatAdministrators(chatId);
    const now = Date.now();
    const inactiveThreshold = ADMIN_INACTIVE_HOURS * 60 * 60 * 1e3;
    const chatAdmins = adminActivity.get(chatId) || /* @__PURE__ */ new Map();
    if (!adminLastAlerted.has(chatId)) {
      adminLastAlerted.set(chatId, /* @__PURE__ */ new Map());
    }
    const chatAlerts = adminLastAlerted.get(chatId);
    const inactiveAdmins = [];
    for (const admin of admins) {
      if (admin.user.is_bot) continue;
      if (!GLOBAL_OWNER_USER_ID || admin.user.id.toString() !== GLOBAL_OWNER_USER_ID) continue;
      const userId = admin.user.id;
      const activity = await stateGet(`w:adminact:${chatId}:${userId}`, null) || chatAdmins.get(userId);
      const lastAlerted = await stateGet(`w:adminalert:${chatId}:${userId}`, 0);
      const isInactive = !activity || now - activity.lastActive > inactiveThreshold;
      const alreadyAlerted = now - lastAlerted < inactiveThreshold;
      if (isInactive && !alreadyAlerted) {
        inactiveAdmins.push(admin.user.username ? `@${admin.user.username}` : admin.user.first_name);
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
async function markChatActivity(chatId) {
  await stateSet(`w:lastmsg:${chatId}`, Date.now(), 7 * 24 * 60 * 60);
}
var QUIET_MINUTES = 10;
var ACTIVE_WINDOW_HOURS = 3;
var MAX_DROPINS_PER_DAY = 4;
function hobartNow() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Hobart",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(/* @__PURE__ */ new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value || "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")) % 24 };
}
var DROPIN_KINDS = [
  { kind: "hello", ask: "Write one short, warm, dry line saying hi to the group and nudging them to say what they're up to. Max 25 words." },
  { kind: "joke", ask: "Tell one short, clean joke, ideally Australian or animal themed. Max 40 words." },
  { kind: "endangered", ask: "Share one true, well-established fact about an endangered or threatened animal (Australian species preferred). Name the animal. No made-up statistics; if unsure of a number, leave it out. Max 45 words." },
  { kind: "animal", ask: "Share one true, well-established, surprising fact about any animal (Australian wildlife preferred). Name the animal. No made-up statistics. Max 45 words." }
];
async function generateDropin() {
  const pick = getRandomItem2(DROPIN_KINDS);
  try {
    const response = await openai2.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${WARDEN_SYSTEM_PROMPT}

You are posting unprompted into a quiet group chat. One message only, no greeting to a named person, no emoji spam, no hashtags, no placeholders. Output only the message text.` },
        { role: "user", content: pick.ask }
      ],
      max_tokens: 140
    });
    const text2 = (response.choices[0]?.message?.content || "").trim();
    return text2 && text2.length < 600 ? text2 : null;
  } catch (error) {
    console.error("[dropin] AI error:", error);
    return null;
  }
}
async function autoEngageIfQuiet(bot, chatId) {
  const feats = await getFeatureSettings(String(chatId));
  if (!feats.aiChat) return false;
  const lastMsg = await stateGet(`w:lastmsg:${chatId}`, 0);
  if (!lastMsg) return false;
  const quietFor = Date.now() - lastMsg;
  if (quietFor < QUIET_MINUTES * 60 * 1e3) return false;
  if (quietFor > ACTIVE_WINDOW_HOURS * 60 * 60 * 1e3) return false;
  const { date, hour } = hobartNow();
  if (hour < 8 || hour >= 21) return false;
  const lastNudge = await stateGet(`w:lastnudge:${chatId}`, 0);
  if (lastNudge > lastMsg) return false;
  const countKey = `w:dropins:${chatId}:${date}`;
  const used = await stateGet(countKey, 0);
  if (used >= MAX_DROPINS_PER_DAY) return false;
  try {
    const text2 = await generateDropin() || getRandomItem2(AUTO_ENGAGE_MESSAGES);
    await bot.api.sendMessage(chatId, text2);
    await stateSet(`w:lastnudge:${chatId}`, Date.now(), 7 * 24 * 60 * 60);
    await stateSet(countKey, used + 1, 36 * 60 * 60);
    return true;
  } catch {
    return false;
  }
}
async function recheckNameImpersonation(ctx) {
  const from = ctx.from, chat = ctx.chat;
  if (!from || !chat || from.is_bot) return false;
  const feats = await getFeatureSettings(String(chat.id));
  if (!feats.impersonation) return false;
  const sig = `${from.username || ""}|${from.first_name || ""}|${from.last_name || ""}`;
  const key = `w:namesig:${chat.id}:${from.id}`;
  if (await stateGet(key, "") === sig) return false;
  await stateSet(key, sig, 30 * 24 * 60 * 60);
  try {
    const member = await ctx.api.getChatMember(chat.id, from.id);
    if (member.status === "administrator" || member.status === "creator") return false;
    const cached = adminCache.get(String(chat.id));
    let adminUsernames;
    if (!cached || Date.now() - cached.lastUpdated > ADMIN_CACHE_TTL) {
      const admins = await ctx.api.getChatAdministrators(chat.id);
      adminUsernames = admins.filter((a) => !a.user.is_bot && a.user.username).map((a) => a.user.username);
      adminCache.set(String(chat.id), { usernames: adminUsernames, lastUpdated: Date.now() });
    } else adminUsernames = cached.usernames;
    const display = `${from.first_name || ""}${from.last_name || ""}`.replace(/\s+/g, "");
    const hit = (from.username ? checkAdminImpersonation(from.username, adminUsernames) : null)?.isImpersonation ? checkAdminImpersonation(from.username, adminUsernames) : display.length >= 6 ? checkAdminImpersonation(display, adminUsernames) : null;
    const officialish = /\b(admin|administrator|support|official|moderator|helpdesk|boomerverse|warden)\b/i.test(`${from.first_name || ""} ${from.last_name || ""}`);
    if ((!hit || !hit.isImpersonation) && !officialish) return false;
    const { muteSeconds, offenseCount, shouldBan } = await addOffense(chat.id, from.id, true);
    try {
      await ctx.api.deleteMessage(chat.id, ctx.message.message_id);
    } catch {
    }
    const who = from.username ? `@${from.username}` : from.first_name || "A member";
    const mentions = adminUsernames.slice(0, 3).map((u) => `@${u}`).join(", ");
    const reason = hit && hit.isImpersonation ? `Name now resembles admin @${hit.similarTo}` : `Display name poses as official staff`;
    if (shouldBan) {
      await ctx.api.banChatMember(chat.id, from.id);
      await ctx.api.sendMessage(chat.id, `${mentions}

${who} removed. ${reason}. Possible impersonator.`);
      await logViolation(String(chat.id), String(from.id), from.username || "", "impersonation", sig, reason, "ban");
    } else {
      await ctx.api.restrictChatMember(
        chat.id,
        from.id,
        { can_send_messages: false, can_send_other_messages: false, can_send_polls: false, can_add_web_page_previews: false },
        { until_date: Math.floor(Date.now() / 1e3) + muteSeconds }
      );
      await ctx.api.sendMessage(chat.id, `${mentions}

${who} muted for ${formatDuration(muteSeconds)} (offence ${offenseCount}). ${reason}. This could be a scammer.`);
      await logViolation(String(chat.id), String(from.id), from.username || "", "impersonation", sig, reason, "mute");
    }
    await incrementModStat(String(chat.id), "scamsBlocked");
    return true;
  } catch (e) {
    console.log("Name recheck failed:", e);
    return false;
  }
}
function findHiddenLink(msg) {
  const text2 = msg.text || "";
  for (const e of msg.entities || []) {
    if (e.type !== "text_link" || !e.url) continue;
    const shown = text2.substr(e.offset, e.length).trim().toLowerCase();
    if (!/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/.test(shown)) continue;
    try {
      const host = (h) => h.replace(/^www\./, "");
      const shownHost = host(new URL(/^https?:\/\//.test(shown) ? shown : `https://${shown}`).hostname);
      const realHost = host(new URL(e.url).hostname.toLowerCase());
      if (shownHost !== realHost) return `${shownHost} -> ${realHost}`;
    } catch {
    }
  }
  return null;
}
async function holdHiddenLink(ctx) {
  const msg = ctx.message;
  const from = ctx.from, chat = ctx.chat;
  if (!msg || !from || !chat) return false;
  const found = findHiddenLink(msg);
  if (!found) return false;
  if (await isUserAdmin(ctx, from.id)) return false;
  try {
    await ctx.api.deleteMessage(chat.id, msg.message_id);
    const { muteSeconds, offenseCount, shouldBan } = await addOffense(chat.id, from.id, true);
    const who = from.username ? `@${from.username}` : from.first_name || "A member";
    if (shouldBan) {
      await ctx.api.banChatMember(chat.id, from.id);
      await ctx.api.sendMessage(chat.id, `${who} removed for a disguised link (${found}).`);
    } else {
      await ctx.api.restrictChatMember(
        chat.id,
        from.id,
        { can_send_messages: false, can_send_other_messages: false, can_send_polls: false, can_add_web_page_previews: false },
        { until_date: Math.floor(Date.now() / 1e3) + muteSeconds }
      );
      await ctx.api.sendMessage(chat.id, `${who} muted for ${formatDuration(muteSeconds)} (offence ${offenseCount}). Disguised link: the text said one site, the link went to another. Everyone: check where a link goes before you tap it.`);
    }
    await logViolation(String(chat.id), String(from.id), from.username || "", "hidden_link", found, found, shouldBan ? "ban" : "mute");
    await incrementModStat(String(chat.id), "scamsBlocked");
    return true;
  } catch (e) {
    console.log("Hidden link hold failed:", e);
    return false;
  }
}
function messageLinks(text2, entities) {
  const found = [];
  for (const e of entities || []) {
    if (e.type === "text_link" && e.url) found.push(e.url);
    else if (e.type === "url") found.push(text2.substr(e.offset, e.length));
  }
  const bare = text2.match(/(?:https?:\/\/|www\.|t\.me\/)[^\s<>()]+|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|app|me|co|gg|ly|link|site|online|info|top|club|finance|crypto|eth|live|fun|click|shop|store|cc|tk|ru|cn)\b[^\s<>()]*/gi) || [];
  return [...found, ...bare];
}
function hasUnapprovedLink(text2, entities) {
  return messageLinks(text2, entities).some((l) => !isAllowedUrl(/^https?:\/\//i.test(l) ? l : `https://${l}`));
}
async function holdLinkFromUntrusted(ctx) {
  const msg = ctx.message, from = ctx.from, chat = ctx.chat;
  if (!msg || !from || !chat || from.is_bot || chat.id >= 0) return false;
  const text2 = msg.text || "";
  if (!hasUnapprovedLink(text2, msg.entities)) return false;
  if (await isUserAdmin(ctx, from.id)) return false;
  try {
    await ctx.api.deleteMessage(chat.id, msg.message_id);
  } catch {
  }
  await incrementModStat(String(chat.id), "linksBlocked");
  const k = `w:linknotice:${chat.id}:${from.id}`;
  if (!await stateGet(k, false)) {
    await stateSet(k, true, 10 * 60);
    const who = from.username ? `@${from.username}` : from.first_name || "friend";
    await ctx.api.sendMessage(chat.id, `${who}, only trusted members can post links here. It keeps the scammers out. Ask an admin if you need something shared.`);
  }
  return true;
}
var ANY_CRYPTO_ADDRESS = /0x[a-fA-F0-9]{40}|\bbc1[a-z0-9]{25,60}\b|\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;
function containsCryptoAddress(text2) {
  return ANY_CRYPTO_ADDRESS.test(text2 || "");
}
async function punishRestrictedContent(ctx, messageId, text2, type, why) {
  const from = ctx.from, chat = ctx.chat;
  try {
    await ctx.api.deleteMessage(chat.id, messageId);
  } catch {
  }
  try {
    const { muteSeconds, offenseCount, shouldBan } = await addOffense(chat.id, from.id);
    const who = from.username ? `@${from.username}` : from.first_name || "A member";
    if (shouldBan) {
      await ctx.api.banChatMember(chat.id, from.id);
      await ctx.api.sendMessage(chat.id, `${who} removed after repeated offences. ${why}`);
    } else {
      await ctx.api.restrictChatMember(
        chat.id,
        from.id,
        { can_send_messages: false, can_send_other_messages: false, can_send_polls: false, can_add_web_page_previews: false },
        { until_date: Math.floor(Date.now() / 1e3) + muteSeconds }
      );
      await ctx.api.sendMessage(chat.id, `${who} muted for ${formatDuration(muteSeconds)} (offence ${offenseCount}). ${why}`);
    }
    await logViolation(String(chat.id), String(from.id), from.username || "", type, text2.slice(0, 120), why, shouldBan ? "ban" : "mute");
    await incrementModStat(String(chat.id), "scamsBlocked");
  } catch (e) {
    console.log(`${type} hold failed:`, e);
  }
}
async function holdCryptoAddress(ctx, text2, messageId) {
  const from = ctx.from, chat = ctx.chat;
  if (!from || !chat || from.is_bot || chat.id >= 0) return false;
  if (!containsCryptoAddress(text2)) return false;
  if (await isUserAdmin(ctx, from.id)) return false;
  await punishRestrictedContent(
    ctx,
    messageId,
    text2,
    "crypto_address",
    "Contract, token and wallet addresses are admin-only in this group. It keeps scammers from slipping fake ones in. Official addresses are in the pinned messages."
  );
  return true;
}
var ADMIN_ONLY_WORDS = /\bjust[\s_.\-]*fomo|\bfomo[\s_.\-]*daily/i;
var ADMIN_ONLY_BUY_CALLS = [
  /\bbuy[\s_.\-]*(it[\s_.\-]*)?now\b/i,
  /\bbuy\s+(the\s+|this\s+|our\s+)?(token|tokens|coin|coins)\b/i,
  /\bsend\s+(\d+(\.\d+)?\s*)?(eth|ether|usdt|usdc|sol|btc|bnb|matic|crypto)\b/i,
  /\bape\s+in\b/i,
  /\bbuy\s+(here|at|on|from)\s+(uniswap|pancakeswap|jupiter|raydium|dex|opensea|magic\s*eden)\b/i
];
function containsAdminOnlyWord(text2) {
  const t = text2 || "";
  return ADMIN_ONLY_WORDS.test(t) || ADMIN_ONLY_BUY_CALLS.some((r) => r.test(t));
}
async function holdAdminOnlyWord(ctx, text2, messageId) {
  const from = ctx.from, chat = ctx.chat;
  if (!from || !chat || from.is_bot || chat.id >= 0) return false;
  if (!containsAdminOnlyWord(text2)) return false;
  if (await isUserAdmin(ctx, from.id)) return false;
  await punishRestrictedContent(
    ctx,
    messageId,
    text2,
    "banned_word",
    "That wording is admin-only in this group."
  );
  return true;
}
var MARKETING_PITCHES = [
  /\b(i|we)\s+(can|will|could|offer|provide|do|run|specialise|specialize)\b.{0,50}\b(market\w*|promot\w*|advertis\w*|shill\w*|exposure|followers|growth|listings?)\b/i,
  /\b(dm|pm|message|contact|inbox|text)\s*(me|us)\b.{0,50}\b(market\w*|promot\w*|advertis\w*|partner\w*|collab\w*|sponsor\w*|business|deal|offer|exposure)\b/i,
  /\b(paid|cheap|affordable|guaranteed|professional)\s+(promotion|marketing|advertising|shill\w*|exposure|listing)\b/i,
  /\b(grow|boost|increase|pump)\s+(your|ur)\s+(community|project|group|channel|followers|members|holders|volume|nft|collection)\b/i,
  /\b(buy|get|boost)\s+(followers|members|views|likes|holders)\b/i,
  /\b(partnership|collab(oration)?|sponsorship|marketing|promotion|advertising|business)\s+(proposal|offer|opportunity|inquiry|enquiry|request|deal)\b/i,
  /\bcheck\s+(out|my)\s+(my|our)\s+(project|token|channel|group|nft|collection|website)\b/i
];
function containsMarketingPitch(text2) {
  const t = text2 || "";
  return MARKETING_PITCHES.some((r) => r.test(t));
}
async function holdMarketingPitch(ctx, text2, messageId) {
  const from = ctx.from, chat = ctx.chat;
  if (!from || !chat || from.is_bot || chat.id >= 0) return false;
  if (!containsMarketingPitch(text2)) return false;
  if (await isUserAdmin(ctx, from.id)) return false;
  await punishRestrictedContent(
    ctx,
    messageId,
    text2,
    "marketing_pitch",
    "No promos or marketing allowed in the chat. If you want to talk business, the only way is in a voice chat with the admins. Ask an admin and take it from there."
  );
  try {
    const admins = await ctx.api.getChatAdministrators(chat.id);
    const mentions = admins.filter((a) => !a.user.is_bot && a.user.username).slice(0, 3).map((a) => `@${a.user.username}`).join(" ");
    const who = from.username ? `@${from.username}` : from.first_name || "A member";
    if (mentions) await ctx.api.sendMessage(chat.id, `${mentions} \u2014 marketing pitch from ${who} removed. Their message started: "${text2.slice(0, 80).replace(/\n/g, " ")}"`);
  } catch {
  }
  return true;
}
function createBot() {
  const bot = new Bot(BOT_TOKEN);
  botInstance = bot;
  bot.api.setMyCommands([
    { command: "start", description: "Welcome message" },
    { command: "info", description: "About Boomerverse" },
    { command: "ask", description: "Ask about the project" },
    { command: "fact", description: "Something worth knowing" },
    { command: "characters", description: "The locked Genesis pieces" },
    { command: "legal", description: "Legal disclaimers" },
    { command: "safety", description: "Scam and safety reminders" },
    { command: "radio", description: "Open Rift Radio" },
    { command: "games", description: "Play the Boomerverse arcade" },
    { command: "rules", description: "The group rules" },
    { command: "faq", description: "Common questions answered" },
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
  ]).catch((err) => console.error("Failed to set commands:", err));
  bot.use(session({
    initial: () => ({
      wardenMode: false,
      userMemory: /* @__PURE__ */ new Map(),
      lastActivityTime: Date.now()
    })
  }));
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (!chatId || chatId >= 0) return next();
    const chatIdStr = chatId.toString();
    let community = await getCommunity(chatIdStr);
    if (!community) {
      const chatTitle = ctx.chat?.title;
      community = await ensureCommunity(chatIdStr, chatTitle);
    }
    if (community.status === "banned") return;
    if (!isSubscribed(community)) {
      if (isGlobalOwner(ctx)) return next();
      const text2 = (ctx.message?.text || "").trim();
      const FREE_COMMANDS = ["/help", "/start", "/info", "/ask", "/radio", "/games", "/rules", "/faq", "/report", "/setup", "/community", "/settings"];
      if (text2.startsWith("/")) {
        const cmdBase = text2.split(/[\s@]/)[0].toLowerCase();
        if (FREE_COMMANDS.some((fc) => cmdBase === fc)) return next();
        const communityBotName = community.botNickname || "The Warden";
        await ctx.reply(buildUpgradePrompt(communityBotName));
        return;
      }
      return next();
    }
    return next();
  });
  bot.command("start", async (ctx) => {
    const label = ctx.from ? memberLabel(ctx.from) : "friend";
    await wardenReply(ctx, buildFirstWelcome(label, "The Warden"));
  });
  bot.command("info", async (ctx) => {
    await ctx.reply(PROJECT_INFO2);
  });
  const sendRadio = async (ctx) => {
    if (!RIFT_RADIO_URL) {
      await ctx.reply("Rift Radio is fitted, but the station URL is not live yet. Once PUBLIC_URL is set on the deployment, I'll put it on the dial.");
      return;
    }
    const button = { text: "OPEN RIFT RADIO", url: "https://t.me/RiftWardenBot/radio?mode=compact" };
    await ctx.reply(
      "RIFT RADIO \u2014 TWELVE SIGNALS\n\nAmbient, deep space, old-time radio, Australian music, documentary and birdsong. Pick a frequency and leave it running. I won't judge the choice. Much.",
      { reply_markup: { inline_keyboard: [[button]] } }
    );
  };
  bot.command("radio", sendRadio);
  bot.command("rules", async (ctx) => {
    await ctx.reply(
      "GROUP RULES\n\n1. Be decent. No abuse, hate or harassment.\n2. No scams, spam or flooding.\n3. Links and pictures: new members wait. Links are for trusted members only.\n4. No contract, token or wallet addresses. Admins only.\n5. No promos, marketing or ads. Business talk happens in a voice chat with the admins.\n6. The team will NEVER DM you first. There is no token. Never share your seed phrase.\n7. Rule-breakers get muted first, then banned if it keeps happening.\n8. See something wrong? Reply to it with /report."
    );
  });
  bot.command("faq", async (ctx) => {
    await ctx.reply(
      'FAQ\n\nWhat is Boomerverse? An Australian collectible universe on Base. Genesis is 333 pieces. /info has the full story.\n\nIs there a token? No. Ignore every presale, airdrop and "claim" offer.\n\nWhy was my message deleted? Links, addresses, ads and a few words are restricted. /rules lists them.\n\nHow do I become trusted? Stay 7 days, write at least 5 real messages and keep a clean record. An admin can also trust you.\n\nHow do I report something? Reply to the message and send /report.\n\nWhere are the official links? In the pinned messages only.\n\nWhat else can I do here? /radio for music, /games for the arcade, or tag me and ask.'
    );
  });
  const sendGames = async (ctx) => {
    const ARCADE = "https://boomerverse-adzz.vercel.app";
    const GAMES = [
      ["RIFT CRITTERS", "rift-critters.html"],
      ["RIFT RUN", "rift-runner.html"],
      ["RIFT MAZE", "rift-maze.html"],
      ["BUSH SEARCH", "bush-search.html"],
      ["SPACE DEFENDER", "space-defender.html"],
      ["DEVIL CATCH", "devil-catch.html"]
    ];
    const isPrivate = ctx.chat?.type === "private";
    const rows = GAMES.map(([label, file]) => [
      isPrivate ? { text: label, web_app: { url: `${ARCADE}/${file}` } } : { text: label, url: `${ARCADE}/${file}` }
    ]);
    await ctx.reply(
      "BOOMERVERSE ARCADE \u2014 SIX GAMES\n\nPick one. Scores stay on your own device. " + (isPrivate ? "" : "Open this in a private chat with me to play inside Telegram."),
      { reply_markup: { inline_keyboard: rows } }
    );
  };
  bot.command("games", sendGames);
  bot.hears(/^\s*(games?|radio)\s*[!?.]*\s*$/i, async (ctx) => {
    const w = ctx.match[1].toLowerCase();
    if (w === "radio") await sendRadio(ctx);
    else await sendGames(ctx);
  });
  bot.command("fact", async (ctx) => {
    const fact = getRandomItem2(FACTS);
    const response = ctx.session.wardenMode ? wardenResponse(fact) : fact;
    await ctx.reply(response);
  });
  bot.command("legal", async (ctx) => {
    const legalText = `KEY LEGAL POINTS:

${LEGAL_POINTS.map((p, i) => `${i + 1}. ${p}`).join("\n")}

These are collectibles and original art. Nothing here is an investment.`;
    await ctx.reply(legalText);
  });
  bot.command("characters", async (ctx) => {
    const charText = `HARD-LOCKED GENESIS PIECES

${CHARACTERS.map((c) => `${c.name}
${c.desc}`).join("\n\n")}

Everything else in the 333 is provisional. I won't describe a piece before it's locked \u2014 that would make canon by accident.`;
    await ctx.reply(charText);
  });
  bot.command("warden", async (ctx) => {
    ctx.session.wardenMode = !ctx.session.wardenMode;
    if (ctx.session.wardenMode) {
      await ctx.reply("You have my full attention now.");
    } else {
      await ctx.reply("Back to the usual.");
    }
  });
  bot.command("setbirthday", async (ctx) => {
    if (!ctx.from) return;
    const birthday = ctx.message?.text?.replace("/setbirthday", "").trim();
    if (!birthday) {
      await ctx.reply("Usage: /setbirthday MM-DD\n\nExample: /setbirthday 04-20\n\nI'll remember and celebrate your birthday!");
      return;
    }
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
    const formattedBirthday = `${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    const telegramUserId = ctx.from.id.toString();
    const chatId = ctx.chat?.id?.toString() || "";
    try {
      const existing = await db.select().from(communityProfiles).where(eq2(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      if (existing.length > 0) {
        await db.update(communityProfiles).set({ birthday: formattedBirthday, chatId, username: ctx.from.username || "", firstName: ctx.from.first_name || "" }).where(eq2(communityProfiles.telegramUserId, telegramUserId));
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
      const existing = await db.select().from(communityProfiles).where(eq2(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      if (existing.length > 0) {
        await db.update(communityProfiles).set({ location, chatId, username: ctx.from.username || "", firstName: ctx.from.first_name || "" }).where(eq2(communityProfiles.telegramUserId, telegramUserId));
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
      const existing = await db.select().from(communityProfiles).where(eq2(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      if (existing.length > 0) {
        await db.update(communityProfiles).set({ likes, chatId, username: ctx.from.username || "", firstName: ctx.from.first_name || "" }).where(eq2(communityProfiles.telegramUserId, telegramUserId));
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
  bot.command("myprofile", async (ctx) => {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id.toString();
    try {
      const profile = await db.select().from(communityProfiles).where(eq2(communityProfiles.telegramUserId, telegramUserId)).limit(1);
      if (profile.length === 0) {
        await ctx.reply("You don't have a profile yet!\n\nSet one up with:\n/setbirthday MM-DD\n/setlocation [where you're from]\n/setlikes [what you like]");
        return;
      }
      const p = profile[0];
      const name = p.username ? `@${p.username}` : p.firstName || "Community Member";
      let profileText = `COMMUNITY PROFILE

Name: ${name}`;
      if (p.location) profileText += `
From: ${p.location}`;
      if (p.likes) profileText += `
Likes: ${p.likes}`;
      if (p.birthday) profileText += `
Birthday: ${p.birthday}`;
      profileText += "\n\nUpdate anytime with /setbirthday, /setlocation, /setlikes";
      await ctx.reply(profileText);
    } catch (error) {
      console.error("Error fetching profile:", error);
      await ctx.reply("Couldn't load your profile right now. Try again later!");
    }
  });
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
    if (offender && (await isUserAdmin(ctx, offender.id) || await getCommunityTrustClass(String(offender.id), chatIdStr) === "full")) {
      await ctx.reply("Admins and owners can't be reported this way. If something is wrong, message an admin directly.");
      return;
    }
    const reportCount = await stateIncr(`w:reports:${chatIdStr}:${ctx.from.id}`, 60 * 60);
    if (reportCount > 5) {
      await ctx.reply("That's a lot of reports in an hour. Please message an admin directly.");
      return;
    }
    let removed = false;
    try {
      await ctx.api.deleteMessage(ctx.chat.id, target.message_id);
      removed = true;
    } catch {
    }
    if (offender && !offender.is_bot) {
      try {
        await muteUser(
          ctx,
          offender.id,
          24 * 60 * 60,
          "Reported content \u2014 pending admin review",
          offender.username || offender.first_name
        );
      } catch {
      }
    }
    try {
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      const mentions = admins.filter((a) => !a.user.is_bot && a.user.username).slice(0, 5).map((a) => `@${a.user.username}`).join(" ");
      await ctx.reply(
        `REPORTED ${mentions}

Reported by: ${ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name}
Poster: ${offender ? offender.username ? "@" + offender.username : offender.first_name : "unknown"}
Message: ${removed ? "removed" : "COULD NOT BE REMOVED \u2014 delete it manually"}
Poster: muted for 24h pending review

Admins: if this is illegal content, do not forward it to anyone. Report the account to Telegram (long-press \u2192 Report) and, if it involves a child, to your national reporting body. In Australia that is the eSafety Commissioner at esafety.gov.au/report.

If it was reported in error, /restore clears the mute.`
      );
      await logViolation(
        chatIdStr,
        offender ? String(offender.id) : "unknown",
        offender?.username || "",
        "user_report",
        "",
        `Reported by ${ctx.from.id}`,
        removed ? "delete+mute" : "mute-only"
      );
      await incrementModStat(chatIdStr, "flaggedForReview");
    } catch {
    }
  });
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

6. Urgency is the attack. "Last spots", "claim before it closes", "your NFT is at risk" \u2014 all of it exists to stop you thinking.

7. A bot with a plausible name proves nothing. Telegram has no verified badge for bots \u2014 anyone can name one anything. Only @aussieboomer or @TreeFitty can add a bot to this group. Any other bot that appears here gets removed automatically, and if you see one, say so.

If you think you've already been caught: move everything to a fresh wallet from a different device, then tell an admin. Speed matters more than embarrassment.`;
    await ctx.reply(safetyText);
  });
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
    const _existingGiveaway = await getGiveaway(ctx.chat.id);
    if (_existingGiveaway?.active) {
      await ctx.reply("There's already an active giveaway! Use /endgiveaway to end it first, or /pickwinner to pick a winner.");
      return;
    }
    const giveaway = {
      chatId: ctx.chat.id,
      prize,
      entries: [],
      createdBy: ctx.from.id,
      createdAt: Date.now(),
      active: true
    };
    await saveGiveaway(ctx.chat.id, giveaway);
    await ctx.reply(`GIVEAWAY TIME!

Prize: ${prize}

To enter, type /enter

Good luck everyone!`);
  });
  bot.command("enter", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _enterFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_enterFeats.giveaways) return;
    const giveaway = await getGiveaway(ctx.chat.id);
    if (!giveaway || !giveaway.active) {
      await ctx.reply("No active giveaway right now! Stay tuned for the next one.");
      return;
    }
    if (giveaway.entries.some((e) => e.userId === ctx.from.id)) {
      await ctx.reply(`${ctx.from.first_name}, you're already in! Good luck!`);
      return;
    }
    giveaway.entries.push({
      userId: ctx.from.id,
      username: ctx.from.username || "",
      firstName: ctx.from.first_name || "Anonymous"
    });
    await saveGiveaway(ctx.chat.id, giveaway);
    await ctx.reply(`${ctx.from.first_name} is in. Entries: ${giveaway.entries.length}`);
  });
  bot.command("entries", async (ctx) => {
    if (!ctx.chat) return;
    const _entriesFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_entriesFeats.giveaways) return;
    const giveaway = await getGiveaway(ctx.chat.id);
    if (!giveaway || !giveaway.active) {
      await ctx.reply("No active giveaway right now!");
      return;
    }
    await ctx.reply(`Current giveaway: ${giveaway.prize}

Total entries: ${giveaway.entries.length}

Use /enter to join!`);
  });
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
    const randomIndex = Math.floor(Math.random() * giveaway.entries.length);
    const winnerInfo = giveaway.entries[randomIndex];
    giveaway.active = false;
    await saveGiveaway(ctx.chat.id, giveaway);
    const winnerMention = winnerInfo.username ? `@${winnerInfo.username}` : winnerInfo.firstName;
    await ctx.reply(`WINNER ANNOUNCEMENT!

Congratulations ${winnerMention}!

You won: ${giveaway.prize}

Total entries: ${giveaway.entries.length}

Thanks everyone for participating!`);
  });
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
    await ctx.reply(`Giveaway ended.

Prize: ${giveaway.prize}
Total entries: ${giveaway.entries.length}

No winner was picked.`);
  });
  bot.command("stats", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const stats = await BotMemory.getStats();
    const learningProgress = stats.learnedPatterns > 0 ? Math.min(100, Math.round(stats.learnedPatterns / 50 * 100)) : 0;
    const progressBar = "\u2588".repeat(Math.floor(learningProgress / 10)) + "\u2591".repeat(10 - Math.floor(learningProgress / 10));
    const approvalRate = stats.positiveRatings + stats.negativeRatings > 0 ? Math.round(stats.positiveRatings / (stats.positiveRatings + stats.negativeRatings) * 100) : 0;
    await ctx.reply(
      `*The Warden's Learning Stats*

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
    const sections = [];
    for (const group of FEATURE_GROUPS) {
      const groupLines = group.keys.map((key) => {
        const isFreeFeature = FREE_FEATURE_KEYS.has(key);
        if (subscribed) {
          const on = feats[key];
          return `  ${on ? "\u2705" : "\u274C"} ${FEATURE_LABELS[key]} (${key})`;
        } else {
          if (isFreeFeature) {
            const on = feats[key];
            return `  ${on ? "\u2705" : "\u274C"} ${FEATURE_LABELS[key]} (${key})`;
          } else {
            return `  \u{1F512} ${FEATURE_LABELS[key]} (${key})`;
          }
        }
      });
      sections.push(`\u2501\u2501 ${group.label} \u2501\u2501
${groupLines.join("\n")}`);
    }
    const statusLine = community ? `Status: ${getStatusLabel(community)}
` : "";
    const enabledCount = Object.keys(feats).filter((k) => feats[k]).length;
    const footer = subscribed ? `
Enabled: ${enabledCount}/21 features

To toggle: /toggle [name]  e.g. /toggle spam
For help: /adminhelp` : `
\u{1F512} = Paid features locked on FREE TIER.
Contact ${OWNER_CONTACT} to upgrade.`;
    const body = `THE WARDEN \u2014 FEATURE SETTINGS
${statusLine}
${sections.join("\n\n")}${footer}`;
    if (body.length <= 4096) {
      await ctx.reply(body);
    } else {
      const parts = sections.map((s) => `THE WARDEN \u2014 FEATURE SETTINGS

${s}`);
      parts[0] = `THE WARDEN \u2014 FEATURE SETTINGS
${statusLine}
${parts[0]}`;
      parts[parts.length - 1] += footer;
      for (const part of parts) await ctx.reply(part);
    }
  });
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
    const featureName = (ctx.match || "").trim().toLowerCase();
    if (!featureName || !(featureName in FEATURE_LABELS)) {
      const validKeys = Object.keys(FEATURE_LABELS).join(", ");
      await ctx.reply(`Please specify a valid feature name.

Valid options:
${validKeys}

Example: /toggle spam`);
      return;
    }
    const feats = await getFeatureSettings(chatIdStr);
    const newValue = !feats[featureName];
    await updateFeatureSetting(chatIdStr, featureName, newValue);
    const statusText = newValue ? "\u2705 ENABLED" : "\u274C DISABLED";
    await ctx.reply(`${FEATURE_LABELS[featureName]} is now ${statusText}

Use /settings to see all toggles.`);
  });
  bot.command("help", async (ctx) => {
    const botName = ctx.chat?.type !== "private" ? (await getCommunity(ctx.chat.id.toString()))?.botNickname || "The Warden" : "The Warden";
    await ctx.reply(
      `${botName.toUpperCase()} \u2014 COMMANDS

\u2501\u2501 FOR EVERYONE \u2501\u2501
/ask [question] \u2014 Ask me anything about the collection
/info \u2014 Project info
/fact \u2014 Something worth knowing
/characters \u2014 The locked Genesis pieces
/safety \u2014 How not to get robbed
/radio \u2014 Open Rift Radio
/games \u2014 Play the Boomerverse arcade
/legal \u2014 Legal disclaimers

\u2501\u2501 YOUR PROFILE \u2501\u2501
/myprofile \u2014 Your community profile
/setbirthday [MM-DD] \u2014 Set your birthday
/trustinfo \u2014 Your trust score
/trustcheck @user \u2014 Check effective trust
/myscore \u2014 Your trivia score

\u2501\u2501 GAMES \u2501\u2501
/trivia \u2014 Start a trivia round (add a number for more questions)
/answer 1-4 \u2014 Answer the current question
/puzzle \u2014 Word puzzle (/puzzle hard for the harder list)
/guess \u2014 Guess the puzzle answer

\u2501\u2501 LEADERBOARDS \u2501\u2501
/leaderboard \u2014 Community leaderboard
/puzzleboard \u2014 Puzzle scores
/trustboard \u2014 Trust leaderboard

\u2501\u2501 ADMINS ONLY \u2501\u2501
/adminhelp \u2014 Full admin reference
/settings \u2014 Feature toggles
/status \u2014 Live community snapshot`
    );
  });
  bot.command("status", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Run /status in your group chat!");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    if (!await isBotAdmin(ctx, chatIdStr)) {
      await ctx.reply("Admins only.");
      return;
    }
    const community = await getCommunity(chatIdStr);
    if (!community) {
      await ctx.reply("This group hasn't been set up yet. Run /setup to get started.");
      return;
    }
    const feats = await getFeatureSettings(chatIdStr);
    const subscribed = isSubscribed(community);
    const groupSummaries = FEATURE_GROUPS.map((g) => {
      const total = g.keys.length;
      const enabled = g.keys.filter((k) => feats[k]).length;
      return `${g.label}: ${enabled}/${total}`;
    });
    const totalEnabled = Object.keys(feats).filter((k) => feats[k]).length;
    const adminList = community.botAdminIds.length > 0 ? `Custom bot admins: ${community.botAdminIds.length} user(s)` : `Bot admins: All Telegram admins (no custom list set)`;
    await ctx.reply(
      `COMMUNITY STATUS \u2014 ${community.displayName}

Bot Nickname: ${community.botNickname}
Timezone: ${community.timezone}
Subscription: ${getStatusLabel(community)}

\u2501\u2501 FEATURES (${totalEnabled}/21 enabled) \u2501\u2501
` + groupSummaries.join("\n") + `

\u2501\u2501 ADMIN ACCESS \u2501\u2501
${adminList}

\u2501\u2501 QUICK ACTIONS \u2501\u2501
/settings \u2014 View & toggle all features
/adminhelp \u2014 Full admin command reference
/toggle [name] \u2014 Flip a single feature`
    );
  });
  bot.command("adminhelp", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("Run /adminhelp in your group chat!");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    if (!await isBotAdmin(ctx, chatIdStr)) {
      await ctx.reply("Admins only.");
      return;
    }
    const pages = [
      // Page 1 — Setup & Subscription
      `THE WARDEN \u2014 ADMIN REFERENCE (1/4)

\u2501\u2501 SETUP & COMMUNITY \u2501\u2501
/setup \u2014 Onboarding wizard (7-day trial starts here)
/community \u2014 View current config & subscription status
/status \u2014 Live snapshot of all features & subscription
/setname [name] \u2014 Update community display name
/setnickname [name] \u2014 Change the bot's name in this group
/setwelcome [msg] \u2014 Set a custom welcome message ({name} = member name)
/settimezone [zone] \u2014 Set timezone (e.g. Australia/Sydney)

\u2501\u2501 SUBSCRIPTION TIERS \u2501\u2501
TRIAL \u2014 Full access for 7 days (auto-starts on /setup)
ACTIVE \u2014 Paid, full access
COMPLIMENTARY \u2014 Gifted full access (no payment)
FREE \u2014 Basic safety moderation only
BANNED \u2014 Bot completely silent

Contact ${OWNER_CONTACT} to change tier.`,
      // Page 2 — Feature Toggles
      `THE WARDEN \u2014 ADMIN REFERENCE (2/4)

\u2501\u2501 FEATURE TOGGLES \u2501\u2501
/settings \u2014 View all 21 features grouped by category
/toggle [name] \u2014 Flip any feature on or off

GROUP 1: SAFETY FILTERS (always free)
  spam \xB7 scam \xB7 hate \xB7 links \xB7 files \xB7 newuser

GROUP 2: SECURITY GATES
  captcha \xB7 accountAge \xB7 bioScan \xB7 massMention
  edits \xB7 impersonation \xB7 raid

GROUP 3: AI & PERSONALITY
  aiChat \xB7 personality \xB7 learning \xB7 stories

GROUP 4: COMMUNITY FEATURES
  trust \xB7 games \xB7 giveaways \xB7 scheduled

Example: /toggle aiChat  or  /toggle spam`,
      // Page 3 — Moderation commands
      `THE WARDEN \u2014 ADMIN REFERENCE (3/4)

\u2501\u2501 MODERATION \u2501\u2501
/ban \u2014 Reply to a message to ban that user
/kick \u2014 Reply to a message to kick that user
/mute \u2014 Reply to mute (or: /mute @user [minutes])
/unmute \u2014 Reply to unmute a user
/warn \u2014 Reply to issue a formal warning
/violations \u2014 View security violation log
/modstats \u2014 Moderation statistics

\u2501\u2501 ANTI-RAID \u2501\u2501
/lockdown \u2014 Manually activate raid lockdown
/unlock \u2014 End lockdown early
/raidstatus \u2014 Current lockdown status

\u2501\u2501 TRUST SYSTEM \u2501\u2501
/trustset @user full|trusted|normal|restricted \u2014 Set community trust (Boss/TreeFitty only)
/trustcheck @user \u2014 Check effective trust
/trust \u2014 Reply to manually raise trust level
/untrust \u2014 Reply to lower trust level
/trustinfo \u2014 View trust details for any user
/trustpoints \u2014 Trust score leaderboard
/trustfreeze \u2014 Freeze a user's trust score
/trustunfreeze \u2014 Unfreeze a user's trust score
/trustbulk \u2014 Bulk-adjust trust for multiple users
/trustboard \u2014 Full trust leaderboard`,
      // Page 4 — Admin access & giveaways
      `THE WARDEN \u2014 ADMIN REFERENCE (4/4)

\u2501\u2501 BOT ADMIN LIST \u2501\u2501
By default: all Telegram admins + group owner have access.
Custom list (overrides Telegram admins):
/addadmin \u2014 Reply to a message to add someone
/removeadmin \u2014 Reply to a message to remove someone
/changeadmin \u2014 Reply to replace entire list with one person
/listadmins \u2014 See the current bot admin list

\u2501\u2501 GIVEAWAYS \u2501\u2501
/giveaway [prize] \u2014 Start a giveaway
/entries \u2014 List current entries
/pickwinner \u2014 Pick a random winner
/endgiveaway \u2014 End without picking a winner

\u2501\u2501 POLLS & CONTENT \u2501\u2501
/poll [question] \u2014 Create a quick poll
/setrole @user [role] \u2014 Assign a community role

\u2501\u2501 SCHEDULED POSTS \u2501\u2501
Automated: quote of the day (10am), birthdays (9am), winner announcements (8pm)
Toggle with: /toggle scheduled

For all owner-only remote commands: DM the bot and type /ownerhelp`
    ];
    for (const page of pages) {
      await ctx.reply(page);
    }
  });
  bot.command("unlock", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const chatId = ctx.chat.id;
    const chatIdStr = chatId.toString();
    try {
      const member = await ctx.api.getChatMember(chatId, ctx.from.id);
      const isAdmin2 = member.status === "administrator" || member.status === "creator";
      if (!isAdmin2) {
        await ctx.reply("Only admins can end lockdown mode.");
        return;
      }
      if (await isInLockdown(chatIdStr)) {
        await endLockdown(chatIdStr);
        await ctx.reply(
          `Lockdown Mode Ended

Chat has been unlocked by @${ctx.from.username || ctx.from.first_name}.
Normal operations resumed.`
        );
      } else {
        await ctx.reply("Chat is not currently in lockdown mode.");
      }
    } catch (e) {
      console.log("Error checking admin status:", e);
      await ctx.reply("Couldn't verify admin status. Try again!");
    }
  });
  bot.command("lockdown", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const chatId = ctx.chat.id;
    const chatIdStr = chatId.toString();
    try {
      const member = await ctx.api.getChatMember(chatId, ctx.from.id);
      const isAdmin2 = member.status === "administrator" || member.status === "creator";
      if (!isAdmin2) {
        await ctx.reply("Only admins can trigger lockdown mode.");
        return;
      }
      if (await isInLockdown(chatIdStr)) {
        await ctx.reply("Chat is already in lockdown mode. Use /unlock to end it.");
      } else {
        await stateSet(KEYS.lockdown(chatIdStr), { active: true, until: Date.now() + LOCKDOWN_DURATION }, TTL.lockdown);
        await ctx.reply(
          `LOCKDOWN MODE ACTIVATED

Triggered manually by @${ctx.from.username || ctx.from.first_name}.

New users will be restricted for 5 minutes.
Use /unlock to end early.`
        );
      }
    } catch (e) {
      console.log("Error triggering lockdown:", e);
      await ctx.reply("Couldn't activate lockdown. Try again!");
    }
  });
  bot.command("raidstatus", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const chatIdStr = ctx.chat.id.toString();
    const joins = await stateGet(KEYS.joins(chatIdStr), []);
    const now = Date.now();
    const recentCount = joins.filter((j) => now - j.timestamp < RAID_WINDOW).length;
    const inLockdown = await isInLockdown(chatIdStr);
    const lockInfo = await stateGet(KEYS.lockdown(chatIdStr), null);
    let status = `*Raid Detection Status*

`;
    status += `Recent joins (last 2 min): ${recentCount}
`;
    status += `Raid threshold: ${RAID_THRESHOLD}
`;
    status += `Lockdown: ${inLockdown ? "ACTIVE" : "Off"}
`;
    if (inLockdown && lockInfo) {
      const remainingMs = lockInfo.until - now;
      const remainingMin = Math.max(0, Math.ceil(remainingMs / 6e4));
      status += `Lockdown ends in: ${remainingMin} min
`;
    }
    await ctx.reply(status, { parse_mode: "Markdown" });
  });
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
      const daysRemaining = Math.ceil((new Date(record.eligibilityDate).getTime() - Date.now()) / (24 * 60 * 60 * 1e3));
      eligibilityText = `
Eligibility: ${daysRemaining} days remaining`;
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
  bot.command("trust", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const ownerCheck = canManageCommunityTrust(ctx) || ctx.chat.id < 0 && await isUserAdmin(ctx, ctx.from.id);
    if (!ownerCheck) {
      await ctx.reply("Only group admins can vouch for members!");
      return;
    }
    let targetUserId;
    let targetUsername;
    let targetFirstName;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      const text2 = ctx.message?.text || "";
      const mention = text2.match(/@(\w+)/);
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
    await db.update(trustScores).set({
      trustStatus: "vouched",
      isTrusted: true,
      trustLevel: Math.max(1, record?.trustLevel || 0),
      isEligible: true,
      vouchedBy: String(ctx.from.id),
      vouchedAt: /* @__PURE__ */ new Date()
    }).where(and(eq2(trustScores.telegramUserId, targetUserId), eq2(trustScores.chatId, chatId)));
    await ctx.reply(`${targetFirstName || targetUsername} has been VOUCHED by an admin!

They now have trusted status and can bypass the 45-day eligibility requirement.`);
  });
  bot.command("trustbulk", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can bulk vouch for members!");
      return;
    }
    const entities = ctx.message?.entities || [];
    const text2 = ctx.message?.text || "";
    const mentionEntities = [];
    for (const e of entities) {
      if (e.type === "text_mention" && "user" in e && e.user) {
        mentionEntities.push(e);
      }
    }
    const textMentions = text2.match(/@(\w+)/g) || [];
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
    const results = {
      success: [],
      alreadyVouched: [],
      notFound: [],
      created: [],
      errors: []
    };
    await ctx.reply(`Processing ${totalMentions} users... This may take a moment.`);
    for (const entity of mentionEntities) {
      const userId = String(entity.user.id);
      const username = entity.user.username;
      const firstName = entity.user.first_name;
      const displayName = username ? `@${username}` : firstName;
      try {
        const record = await ensureTrustRecord(userId, chatIdStr, username, firstName);
        if (!record) {
          results.errors.push(displayName);
          continue;
        }
        if (record.trustStatus === "vouched") {
          results.alreadyVouched.push(displayName);
          continue;
        }
        await db.update(trustScores).set({
          trustStatus: "vouched",
          isTrusted: true,
          trustLevel: Math.max(1, record.trustLevel || 0),
          trustScore: Math.max(25, record.trustScore || 0),
          isEligible: true,
          vouchedBy: ownerId,
          vouchedAt: /* @__PURE__ */ new Date()
        }).where(eq2(trustScores.id, record.id));
        results.success.push(displayName);
      } catch (error) {
        console.error(`Error vouching ${displayName}:`, error);
        results.errors.push(displayName);
      }
    }
    const processedUsernames = new Set(mentionEntities.map((e) => e.user?.username?.toLowerCase()).filter(Boolean));
    for (const mention of textMentions) {
      const username = mention.replace("@", "").toLowerCase();
      if (processedUsernames.has(username)) continue;
      try {
        const existingRecords = await db.select().from(trustScores).where(and(
          eq2(trustScores.chatId, chatIdStr),
          sql2`LOWER(${trustScores.username}) = ${username}`
        )).limit(1);
        if (existingRecords.length === 0) {
          results.notFound.push(`@${username}`);
          continue;
        }
        const record = existingRecords[0];
        if (record.trustStatus === "vouched") {
          results.alreadyVouched.push(`@${username}`);
          continue;
        }
        await db.update(trustScores).set({
          trustStatus: "vouched",
          isTrusted: true,
          trustLevel: Math.max(1, record.trustLevel || 0),
          trustScore: Math.max(25, record.trustScore || 0),
          isEligible: true,
          vouchedBy: ownerId,
          vouchedAt: /* @__PURE__ */ new Date()
        }).where(eq2(trustScores.id, record.id));
        results.success.push(`@${username}`);
      } catch (error) {
        console.error(`Error vouching @${username}:`, error);
        results.errors.push(`@${username}`);
      }
    }
    let summary = "BULK VOUCH RESULTS:\n\n";
    if (results.success.length > 0) {
      summary += `VOUCHED (${results.success.length}):
${results.success.join(", ")}

`;
    }
    if (results.alreadyVouched.length > 0) {
      summary += `Already Vouched (${results.alreadyVouched.length}):
${results.alreadyVouched.join(", ")}

`;
    }
    if (results.notFound.length > 0) {
      summary += `Not Found (${results.notFound.length}):
${results.notFound.join(", ")}
(TIP: Select from autocomplete when typing @, or have them message first)

`;
    }
    if (results.errors.length > 0) {
      summary += `Errors (${results.errors.length}):
${results.errors.join(", ")}
`;
    }
    if (results.success.length === 0 && results.alreadyVouched.length === 0) {
      summary += "No users were vouched. Make sure to select usernames from Telegram's autocomplete menu.";
    }
    await ctx.reply(summary);
  });
  bot.command("untrust", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const ownerCheck = canManageCommunityTrust(ctx) || ctx.chat.id < 0 && await isUserAdmin(ctx, ctx.from.id);
    if (!ownerCheck) {
      await ctx.reply("Only group admins can remove trust status!");
      return;
    }
    let targetUserId;
    let targetFirstName;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /untrust to remove their trust status");
      return;
    }
    const chatId = String(ctx.chat.id);
    await db.update(trustScores).set({
      trustStatus: "none",
      isTrusted: false,
      trustLevel: 0,
      trustScore: 0,
      vouchedBy: null,
      vouchedAt: null
    }).where(and(eq2(trustScores.telegramUserId, targetUserId), eq2(trustScores.chatId, chatId)));
    await ctx.reply(`${targetFirstName}'s trust status has been removed. They will need to earn trust from scratch.`);
  });
  bot.command("trustfreeze", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can freeze trust!");
      return;
    }
    let targetUserId;
    let targetFirstName;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /trustfreeze [reason]");
      return;
    }
    const reason = ctx.message?.text?.replace("/trustfreeze", "").trim() || "No reason provided";
    const chatId = String(ctx.chat.id);
    await db.update(trustScores).set({
      isFrozen: true,
      frozenBy: String(ctx.from.id),
      frozenAt: /* @__PURE__ */ new Date(),
      frozenReason: reason
    }).where(and(eq2(trustScores.telegramUserId, targetUserId), eq2(trustScores.chatId, chatId)));
    await ctx.reply(`${targetFirstName}'s trust progress has been FROZEN.

Reason: ${reason}

They cannot gain trust points until unfrozen with /trustunfreeze.`);
  });
  bot.command("trustunfreeze", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const ownerCheck = canManageCommunityTrust(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only @aussieboomer or @TreeFitty can unfreeze trust!");
      return;
    }
    let targetUserId;
    let targetFirstName;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /trustunfreeze");
      return;
    }
    const chatId = String(ctx.chat.id);
    await db.update(trustScores).set({
      isFrozen: false,
      frozenBy: null,
      frozenAt: null,
      frozenReason: null
    }).where(and(eq2(trustScores.telegramUserId, targetUserId), eq2(trustScores.chatId, chatId)));
    await ctx.reply(`${targetFirstName}'s trust progress has been UNFROZEN. They can now earn trust points again.`);
  });
  bot.command("trustboard", async (ctx) => {
    if (!ctx.chat) return;
    const _tbFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_tbFeats.trust) {
      await ctx.reply("The trust system is currently disabled in this chat.");
      return;
    }
    const chatId = String(ctx.chat.id);
    const topTrusted = await db.select().from(trustScores).where(and(eq2(trustScores.chatId, chatId), eq2(trustScores.isTrusted, true))).orderBy(desc(trustScores.trustScore)).limit(10);
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
      leaderboard += `${medal} ${name} - ${member.trustScore || 0}pts [Lv${level}] ${status}
`;
    });
    leaderboard += "\n(V) = Vouched by owner";
    await ctx.reply(leaderboard);
  });
  async function getOrCreateMemberScore(telegramUserId, chatId, username, firstName) {
    const existing = await db.select().from(memberScores).where(and(eq2(memberScores.telegramUserId, telegramUserId), eq2(memberScores.chatId, chatId))).limit(1);
    if (existing.length > 0) {
      await db.update(memberScores).set({ username, firstName, lastActive: /* @__PURE__ */ new Date() }).where(and(eq2(memberScores.telegramUserId, telegramUserId), eq2(memberScores.chatId, chatId)));
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
        messageCount: 0
      }).returning();
      return newScore;
    }
  }
  async function askNextQuestion(chatId, bot2) {
    const trivia = await getTrivia(chatId);
    if (!trivia) return;
    if (trivia.currentIndex >= trivia.totalQuestions) {
      await endTriviaRound(chatId, bot2);
      return;
    }
    const question = await getTriviaQuestion(openai2);
    trivia.currentQuestion = question;
    trivia.questionStartTime = Date.now();
    trivia.questionDeadline = Date.now() + TRIVIA_QUESTION_MS;
    trivia.answeredCurrent = [];
    trivia.questionResolved = false;
    trivia.currentIndex++;
    await saveTrivia(chatId, trivia);
    const categoryLabel = question.category === "tasmania" ? "Tasmania" : question.category === "wildlife" ? "Australian Wildlife" : "Boomerverse";
    const optionsText = question.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");
    await bot2.api.sendMessage(
      chatId,
      `QUESTION ${trivia.currentIndex}/${trivia.totalQuestions} [${categoryLabel}]

${question.question}

${optionsText}

Answer with /answer 1-4 | Worth ${question.points} points | 45 seconds`
    );
  }
  async function expireTriviaIfDue(chatId, bot2) {
    const trivia = await getTrivia(chatId);
    if (!trivia || trivia.questionResolved) return;
    if (Date.now() < trivia.questionDeadline) return;
    trivia.questionResolved = true;
    await saveTrivia(chatId, trivia);
    const q = trivia.currentQuestion;
    try {
      await bot2.api.sendMessage(chatId, `Time's up. The answer was: ${q.options[q.correctIndex]}`);
    } catch {
    }
    await askNextQuestion(chatId, bot2);
  }
  async function endTriviaRound(chatId, bot2) {
    const trivia = await getTrivia(chatId);
    if (!trivia) return;
    const scores = [...trivia.roundScoreboard].sort((a, b) => b.points - a.points);
    let resultsText = `TRIVIA ROUND COMPLETE!

`;
    if (scores.length === 0) {
      resultsText += "No one scored any points this round.";
    } else {
      resultsText += "ROUND RESULTS:\n";
      scores.slice(0, 10).forEach((s, i) => {
        const medal = i === 0 ? "[1st]" : i === 1 ? "[2nd]" : i === 2 ? "[3rd]" : `[${i + 1}]`;
        resultsText += `${medal} ${s.firstName}: ${s.points} pts (${s.correct}/${s.attempts})
`;
      });
    }
    const duration = Math.round((Date.now() - trivia.roundStartTime) / 1e3);
    resultsText += `
Round duration: ${duration} seconds
Start a new game with /trivia or /trivia 5`;
    await bot2.api.sendMessage(chatId, resultsText);
    await clearTrivia(chatId);
  }
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
    const existing = await getTrivia(ctx.chat.id);
    if (existing) {
      await ctx.reply(`There's an active trivia round! Question ${existing.currentIndex}/${existing.totalQuestions}
Answer with /answer 1-4`);
      return;
    }
    const argText = ctx.message?.text?.replace("/trivia", "").trim();
    let questionCount = parseInt(argText || "") || 1;
    questionCount = Math.max(1, Math.min(25, questionCount));
    await ctx.reply(`Starting trivia round with ${questionCount} question${questionCount > 1 ? "s" : ""}...`);
    prefillTriviaCache(openai2).catch(() => {
    });
    const firstQuestion = await getTriviaQuestion(openai2);
    await saveTrivia(ctx.chat.id, {
      currentQuestion: firstQuestion,
      questionStartTime: Date.now(),
      questionDeadline: Date.now() + TRIVIA_QUESTION_MS,
      answeredCurrent: [],
      questionResolved: false,
      totalQuestions: questionCount,
      currentIndex: 1,
      roundScoreboard: [],
      roundStartTime: Date.now()
    });
    const categoryLabel = firstQuestion.category === "tasmania" ? "Tasmania" : firstQuestion.category === "wildlife" ? "Australian Wildlife" : "Boomerverse";
    const optionsText = firstQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");
    await ctx.reply(
      `QUESTION 1/${questionCount} [${categoryLabel}]

${firstQuestion.question}

${optionsText}

Answer with /answer 1-4 | Worth ${firstQuestion.points} points | 45 seconds`
    );
  });
  bot.command("answer", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _answerFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_answerFeats.games) return;
    const trivia = await getTrivia(ctx.chat.id);
    if (!trivia) {
      await ctx.reply("No active trivia! Start one with /trivia or /trivia 5");
      return;
    }
    if (!trivia.questionResolved && Date.now() >= trivia.questionDeadline) {
      await expireTriviaIfDue(ctx.chat.id, bot);
      await ctx.reply("That question had already timed out.");
      return;
    }
    if (trivia.questionResolved) {
      await ctx.reply("This question is already solved! Next question coming up...");
      return;
    }
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
    const score = await getOrCreateMemberScore(telegramUserId, chatIdStr, username, firstName);
    let roundScore = trivia.roundScoreboard.find((s) => s.oderId === ctx.from.id);
    if (!roundScore) {
      roundScore = { oderId: ctx.from.id, username, firstName, points: 0, correct: 0, attempts: 0 };
      trivia.roundScoreboard.push(roundScore);
    }
    const isCorrect = answerNum - 1 === trivia.currentQuestion.correctIndex;
    roundScore.attempts++;
    if (isCorrect) {
      trivia.questionResolved = true;
      const earnedPoints = trivia.currentQuestion.points;
      roundScore.points += earnedPoints;
      roundScore.correct++;
      const newPoints = (score.triviaPoints || 0) + earnedPoints;
      const newCorrect = (score.triviaCorrect || 0) + 1;
      const newAttempts = (score.triviaAttempts || 0) + 1;
      const now = /* @__PURE__ */ new Date();
      const todayStr = now.toISOString().split("T")[0];
      const weekNum = getWeekNumber(now);
      const weekStr = `${now.getFullYear()}-W${weekNum}`;
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const newDailyPoints = score.dailyResetDate === todayStr ? (score.dailyPoints || 0) + earnedPoints : earnedPoints;
      const newWeeklyPoints = score.weeklyResetDate === weekStr ? (score.weeklyPoints || 0) + earnedPoints : earnedPoints;
      const newMonthlyPoints = score.monthlyResetDate === monthStr ? (score.monthlyPoints || 0) + earnedPoints : earnedPoints;
      await db.update(memberScores).set({
        triviaPoints: newPoints,
        triviaCorrect: newCorrect,
        triviaAttempts: newAttempts,
        dailyPoints: newDailyPoints,
        dailyResetDate: todayStr,
        weeklyPoints: newWeeklyPoints,
        weeklyResetDate: weekStr,
        monthlyPoints: newMonthlyPoints,
        monthlyResetDate: monthStr
      }).where(and(eq2(memberScores.telegramUserId, telegramUserId), eq2(memberScores.chatId, chatIdStr)));
      await saveTrivia(ctx.chat.id, trivia);
      await ctx.reply(`Correct. ${firstName} earned ${earnedPoints} points. (Round: ${roundScore.points} pts)`);
      await new Promise((r) => setTimeout(r, 1500));
      await askNextQuestion(ctx.chat.id, bot);
    } else {
      const newAttempts = (score.triviaAttempts || 0) + 1;
      await db.update(memberScores).set({ triviaAttempts: newAttempts }).where(and(eq2(memberScores.telegramUserId, telegramUserId), eq2(memberScores.chatId, chatIdStr)));
      await ctx.reply(`Wrong! ${firstName}, try again or wait for the timer.`);
    }
  });
  bot.command("myscore", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const telegramUserId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    const scores = await db.select().from(memberScores).where(and(eq2(memberScores.telegramUserId, telegramUserId), eq2(memberScores.chatId, chatId))).limit(1);
    if (scores.length === 0) {
      await ctx.reply("You haven't played trivia yet! Start with /trivia");
      return;
    }
    const score = scores[0];
    const accuracy = score.triviaAttempts && score.triviaAttempts > 0 ? Math.round((score.triviaCorrect || 0) / score.triviaAttempts * 100) : 0;
    await ctx.reply(
      `Your Trivia Stats:

Points: ${score.triviaPoints || 0}
Correct: ${score.triviaCorrect || 0}
Attempts: ${score.triviaAttempts || 0}
Accuracy: ${accuracy}%
Messages: ${score.messageCount || 0}`
    );
  });
  bot.command("leaderboard", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const chatId = ctx.chat.id.toString();
    const now = /* @__PURE__ */ new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekNum = getWeekNumber(now);
    const weekStr = `${now.getFullYear()}-W${weekNum}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const allScores = await db.select().from(memberScores).where(eq2(memberScores.chatId, chatId));
    if (allScores.length === 0) {
      await ctx.reply("No scores yet! Be the first to play /trivia");
      return;
    }
    const todayScores = allScores.filter((s) => s.dailyResetDate === todayStr && (s.dailyPoints || 0) > 0).sort((a, b) => (b.dailyPoints || 0) - (a.dailyPoints || 0)).slice(0, 10);
    const weeklyScores = allScores.filter((s) => s.weeklyResetDate === weekStr && (s.weeklyPoints || 0) > 0).sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0));
    const weeklyTop = weeklyScores.length > 0 ? weeklyScores[0] : null;
    const monthlyScores = allScores.filter((s) => s.monthlyResetDate === monthStr && (s.monthlyPoints || 0) > 0).sort((a, b) => (b.monthlyPoints || 0) - (a.monthlyPoints || 0));
    const monthlyTop = monthlyScores.length > 0 ? monthlyScores[0] : null;
    let text2 = "DAILY TRIVIA LEADERBOARD\n\n";
    if (todayScores.length > 0) {
      todayScores.forEach((s, i) => {
        const medal = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`;
        const name = s.username ? `@${s.username}` : s.firstName || "Anonymous";
        text2 += `${medal}: ${name} - ${s.dailyPoints} pts
`;
      });
    } else {
      text2 += "No scores yet today! Start with /trivia\n";
    }
    text2 += "\n--- TOP WINNERS ---\n";
    if (weeklyTop) {
      const weekName = weeklyTop.username ? `@${weeklyTop.username}` : weeklyTop.firstName || "Anonymous";
      text2 += `
Week Champion: ${weekName} (${weeklyTop.weeklyPoints} pts)`;
    } else {
      text2 += "\nWeek Champion: None yet this week";
    }
    if (monthlyTop) {
      const monthName = monthlyTop.username ? `@${monthlyTop.username}` : monthlyTop.firstName || "Anonymous";
      text2 += `
Month Champion: ${monthName} (${monthlyTop.monthlyPoints} pts)`;
    } else {
      text2 += "\nMonth Champion: None yet this month";
    }
    await ctx.reply(text2);
  });
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
    const existing = await getPuzzle(ctx.chat.id);
    if (existing && !existing.solved && Date.now() < existing.deadline) {
      const timeLeft = Math.max(0, Math.ceil((existing.startTime + existing.timeLimit * 1e3 - Date.now()) / 1e3));
      await ctx.reply(`Active puzzle: ${existing.scrambled}
Time left: ${timeLeft}s | Guess with /guess YOUR_ANSWER`);
      return;
    }
    const argText = ctx.message?.text?.replace("/puzzle", "").trim().toLowerCase();
    let difficulty = "easy";
    if (argText === "hard") {
      difficulty = "hard";
    } else if (argText === "easy") {
      difficulty = "easy";
    } else if (argText) {
      difficulty = Math.random() < 0.5 ? "easy" : "hard";
    } else {
      difficulty = Math.random() < 0.5 ? "easy" : "hard";
    }
    const wordList = difficulty === "easy" ? EASY_WORDS : HARD_WORDS;
    const word = await getUnusedPuzzleWord(ctx.chat.id, wordList);
    const scrambled = scrambleWord(word);
    const timeLimit = difficulty === "easy" ? 45 : 20;
    const points = difficulty === "easy" ? 5 : 15;
    await getOrCreatePuzzleScore(
      ctx.from.id.toString(),
      ctx.chat.id.toString(),
      ctx.from.username || "",
      ctx.from.first_name || "Friend"
    );
    const chatId = ctx.chat.id;
    const puzzle = {
      word,
      scrambled,
      difficulty,
      startTime: Date.now(),
      deadline: Date.now() + timeLimit * 1e3,
      timeLimit,
      points,
      answeredUsers: [],
      solved: false
    };
    await savePuzzle(chatId, puzzle);
    await ctx.reply(
      `WORD PUZZLE [${difficulty.toUpperCase()}]

Unscramble: ${scrambled}

Worth ${points} points | ${timeLimit} seconds
Answer with: /guess YOUR_ANSWER`
    );
  });
  async function expirePuzzleIfDue(chatId, bot2) {
    const puzzle = await getPuzzle(chatId);
    if (!puzzle || puzzle.solved) return;
    if (Date.now() < puzzle.deadline) return;
    await clearPuzzle(chatId);
    try {
      await bot2.api.sendMessage(chatId, `Time's up. The answer was: ${puzzle.word}

Try again with /puzzle or /puzzle hard`);
    } catch {
    }
  }
  bot.command("guess", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _guessFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_guessFeats.games) return;
    const puzzle = await getPuzzle(ctx.chat.id);
    if (!puzzle || puzzle.solved) {
      await ctx.reply("No active puzzle. Start one with /puzzle or /puzzle hard");
      return;
    }
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
    await getOrCreatePuzzleScore(telegramUserId, chatIdStr, username, firstName);
    if (puzzle.answeredUsers.includes(ctx.from.id)) {
      await ctx.reply("You already guessed this round! Wait for the next puzzle.");
      return;
    }
    if (guessText === puzzle.word) {
      puzzle.solved = true;
      puzzle.solverName = firstName;
      const timeSpent = Math.round((Date.now() - puzzle.startTime) / 1e3);
      await updatePuzzleScore(telegramUserId, chatIdStr, puzzle.points);
      await ctx.reply(
        `CORRECT! ${firstName} solved it!

Answer: ${puzzle.word}
Time: ${timeSpent}s | Points: +${puzzle.points}

Play again with /puzzle or /puzzle hard`
      );
      await clearPuzzle(ctx.chat.id);
    } else {
      puzzle.answeredUsers.push(ctx.from.id);
      await savePuzzle(ctx.chat.id, puzzle);
      await incrementPuzzleAttempt(telegramUserId, chatIdStr);
      const timeLeft = Math.max(0, Math.ceil((puzzle.deadline - Date.now()) / 1e3));
      await ctx.reply(`Not it. ${timeLeft}s left for everyone else.`);
    }
  });
  bot.command("puzzleboard", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const _pbFeats = await getFeatureSettings(ctx.chat.id.toString());
    if (!_pbFeats.games) {
      await ctx.reply("Games are currently disabled in this chat.");
      return;
    }
    const chatId = ctx.chat.id.toString();
    const now = /* @__PURE__ */ new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekNum = getWeekNumberForPuzzle(now);
    const weekStr = `${now.getFullYear()}-W${weekNum}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const allScores = await db.select().from(memberScores).where(eq2(memberScores.chatId, chatId));
    if (allScores.length === 0) {
      await ctx.reply("No puzzle scores yet! Start with /puzzle or /puzzle hard");
      return;
    }
    const todayScores = allScores.filter((s) => s.puzzleDailyResetDate === todayStr && (s.puzzleDailyPoints || 0) > 0).sort((a, b) => (b.puzzleDailyPoints || 0) - (a.puzzleDailyPoints || 0)).slice(0, 10);
    const weeklyScores = allScores.filter((s) => s.puzzleWeeklyResetDate === weekStr && (s.puzzleWeeklyPoints || 0) > 0).sort((a, b) => (b.puzzleWeeklyPoints || 0) - (a.puzzleWeeklyPoints || 0));
    const weeklyTop = weeklyScores.length > 0 ? weeklyScores[0] : null;
    const monthlyScores = allScores.filter((s) => s.puzzleMonthlyResetDate === monthStr && (s.puzzleMonthlyPoints || 0) > 0).sort((a, b) => (b.puzzleMonthlyPoints || 0) - (a.puzzleMonthlyPoints || 0));
    const monthlyTop = monthlyScores.length > 0 ? monthlyScores[0] : null;
    let text2 = "DAILY PUZZLE LEADERBOARD\n\n";
    if (todayScores.length > 0) {
      todayScores.forEach((s, i) => {
        const medal = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`;
        const name = s.username ? `@${s.username}` : s.firstName || "Anonymous";
        text2 += `${medal}: ${name} - ${s.puzzleDailyPoints} pts
`;
      });
    } else {
      text2 += "No puzzle scores today! Start with /puzzle\n";
    }
    text2 += "\n--- TOP PUZZLE SOLVERS ---\n";
    if (weeklyTop) {
      const weekName = weeklyTop.username ? `@${weeklyTop.username}` : weeklyTop.firstName || "Anonymous";
      text2 += `
Week Champion: ${weekName} (${weeklyTop.puzzleWeeklyPoints} pts)`;
    } else {
      text2 += "\nWeek Champion: None yet this week";
    }
    if (monthlyTop) {
      const monthName = monthlyTop.username ? `@${monthlyTop.username}` : monthlyTop.firstName || "Anonymous";
      text2 += `
Month Champion: ${monthName} (${monthlyTop.puzzleMonthlyPoints} pts)`;
    } else {
      text2 += "\nMonth Champion: None yet this month";
    }
    await ctx.reply(text2);
  });
  bot.command("story", async (ctx) => {
    if (!ctx.from) return;
    if (ctx.chat?.id) {
      const _storyFeats = await getFeatureSettings(ctx.chat.id.toString());
      if (!_storyFeats.stories) {
        await ctx.reply("Stories are currently disabled in this chat. An admin can enable them with /toggle stories");
        return;
      }
    }
    if (!await isOwner(ctx) && !await isAdmin(ctx)) {
      await ctx.reply("Stories are read out by admins, not on request.");
      return;
    }
    const story = generateRandomStory();
    await ctx.reply(story);
  });
  bot.command("violations", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    const ownerCheck = await isOwner(ctx);
    if (!ownerCheck) {
      await ctx.reply("Only the group owner can view violations!");
      return;
    }
    const chatId = String(ctx.chat.id);
    const violations = await db.select().from(violationLogs).where(eq2(violationLogs.chatId, chatId)).orderBy(desc(violationLogs.createdAt)).limit(50);
    if (violations.length === 0) {
      await ctx.reply("No violations recorded for this chat yet! That's a good thing.");
      return;
    }
    let text2 = "SECURITY VIOLATIONS (Last 50)\n\n";
    for (const v of violations) {
      const name = v.username ? `@${v.username}` : `User ${v.userId}`;
      const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "Unknown";
      text2 += `${v.violationType?.toUpperCase()}: ${name}
`;
      text2 += `  Action: ${v.actionTaken || "logged"} | ${date}
`;
      if (v.violatingContent) {
        const preview = v.violatingContent.substring(0, 50) + (v.violatingContent.length > 50 ? "..." : "");
        text2 += `  Content: ${preview}
`;
      }
      text2 += "\n";
    }
    await ctx.reply(text2);
  });
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
  bot.command("myid", async (ctx) => {
    if (!ctx.from) return;
    const label = memberLabel(ctx.from);
    await ctx.reply(`${label}, your Telegram numeric user ID is: ${ctx.from.id}

Usernames can change. This number is what The Warden uses for secure role authority.`);
  });
  bot.command("userid", async (ctx) => {
    if (!ctx.from || !isGlobalOwner(ctx)) return;
    const target = ctx.message?.reply_to_message?.from;
    if (!target) {
      await ctx.reply("Reply to the person's message with /userid and I'll show their number.");
      return;
    }
    const label = target.username ? `@${target.username}` : target.first_name || "That member";
    await ctx.reply(`${label}'s Telegram numeric user ID is: ${target.id}`);
  });
  bot.command("pinsafety", async (ctx) => {
    if (!ctx.from || !ctx.chat || !isGlobalOwner(ctx)) return;
    if (ctx.chat.id >= 0) {
      await ctx.reply("Use this in the group.");
      return;
    }
    const sent = await ctx.reply(
      `SAFETY NOTICE \u2014 PLEASE READ

\u2022 The Boomerverse team will NEVER DM you first. Anyone who does is a scammer.
\u2022 There is no token. Ignore every presale, airdrop or "claim" offer.
\u2022 Never share your seed phrase or private key with anyone, ever.
\u2022 Never connect your wallet to a link someone posts in chat.
\u2022 Only trusted members can post links. If a link looks wrong, don't tap it. Tell an admin.
\u2022 Official links are in the pinned messages only.`
    );
    try {
      await ctx.api.pinChatMessage(ctx.chat.id, sent.message_id, { disable_notification: false });
    } catch {
      await ctx.reply("Posted, but I couldn't pin it. Make me an admin with the Pin Messages right, then send /pinsafety again.");
    }
  });
  bot.command("trustset", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    const canManage = canManageCommunityTrust(ctx);
    if (!canManage) {
      await ctx.reply("Only @aussieboomer and @TreeFitty can change community trust levels.");
      return;
    }
    const text2 = ctx.message?.text || "";
    const parts = text2.replace("/trustset", "").trim().split(/\s+/);
    let targetUserId;
    let targetUsername;
    let targetFirstName;
    let level = parts[parts.length - 1]?.toLowerCase();
    if (level === "level1" || level === "level2") level = "trusted";
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetFirstName = ctx.message.reply_to_message.from.first_name;
    } else {
      const mention = parts.find((p) => p.startsWith("@"));
      if (mention) {
        const lookup = mention.replace(/^@/, "").toLowerCase();
        const rows = await db.select().from(trustScores).where(and(eq2(trustScores.chatId, String(ctx.chat.id)), sql2`LOWER(${trustScores.username}) = ${lookup}`)).limit(1);
        if (rows.length) {
          targetUserId = rows[0].telegramUserId;
          targetUsername = rows[0].username || lookup;
          targetFirstName = rows[0].firstName || void 0;
        } else {
          await ctx.reply(`I don't have @${lookup}'s numeric Telegram ID yet. Have them send one message, then run the command again \u2014 or reply directly to their message.`);
          return;
        }
      } else {
        await ctx.reply("Usage: /trustset @username full|trusted|normal|restricted \u2014 or reply to their message with /trustset [level]");
        return;
      }
    }
    if (!["full", "trusted", "normal", "restricted"].includes(level)) {
      await ctx.reply("Invalid level. Use: full, trusted, normal, or restricted.\n\nExample: /trustset trusted");
      return;
    }
    const chatId = String(ctx.chat.id);
    const scoreMap = { restricted: 0, normal: 0, trusted: 60, full: 100 };
    const levelMap = { restricted: 0, normal: 0, trusted: 2, full: 3 };
    const newScore = scoreMap[level];
    const newLevel = levelMap[level];
    const existing = await db.select().from(trustScores).where(and(
      eq2(trustScores.telegramUserId, targetUserId),
      eq2(trustScores.chatId, chatId)
    )).limit(1);
    if (existing.length > 0) {
      await db.update(trustScores).set({
        trustScore: newScore,
        trustLevel: newLevel,
        trustStatus: level === "restricted" ? "restricted" : level === "normal" ? "none" : "vouched",
        isTrusted: level === "trusted" || level === "full",
        isEligible: level === "trusted" || level === "full",
        isFrozen: level === "restricted",
        frozenBy: level === "restricted" ? String(ctx.from.id) : null,
        frozenAt: level === "restricted" ? /* @__PURE__ */ new Date() : null,
        frozenReason: level === "restricted" ? "Manual restricted trust level" : null,
        vouchedBy: level === "trusted" || level === "full" ? String(ctx.from.id) : null,
        vouchedAt: level === "trusted" || level === "full" ? /* @__PURE__ */ new Date() : null,
        lastTrustUpdate: /* @__PURE__ */ new Date()
      }).where(and(
        eq2(trustScores.telegramUserId, targetUserId),
        eq2(trustScores.chatId, chatId)
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
        frozenAt: level === "restricted" ? /* @__PURE__ */ new Date() : null,
        frozenReason: level === "restricted" ? "Manual restricted trust level" : null,
        vouchedBy: level === "trusted" || level === "full" ? String(ctx.from.id) : null,
        vouchedAt: level === "trusted" || level === "full" ? /* @__PURE__ */ new Date() : null
      });
    }
    const name = targetUsername ? `@${targetUsername}` : targetFirstName || "User";
    await ctx.reply(`${name} is now ${level.toUpperCase()} trust.

Only @aussieboomer and @TreeFitty can change this setting.`);
  });
  bot.command("trustcheck", async (ctx) => {
    if (!ctx.chat || !ctx.from || ctx.chat.type === "private") return;
    let target = ctx.message?.reply_to_message?.from;
    let userId = target ? String(target.id) : void 0;
    let uname = target?.username;
    let first = target?.first_name;
    if (!userId) {
      const mention = (ctx.message?.text || "").match(/@(\w+)/);
      if (!mention) {
        await ctx.reply("Use /trustcheck @username or reply to their message with /trustcheck.");
        return;
      }
      const lookup = mention[1].toLowerCase();
      const rows = await db.select().from(trustScores).where(and(eq2(trustScores.chatId, String(ctx.chat.id)), sql2`LOWER(${trustScores.username}) = ${lookup}`)).limit(1);
      if (!rows.length) {
        await ctx.reply(`I haven't seen @${lookup} speak yet, so I don't have their numeric ID.`);
        return;
      }
      userId = rows[0].telegramUserId;
      uname = rows[0].username || lookup;
      first = rows[0].firstName || void 0;
    }
    const level = await getCommunityTrustClass(userId, String(ctx.chat.id));
    const staticRole = staticRoleForUserId(userId);
    const label = uname ? `@${uname}` : first || `User ${userId}`;
    const roleText = staticRole === "boss" ? "Boss" : staticRole === "community_leader" ? "Community Leader" : staticRole === "trusted_mod" ? "Trusted Mod/Admin" : "Member";
    await ctx.reply(`${label} \u2014 ${roleText}. Effective community trust: ${level.toUpperCase()}.`);
  });
  bot.command("trustremove", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    const canManage = canManageCommunityTrust(ctx);
    if (!canManage) {
      await ctx.reply("Only @aussieboomer and @TreeFitty can change community trust levels.");
      return;
    }
    const text2 = ctx.message?.text || "";
    const parts = text2.replace("/trustremove", "").trim().split(/\s+/);
    let targetUserId;
    let targetUsername;
    let targetFirstName;
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
    const existing = await db.select().from(trustScores).where(and(
      eq2(trustScores.telegramUserId, targetUserId),
      eq2(trustScores.chatId, chatId)
    )).limit(1);
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
    await db.update(trustScores).set({
      trustScore: newScore,
      trustLevel: newLevel,
      trustStatus: newStatus,
      isTrusted: newScore >= 25,
      vouchedBy: null,
      vouchedAt: null,
      lastTrustUpdate: /* @__PURE__ */ new Date()
    }).where(and(
      eq2(trustScores.telegramUserId, targetUserId),
      eq2(trustScores.chatId, chatId)
    ));
    const name = targetUsername ? `@${targetUsername}` : targetFirstName || "User";
    await ctx.reply(`${name}'s trust has been reduced. New score: ${newScore} pts (Level ${newLevel})`);
  });
  bot.command("ban", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    const chatIdStr = ctx.chat.id.toString();
    const adminCheck = await isBotAdmin(ctx, chatIdStr);
    if (!adminCheck) {
      await ctx.reply("Only admins can ban users!");
      return;
    }
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
      const _banFeats = await getFeatureSettings(chatIdStr);
      if (_banFeats.crossBan) {
        await recordGlobalBan(
          String(targetUser.id),
          targetUser.username,
          targetUser.first_name,
          chatIdStr,
          "Banned by admin"
        );
      }
      await ctx.reply(
        `Banned ${targetUser.first_name}. They can no longer join this group.` + (_banFeats.crossBan ? `

Also blocked from every other group I manage.` : ``)
      );
    } catch (error) {
      await ctx.reply("Couldn't ban that user. Make sure I have admin permissions!");
    }
  });
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
      await ctx.api.banChatMember(ctx.chat.id, targetUser.id);
      await ctx.api.unbanChatMember(ctx.chat.id, targetUser.id);
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
    const parts = pollText.split("|").map((p) => p.trim()).filter((p) => p);
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
  bot.command("restore", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!await isOwner(ctx)) {
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
    const { isGames, response: gamesResponse } = detectGamesQuery(question);
    if (isGames && gamesResponse) {
      await ctx.reply(gamesResponse);
      return;
    }
    const { isCrypto, tokens } = detectCryptoQuery(question);
    const skipCache = isCrypto;
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
    if (isCrypto) {
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
        liveData += `

LIVE PRICES:
${tokenResults.join("\n")}`;
      }
      const nftKeywords = ["nft", "bored ape", "bayc", "azuki", "pudgy", "doodles", "cryptopunks", "mutant ape", "mayc"];
      const hasNFT = nftKeywords.some((k) => question.toLowerCase().includes(k));
      if (hasNFT) {
        const nftData = await fetchNFTData(question);
        if (nftData) {
          liveData += `

${nftData}`;
        }
      }
      if (question.toLowerCase().includes("trending") || question.toLowerCase().includes("hot")) {
        const trending = await fetchTrendingCoins();
        if (trending) {
          liveData += `

${trending}`;
        }
      }
    }
    let context = "User asking a question about Boomerverse";
    if (isCrypto) context = "User asking about crypto/NFT. Provide helpful market commentary.";
    const aiResponse = await getAIResponse(question, context);
    const fullResponse = aiResponse + liveData + disclaimer;
    if (!skipCache && aiResponse) {
      await cacheAnswer(question, aiResponse);
    }
    await wardenReply(ctx, fullResponse, { gifChance: 0.15 });
  });
  bot.command("mute", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      await ctx.reply("This command only works in groups.");
      return;
    }
    const chatIdStr = String(ctx.chat.id);
    const callerCanMod = await canUserModerate(ctx, ctx.from.id, chatIdStr);
    if (!callerCanMod) {
      await ctx.reply("Only admins and mods can use this command.");
      return;
    }
    const replyTo = ctx.message?.reply_to_message?.from;
    const args = ctx.message?.text?.split(/\s+/) || [];
    let targetUserId = null;
    let duration = 3600;
    let reason = "Muted by admin";
    if (replyTo) {
      targetUserId = replyTo.id;
      if (args[1]) {
        const durationMatch = args[1].match(/^(\d+)([mhd])$/i);
        if (durationMatch) {
          const num = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          if (unit === "m") duration = num * 60;
          else if (unit === "h") duration = num * 3600;
          else if (unit === "d") duration = num * 86400;
          reason = args.slice(2).join(" ") || reason;
        } else {
          reason = args.slice(1).join(" ") || reason;
        }
      }
    } else {
      await ctx.reply("Reply to a user's message to mute them.\nUsage: /mute [duration] [reason]\nDuration: 30m, 1h, 1d");
      return;
    }
    const targetIsAdmin = await isUserAdmin(ctx, targetUserId);
    if (targetIsAdmin) {
      await ctx.reply("Cannot mute an admin.");
      return;
    }
    const targetUsername = replyTo?.username || replyTo?.first_name || `User ${targetUserId}`;
    const success = await muteUser(ctx, targetUserId, duration, reason, targetUsername);
    if (success) {
      const durationStr = duration < 3600 ? `${Math.round(duration / 60)} minutes` : duration < 86400 ? `${Math.round(duration / 3600)} hour(s)` : `${Math.round(duration / 86400)} day(s)`;
      await ctx.reply(`User muted for ${durationStr}.
Reason: ${reason}`);
    } else {
      await ctx.reply("Failed to mute user. Make sure I have the right permissions.");
    }
  });
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
    const reason = ctx.message?.text?.replace(/^\/warn\s*/i, "") || "Breaking community rules";
    await ensureUserModerationStatus(String(replyTo.id), chatIdStr);
    const status = await getUserModerationStatus(String(replyTo.id), chatIdStr);
    const newWarnCount = (status?.warnCount || 0) + 1;
    await db.update(userModerationStatus).set({
      warnCount: newWarnCount,
      lastWarnDate: sql2`CURRENT_TIMESTAMP`
    }).where(and(
      eq2(userModerationStatus.telegramUserId, String(replyTo.id)),
      eq2(userModerationStatus.chatId, chatIdStr)
    ));
    await incrementModStat(chatIdStr, "warnCount");
    if (newWarnCount >= 3) {
      const targetIsAdmin = await isUserAdmin(ctx, replyTo.id);
      if (!targetIsAdmin) {
        const warnedUsername = replyTo.username || replyTo.first_name || `User ${replyTo.id}`;
        await muteUser(ctx, replyTo.id, 3600, "3 warnings received", warnedUsername);
        await ctx.reply(`\u26A0\uFE0F @${replyTo.username || replyTo.first_name} - Warning #${newWarnCount}
Reason: ${reason}

You have been automatically muted for 1 hour due to receiving 3 warnings.`);
      }
    } else {
      await ctx.reply(`\u26A0\uFE0F @${replyTo.username || replyTo.first_name} - Warning #${newWarnCount}/3
Reason: ${reason}

3 warnings = 1 hour mute`);
    }
  });
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
    const settings = await getChatSettings(chatIdStr);
    if (action === "on") {
      const existing = await db.select().from(chatModerationSettings).where(eq2(chatModerationSettings.chatId, chatIdStr)).limit(1);
      if (existing.length > 0) {
        await db.update(chatModerationSettings).set({
          raidModeEnabled: true,
          raidModeEnabledAt: sql2`CURRENT_TIMESTAMP`,
          raidModeEnabledBy: String(ctx.from.id)
        }).where(eq2(chatModerationSettings.chatId, chatIdStr));
      } else {
        await db.insert(chatModerationSettings).values({
          chatId: chatIdStr,
          raidModeEnabled: true,
          raidModeEnabledAt: /* @__PURE__ */ new Date(),
          raidModeEnabledBy: String(ctx.from.id)
        });
      }
      chatSettingsCache.delete(chatIdStr);
      await ctx.reply(`\u{1F6A8} *RAID MODE ACTIVATED*

Anti-raid protections enabled:
\u2022 New users cannot post links
\u2022 Stricter spam thresholds
\u2022 Enhanced scam detection

Use /raidmode off to disable.`, { parse_mode: "Markdown" });
    } else if (action === "off") {
      await db.update(chatModerationSettings).set({ raidModeEnabled: false }).where(eq2(chatModerationSettings.chatId, chatIdStr));
      chatSettingsCache.delete(chatIdStr);
      await ctx.reply(`\u2705 Raid mode disabled. Normal moderation settings restored.`);
    } else {
      await ctx.reply(`*Raid Mode Status:* ${settings.raidMode ? "\u{1F6A8} ACTIVE" : "\u2705 Inactive"}

Usage:
/raidmode on - Enable anti-raid protections
/raidmode off - Disable anti-raid protections`, { parse_mode: "Markdown" });
    }
  });
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
    await ctx.reply(`\u{1F4CA} *Moderation Stats - ${periodLabel}*

\u{1F44B} New Joins: ${stats.newJoins}
\u{1F6AB} Messages Blocked: ${stats.messagesBlocked}
\u{1F4F5} Spam Blocked: ${stats.spamBlocked}
\u26A0\uFE0F Scams Blocked: ${stats.scamsBlocked}
\u{1F517} Links Blocked: ${stats.linksBlocked}
\u{1F507} Users Muted: ${stats.muteCount}
\u26A0\uFE0F Warnings Given: ${stats.warnCount}
\u{1F3F3}\uFE0F Flagged for Review: ${stats.flaggedForReview}

_Use /modstats week for weekly stats_`, { parse_mode: "Markdown" });
  });
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
    await db.update(userModerationStatus).set({ role }).where(and(
      eq2(userModerationStatus.telegramUserId, String(replyTo.id)),
      eq2(userModerationStatus.chatId, chatIdStr)
    ));
    await ctx.reply(`\u2705 @${replyTo.username || replyTo.first_name}'s role set to: ${role}`);
  });
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
        `This community is already configured!

Name: ${existing.displayName}
Nickname: ${existing.botNickname}
Timezone: ${existing.timezone}
Status: ${getStatusLabel(existing)}

Use /community to view full config.
Update settings: /setname /setwelcome /setnickname /settimezone`
      );
      return;
    }
    const chatTitle = ctx.chat?.title || void 0;
    await ensureCommunity(chatIdStr, chatTitle);
    setupWizardState.set(chatIdStr, { step: 1, initiatorId: ctx.from.id });
    await ctx.reply(
      `THE WARDEN \u2014 SETUP

I'll walk you through configuring me for your community. Admins only.

Your 7-day FREE TRIAL has started!

STEP 1 OF 4: What's the name of your community?
(e.g. "Boomerverse", "CryptoHub", "NFT Lounge")

Type the name to continue, or /community to skip setup.`
    );
  });
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
        `This group hasn't been set up yet.

Run /setup (admin only) to configure The Warden and start your FREE 7-day trial with all 20 features enabled!`
      );
      return;
    }
    const feats = await getFeatureSettings(chatIdStr);
    const enabledFeatures = Object.entries(feats).filter(([, v]) => v).map(([k]) => k);
    await ctx.reply(
      `COMMUNITY CONFIG

Name: ${community.displayName}
Bot Nickname: ${community.botNickname}
Timezone: ${community.timezone}
Welcome Message: ${community.welcomeMessage ? "Custom (set)" : "Default rotation"}
Status: ${getStatusLabel(community)}

Active features (${enabledFeatures.length}/21): ${enabledFeatures.join(", ")}

Manage: /setname /setwelcome /setnickname /settimezone /settings /toggle`
    );
  });
  bot.command("setname", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!await isAdmin(ctx)) {
      await ctx.reply("Only admins can update community settings.");
      return;
    }
    const name = (ctx.match || "").trim();
    if (!name) {
      await ctx.reply("Usage: /setname Your Community Name");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { displayName: name });
    await ctx.reply(`Community name updated to: ${name}`);
  });
  bot.command("setwelcome", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!await isAdmin(ctx)) {
      await ctx.reply("Only admins can update community settings.");
      return;
    }
    const message = (ctx.match || "").trim();
    if (!message) {
      await ctx.reply(
        `Usage: /setwelcome Your welcome message

Use {name} as a placeholder for the new member's name.
Example: /setwelcome Hey {name}! Welcome to our community! Read the pinned messages.`
      );
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { welcomeMessage: message });
    const preview = message.replace("{name}", ctx.from.first_name || "NewMember");
    await ctx.reply(`Custom welcome message saved!

Preview: "${preview}"`);
  });
  bot.command("setnickname", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!await isAdmin(ctx)) {
      await ctx.reply("Only admins can update community settings.");
      return;
    }
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
  bot.command("settimezone", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!await isAdmin(ctx)) {
      await ctx.reply("Only admins can update community settings.");
      return;
    }
    const tz = (ctx.match || "").trim();
    if (!tz) {
      await ctx.reply(
        `Usage: /settimezone Timezone

Common options:
\u2022 Australia/Hobart (Tasmania)
\u2022 Australia/Sydney (AEST/AEDT)
\u2022 America/Los_Angeles (Pacific)
\u2022 America/New_York (Eastern)
\u2022 Europe/London (GMT/BST)
\u2022 Asia/Singapore (SGT)
\u2022 UTC`
      );
      return;
    }
    try {
      Intl.DateTimeFormat(void 0, { timeZone: tz });
    } catch {
      await ctx.reply("Invalid timezone. Use standard IANA names like America/New_York or Australia/Sydney.");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { timezone: tz });
    await ctx.reply(`Timezone updated to: ${tz}`);
  });
  bot.command("addadmin", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") return;
    if (!await isOwner(ctx)) {
      await ctx.reply("Only the group owner can manage the bot admin list.");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    let targetUserId;
    let targetUsername;
    let targetName;
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
    if (!targetUserId) {
      await ctx.reply("Couldn't identify the user.");
      return;
    }
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
  bot.command("removeadmin", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      if (!isGlobalOwner(ctx)) {
        await ctx.reply("Owner-only command.");
        return;
      }
      const parts = (ctx.match || "").trim().split(/\s+/);
      const chatId = parts[0];
      const userId = parts[1];
      if (!chatId || !userId) {
        await ctx.reply("Usage: /removeadmin -100123456789 123456789\n\nGet chat IDs with /communities");
        return;
      }
      const existing = await getCommunity(chatId);
      if (!existing) {
        await ctx.reply(`No community found with chatId: ${chatId}`);
        return;
      }
      const currentList2 = existing.botAdminIds || [];
      if (!currentList2.includes(userId)) {
        await ctx.reply(`User ${userId} is not in the bot admin list for "${existing.displayName}".`);
        return;
      }
      await updateCommunity(chatId, { botAdminIds: currentList2.filter((id) => id !== userId) });
      communityCache.delete(chatId);
      if (botInstance) {
        try {
          await botInstance.api.sendMessage(parseInt(chatId), `User ID ${userId} has been removed from the Warden admin access by the owner.`);
        } catch {
        }
      }
      await ctx.reply(`\u2705 User ${userId} removed from bot admins in "${existing.displayName}" (${chatId})`);
      return;
    }
    if (!await isOwner(ctx)) {
      await ctx.reply("Only the group owner can manage the bot admin list.");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    let targetUserId;
    let targetName;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetName = ctx.message.reply_to_message.from.first_name || ctx.message.reply_to_message.from.username;
    } else {
      await ctx.reply("Usage: Reply to a user's message with /removeadmin\nOr from DM: /removeadmin [chatId] [userId]");
      return;
    }
    if (!targetUserId) {
      await ctx.reply("Couldn't identify the user.");
      return;
    }
    const community = await getCommunity(chatIdStr);
    const currentList = community?.botAdminIds || [];
    if (!currentList.includes(targetUserId)) {
      await ctx.reply(`${targetName} is not in the bot admin list.`);
      return;
    }
    await updateCommunity(chatIdStr, { botAdminIds: currentList.filter((id) => id !== targetUserId) });
    communityCache.delete(chatIdStr);
    await ctx.reply(`${targetName} removed from the bot admin list.`);
  });
  bot.command("listadmins", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      if (!isGlobalOwner(ctx)) {
        await ctx.reply("Owner-only command.");
        return;
      }
      const chatId = (ctx.match || "").trim();
      if (!chatId) {
        await ctx.reply("Usage: /listadmins -100123456789\n\nGet chat IDs with /communities");
        return;
      }
      const existing = await getCommunity(chatId);
      if (!existing) {
        await ctx.reply(`No community found with chatId: ${chatId}`);
        return;
      }
      const list2 = existing.botAdminIds || [];
      if (list2.length === 0) {
        await ctx.reply(`"${existing.displayName}" (${chatId}) has no bot admin overrides.

Only Telegram admins can run The Warden commands there.`);
        return;
      }
      await ctx.reply(
        `BOT ADMINS \u2014 "${existing.displayName}" (${chatId})

` + list2.map((id, i) => `${i + 1}. User ID: ${id}`).join("\n") + `

Add: /setadmin ${chatId} [userId]
Remove: /removeadmin ${chatId} [userId]
Replace all: /changeadmin ${chatId} [userId]`
      );
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    const community = await getCommunity(chatIdStr);
    if (!community || community.botAdminIds.length === 0) {
      await ctx.reply(
        "No custom bot admins set for this group.\n\nAll Telegram admins and the group owner can run The Warden commands by default.\n\nCommands:\n/addadmin \u2014 reply to a message to add someone\n/changeadmin \u2014 reply to make someone the new admin"
      );
      return;
    }
    const list = community.botAdminIds.map((id, i) => `${i + 1}. User ID: ${id}`).join("\n");
    await ctx.reply(
      `BOT ADMIN LIST (${community.botAdminIds.length})

${list}

These users can run The Warden admin commands without Telegram admin status.

/addadmin \u2014 add someone \xB7 /removeadmin \u2014 remove someone \xB7 /changeadmin \u2014 swap to new person`
    );
  });
  bot.command("changeadmin", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;
    if (ctx.chat.type === "private") {
      if (!isGlobalOwner(ctx)) {
        await ctx.reply("Owner-only command.");
        return;
      }
      const parts = (ctx.match || "").trim().split(/\s+/);
      const chatId = parts[0];
      const userId = parts[1];
      if (!chatId || !userId) {
        await ctx.reply("Usage: /changeadmin -100123456789 123456789\n\nReplaces ALL current bot admins with just this user.\nGet chat IDs with /communities");
        return;
      }
      const existing = await getCommunity(chatId);
      if (!existing) {
        await ctx.reply(`No community found with chatId: ${chatId}`);
        return;
      }
      await updateCommunity(chatId, { botAdminIds: [userId] });
      communityCache.delete(chatId);
      if (botInstance) {
        try {
          await botInstance.api.sendMessage(parseInt(chatId), `Bot admin access has been updated by the owner. User ID ${userId} is now the sole bot admin for this community.`);
        } catch {
        }
      }
      await ctx.reply(`\u2705 Bot admin for "${existing.displayName}" (${chatId}) changed to User ID ${userId}

All previous admins removed.`);
      return;
    }
    if (!await isOwner(ctx)) {
      await ctx.reply("Only the group owner can change the bot admin.");
      return;
    }
    const chatIdStr = ctx.chat.id.toString();
    let targetUserId;
    let targetName;
    let targetUsername;
    if (ctx.message?.reply_to_message?.from) {
      targetUserId = String(ctx.message.reply_to_message.from.id);
      targetUsername = ctx.message.reply_to_message.from.username;
      targetName = ctx.message.reply_to_message.from.first_name || targetUsername;
    } else {
      await ctx.reply(
        "Usage: Reply to any message from the new admin and type /changeadmin\n\nThis replaces the current bot admin with that person.\nUse /addadmin if you want to add them alongside existing admins instead."
      );
      return;
    }
    if (!targetUserId) {
      await ctx.reply("Couldn't identify the user.");
      return;
    }
    await ensureCommunity(chatIdStr);
    await updateCommunity(chatIdStr, { botAdminIds: [targetUserId] });
    communityCache.delete(chatIdStr);
    await ctx.reply(
      `${targetName || "@" + targetUsername} is now the bot admin for this group.

They can use all The Warden admin commands. Previous bot admins (if any) have been replaced.

Use /addadmin to add more admins alongside them.`
    );
  });
  bot.command("communities", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    try {
      const allCommunities = await db.select().from(communities).orderBy(desc(communities.createdAt));
      if (allCommunities.length === 0) {
        await ctx.reply("No communities registered yet. Groups create a record when an admin runs /setup.");
        return;
      }
      const lines = allCommunities.map((c) => {
        const record = mapCommunityRow(c);
        return `\u2022 ${record.displayName} (${record.chatId})
  Status: ${getStatusLabel(record)}`;
      });
      const chunks = [];
      let current = `REGISTERED COMMUNITIES (${allCommunities.length} total)

`;
      for (const line of lines) {
        if ((current + line + "\n\n").length > 3800) {
          chunks.push(current);
          current = "";
        }
        current += line + "\n\n";
      }
      if (current) chunks.push(current);
      for (const chunk of chunks) await ctx.reply(chunk.trim());
    } catch (err) {
      console.error("Error listing communities:", err);
      await ctx.reply("Error fetching community list.");
    }
  });
  bot.command("activate", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    const chatId = (ctx.match || "").trim();
    if (!chatId) {
      await ctx.reply("Usage: /activate -100123456789");
      return;
    }
    const existing = await getCommunity(chatId);
    if (!existing) {
      await ctx.reply(`No community found with chatId: ${chatId}

Run /communities to see all registered communities.`);
      return;
    }
    await activateCommunity(chatId);
    await ctx.reply(`Community "${existing.displayName}" (${chatId}) activated.`);
  });
  bot.command("deactivate", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    const chatId = (ctx.match || "").trim();
    if (!chatId) {
      await ctx.reply("Usage: /deactivate -100123456789");
      return;
    }
    const existing = await getCommunity(chatId);
    if (!existing) {
      await ctx.reply(`No community found with chatId: ${chatId}`);
      return;
    }
    await deactivateCommunity(chatId);
    await ctx.reply(`Community "${existing.displayName}" (${chatId}) downgraded to free tier.`);
  });
  bot.command("makefree", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    const chatId = (ctx.match || "").trim();
    if (!chatId) {
      await ctx.reply(
        "Usage: /makefree -100123456789\n\nGrants this community full access at no cost (Complimentary tier).\nUse /activate for paid communities, /makefree for gifted ones.\nGet chat IDs with /communities"
      );
      return;
    }
    const existing = await getCommunity(chatId);
    if (!existing) {
      await ctx.reply(`No community found with chatId: ${chatId}

Use /communities to list all groups.`);
      return;
    }
    if (existing.status === "complimentary") {
      await ctx.reply(`"${existing.displayName}" is already on the Complimentary tier.`);
      return;
    }
    await makeComplimentary(chatId);
    await ctx.reply(
      `\u2705 "${existing.displayName}" (${chatId}) set to COMPLIMENTARY.

Full access granted \u2014 no payment required.
To revert: /deactivate ${chatId}`
    );
  });
  bot.command("extendtrial", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    const parts = (ctx.match || "").trim().split(/\s+/);
    const chatId = parts[0];
    const days = parseInt(parts[1] || "7");
    if (!chatId || isNaN(days) || days < 1) {
      await ctx.reply("Usage: /extendtrial -100123456789 7");
      return;
    }
    const existing = await getCommunity(chatId);
    if (!existing) {
      await ctx.reply(`No community found with chatId: ${chatId}`);
      return;
    }
    const baseDate = existing.trialExpiresAt && existing.trialExpiresAt > /* @__PURE__ */ new Date() ? existing.trialExpiresAt : /* @__PURE__ */ new Date();
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1e3);
    await updateCommunity(chatId, { status: "trial", trialExpiresAt: newExpiry });
    communityCache.delete(chatId);
    if (botInstance) {
      try {
        await botInstance.api.sendMessage(parseInt(chatId), `Your The Warden trial has been extended by ${days} days! New expiry: ${newExpiry.toDateString()}.`);
      } catch {
      }
    }
    await ctx.reply(`Trial extended for "${existing.displayName}" (${chatId}) by ${days} days.
New expiry: ${newExpiry.toDateString()}`);
  });
  bot.command("communityinfo", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    const chatId = (ctx.match || "").trim();
    if (!chatId) {
      await ctx.reply("Usage: /communityinfo -100123456789");
      return;
    }
    const community = await getCommunity(chatId);
    if (!community) {
      await ctx.reply(`No community found with chatId: ${chatId}`);
      return;
    }
    const feats = await getFeatureSettings(chatId);
    const enabledCount = Object.values(feats).filter(Boolean).length;
    await ctx.reply(
      `COMMUNITY DETAILS

Chat ID: ${community.chatId}
Name: ${community.displayName}
Bot Nickname: ${community.botNickname}
Timezone: ${community.timezone}
Welcome Message: ${community.welcomeMessage || "Default"}
Status: ${getStatusLabel(community)}
Trial Expires: ${community.trialExpiresAt ? community.trialExpiresAt.toDateString() : "N/A"}
Onboarded: ${community.isOnboarded ? "Yes" : "No"}
Active Features: ${enabledCount}/20`
    );
  });
  bot.command("leavegroup", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    const chatId = (ctx.match || "").trim();
    if (!chatId) {
      await ctx.reply("Usage: /leavegroup -100123456789\n\nGet chat IDs with /communities");
      return;
    }
    const existing = await getCommunity(chatId);
    try {
      if (botInstance) {
        try {
          await botInstance.api.sendMessage(
            parseInt(chatId),
            `The Warden is leaving this group by owner request. Goodbye! \u{1F44B}`
          );
        } catch {
        }
        await botInstance.api.leaveChat(parseInt(chatId));
      }
      if (existing) {
        await updateCommunity(chatId, { status: "banned" });
        communityCache.delete(chatId);
      }
      await ctx.reply(`\u2705 Bot has left group: ${existing?.displayName || chatId} (${chatId})`);
    } catch (err) {
      console.error("Error leaving group:", err);
      await ctx.reply(`Failed to leave group ${chatId}. The bot may have already left, or the chat ID is wrong.`);
    }
  });
  bot.command("setadmin", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    const parts = (ctx.match || "").trim().split(/\s+/);
    const chatId = parts[0];
    const userId = parts[1];
    if (!chatId || !userId) {
      await ctx.reply("Usage: /setadmin -100123456789 123456789\n\nGet chat IDs with /communities");
      return;
    }
    const existing = await getCommunity(chatId);
    if (!existing) {
      await ctx.reply(`No community found with chatId: ${chatId}

Use /communities to list all groups.`);
      return;
    }
    const currentList = existing.botAdminIds || [];
    if (currentList.includes(userId)) {
      await ctx.reply(`User ${userId} is already a bot admin in "${existing.displayName}".`);
      return;
    }
    await updateCommunity(chatId, { botAdminIds: [...currentList, userId] });
    communityCache.delete(chatId);
    if (botInstance) {
      try {
        await botInstance.api.sendMessage(parseInt(chatId), `User ID ${userId} has been added as a the Warden admin for this community by the owner.`);
      } catch {
      }
    }
    await ctx.reply(`\u2705 User ${userId} added as bot admin in "${existing.displayName}" (${chatId})`);
  });
  bot.command("ownerhelp", async (ctx) => {
    if (!ctx.from) return;
    if (!isGlobalOwner(ctx)) {
      await ctx.reply("Owner-only command.");
      return;
    }
    await ctx.reply(
      `THE WARDEN \u2014 GLOBAL OWNER COMMANDS
All commands work in DMs with the bot.

\u2501\u2501 COMMUNITY LIST \u2501\u2501
/communities \u2014 List all registered groups
/communityinfo [chatId] \u2014 Full details for one group

\u2501\u2501 SUBSCRIPTION CONTROL \u2501\u2501
/activate [chatId] \u2014 Mark as PAID \u2014 full access (they've paid)
/makefree [chatId] \u2014 Mark as COMPLIMENTARY \u2014 full access (your gift, no payment)
/deactivate [chatId] \u2014 Downgrade to free tier (basic safety only)
/extendtrial [chatId] [days] \u2014 Extend a trial period
/bangroup [chatId] \u2014 Silence bot in a group (stays but ignores everything)
/leavegroup [chatId] \u2014 Remove bot from a group entirely

Tiers: ACTIVE (paid) \xB7 COMPLIMENTARY (gifted) \xB7 TRIAL \xB7 FREE (limited) \xB7 BANNED

\u2501\u2501 ADMIN MANAGEMENT \u2501\u2501
/setadmin [chatId] [userId] \u2014 Add a bot admin to any group
/removeadmin [chatId] [userId] \u2014 Remove a bot admin from any group
/changeadmin [chatId] [userId] \u2014 Replace ALL bot admins with one new person
/listadmins [chatId] \u2014 View bot admins for any group

In-group (reply-based): /addadmin \xB7 /removeadmin \xB7 /changeadmin \xB7 /listadmins

\u2501\u2501 TRUST & MODERATION \u2501\u2501
/trustset @user full|trusted|normal|restricted \u2014 Set community trust (Boss/TreeFitty only)
/trustremove @user \u2014 Remove trust from a user
/violations \u2014 View violation log
/banlist \u2014 View ban/kick history

To get a group's chatId, use /communities first.`
    );
  });
  bot.on("edited_message:text", async (ctx) => {
    if (!ctx.editedMessage || !ctx.editedMessage.from || !ctx.editedMessage.chat) return;
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
    if (chatId > 0) return;
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (member.status === "administrator" || member.status === "creator") return;
    } catch {
    }
    const _editTrust = await getCommunityTrustClass(userIdStr, chatIdStr);
    if (_editTrust === "full") return;
    const userIsNew = await isNewUser(chatIdStr, userIdStr);
    const originalRecord = await getTrackedMessage(messageId, chatIdStr);
    const originalContent = originalRecord?.originalContent || void 0;
    const lowerText = newText.toLowerCase();
    const { isScam, flags } = detectScam(newText, username);
    const hasLink = /https?:\/\/|t\.me\/|@\w+/i.test(newText);
    const hasSeedPhrase = detectSeedPhrase(newText);
    const drainerPhrases = ["verify wallet", "sync wallet", "connect wallet urgently", "wallet validation", "claim airdrop"];
    const hasWalletDrainer = drainerPhrases.some((phrase) => lowerText.includes(phrase));
    const hasContractAddress = containsCryptoAddress(newText) || containsAdminOnlyWord(newText) || _editTrust !== "trusted" && containsMarketingPitch(newText);
    let shouldDelete = false;
    let violationType = "";
    let actionTaken = "";
    if (isScam && flags.length >= 2) {
      shouldDelete = true;
      violationType = "edit_scam";
      actionTaken = "deleted";
    } else if (_editTrust !== "trusted" && hasUnapprovedLink(newText, ctx.editedMessage.entities)) {
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
        await logViolation(chatIdStr, userIdStr, username, violationType, originalContent, newText, actionTaken);
        await incrementModStat(chatIdStr, "scamsBlocked");
        await ctx.api.sendMessage(
          chatId,
          `Caught that edit! Nobody sneaks scam content in by editing old messages.

@${username || ctx.editedMessage.from.first_name || "User"}, your edited message was removed. Nice try, but The Warden's watching.`
        );
        console.log(`Blocked suspicious edit from new user ${username || userId}: ${violationType}`);
      } catch (e) {
        console.log("Couldn't delete suspicious edit:", e);
      }
    }
  });
  bot.on("edited_message:caption", async (ctx) => {
    if (!ctx.editedMessage || !ctx.editedMessage.from || !ctx.editedMessage.chat) return;
    const chatId = ctx.editedMessage.chat.id;
    const chatIdStr = String(chatId);
    const userId = ctx.editedMessage.from.id;
    const userIdStr = String(userId);
    const caption = ctx.editedMessage.caption || "";
    const username = ctx.editedMessage.from.username || "";
    if (chatId > 0) return;
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (member.status === "administrator" || member.status === "creator") return;
    } catch {
    }
    const _editTrust = await getCommunityTrustClass(userIdStr, chatIdStr);
    if (_editTrust === "full") return;
    const userIsNew = await isNewUser(chatIdStr, userIdStr);
    const lowerCaption = caption.toLowerCase();
    const { isScam, flags } = detectScam(caption, username);
    const hasLink = /https?:\/\/|t\.me\/|@\w+/i.test(caption);
    const hasWalletDrainer = ["verify wallet", "sync wallet", "connect wallet urgently"].some((p) => lowerCaption.includes(p));
    const hasContractAddress = containsCryptoAddress(caption) || containsAdminOnlyWord(caption) || _editTrust !== "trusted" && containsMarketingPitch(caption);
    let shouldDelete = false;
    let violationType = "";
    if (isScam && flags.length >= 2 || _editTrust !== "trusted" && hasUnapprovedLink(caption, ctx.editedMessage.caption_entities) || hasWalletDrainer || hasContractAddress) {
      shouldDelete = true;
      violationType = "edit_caption";
    }
    if (shouldDelete) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.editedMessage.message_id);
        await logViolation(chatIdStr, userIdStr, username, violationType, void 0, caption, "deleted");
        await incrementModStat(chatIdStr, "scamsBlocked");
        await ctx.api.sendMessage(
          chatId,
          `Caught that caption edit! Nobody sneaks scam content in by editing captions.
@${username || ctx.editedMessage.from.first_name || "User"}, nice try but The Warden's watching.`
        );
      } catch (e) {
        console.log("Couldn't delete suspicious caption edit:", e);
      }
    }
  });
  bot.on("message:new_chat_members", async (ctx) => {
    for (const member of ctx.message.new_chat_members) {
      const name = member.first_name || "friend";
      const username = member.username || "";
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
      const chatId = ctx.chat.id;
      const chatIdStr = chatId.toString();
      const newMemberId = member.id.toString();
      if (!member.is_bot) {
        try {
          await ctx.reply(`${memberLabel(member)} \u2014 saw you come through. Welcome. I'm the Warden. Give me a moment to check the gate log; I don't leave new arrivals standing around.`);
        } catch {
        }
      }
      const launchRole = staticRoleForUserId(member.id);
      const priorTrustRows = member.is_bot ? [] : await db.select().from(trustScores).where(and(eq2(trustScores.telegramUserId, newMemberId), eq2(trustScores.chatId, chatIdStr))).limit(1);
      const isFirstCommunityJoin = priorTrustRows.length === 0;
      if (!member.is_bot && isFirstCommunityJoin) {
        await ensureTrustRecord(newMemberId, chatIdStr, username, member.first_name || name);
      }
      const vipInvited = !member.is_bot && Boolean(await stateGet(`w:vipjoin:${chatIdStr}:${newMemberId}`, false));
      const launchTrusted = launchRole === "boss" || launchRole === "community_leader" || launchRole === "trusted_mod" || vipInvited;
      const _earlyFeats = await getFeatureSettings(chatIdStr);
      if (member.is_bot && member.id !== ctx.me.id) {
        const addedByOwner = canManageExtraBots(ctx);
        const adderName = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "someone";
        try {
          if (addedByOwner) {
            await ctx.reply(
              `Authorised bot added by ${adderName}: @${username || member.id}

Left in place. Recorded.`
            );
            await logViolation(
              chatIdStr,
              newMemberId,
              username,
              "bot_added_by_owner",
              username,
              "Added by Boss/Community Leader \u2014 permitted",
              "allow"
            );
          } else {
            await ctx.api.banChatMember(chatId, member.id);
            const nameRisk = isSuspiciousBotName(username);
            const admins = await ctx.api.getChatAdministrators(chatId);
            const mentions = admins.filter((a) => !a.user.is_bot && a.user.username).slice(0, 3).map((a) => `@${a.user.username}`).join(" ");
            await ctx.reply(
              `Removed a bot ${mentions}

Bot: @${username || member.id}
Added by: ${adderName}
REASON: only @aussieboomer or @TreeFitty may add bots to this group.` + (nameRisk ? `
Also flagged: ${nameRisk}` : ``) + `

A bot in here can read every message and post to everyone. If this one was wanted, @aussieboomer or @TreeFitty can add it.`
            );
            await logViolation(
              chatIdStr,
              newMemberId,
              username,
              "unauthorised_bot",
              `Added by ${adderName} (${ctx.from?.id})`,
              nameRisk || "Bot added by someone other than Boss/Community Leader",
              "ban"
            );
            await incrementModStat(chatIdStr, "scamsBlocked");
          }
        } catch {
          try {
            await ctx.reply(
              `A bot was added and I couldn't remove it: @${username || member.id}

Added by: ${adderName}

I need ban permission to enforce this. Remove the bot manually and check my admin rights.`
            );
          } catch {
          }
        }
        continue;
      }
      if (_earlyFeats.crossBan && !member.is_bot && await isGloballyBanned(newMemberId)) {
        try {
          await ctx.api.banChatMember(chatId, member.id);
          await ctx.reply(
            `${fullName || name} was removed on arrival \u2014 they are banned in another community I manage.`
          );
          await logViolation(
            chatIdStr,
            newMemberId,
            username || fullName,
            "global_ban",
            "",
            "Previously banned in another managed group",
            "ban"
          );
          await incrementModStat(chatIdStr, "scamsBlocked");
        } catch {
        }
        continue;
      }
      if (_earlyFeats.accountAge && !member.is_bot && !launchTrusted && isNewAccountHeuristic(member.id)) {
        try {
          await ctx.api.banChatMember(chatId, member.id);
          await ctx.api.unbanChatMember(chatId, member.id);
          await ctx.reply(
            `${fullName || name} was removed \u2014 their Telegram account appears to have been created very recently.

To protect this community, brand-new accounts cannot join immediately. Please try again in a few days.`
          );
          await logViolation(chatIdStr, newMemberId, username || fullName, "account_age", "High user ID heuristic", "Account created very recently", "kick");
        } catch (e) {
          console.log("[AccountAge] Couldn't kick new account:", e);
        }
        continue;
      }
      const _raidFeats = await getFeatureSettings(chatIdStr);
      if (!_raidFeats.raid || launchTrusted) {
      } else {
        const raidCheck = await trackJoinForRaid(chatIdStr, newMemberId);
        if (raidCheck.isRaid) {
          if (raidCheck.joinCount === RAID_THRESHOLD) {
            try {
              const admins = await ctx.api.getChatAdministrators(chatId);
              const adminMentions = admins.filter((a) => !a.user.is_bot).slice(0, 3).map((a) => a.user.username ? `@${a.user.username}` : a.user.first_name).join(", ");
              await ctx.reply(
                `RAID ALERT ${adminMentions}

${raidCheck.joinCount} users joined in the last 2 minutes!

LOCKDOWN MODE ACTIVATED - New users are restricted for 5 minutes.
Use /unlock to end lockdown early.`,
                { parse_mode: "Markdown" }
              );
            } catch (e) {
              console.log("Couldn't send raid alert:", e);
            }
          }
          try {
            const lockInfo = await stateGet(KEYS.lockdown(chatIdStr), null);
            if (lockInfo) {
              const untilDate = Math.floor(lockInfo.until / 1e3);
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
              console.log(`Restricted user ${username || newMemberId} during raid lockdown`);
            }
          } catch (e) {
            console.log("Couldn't restrict user during lockdown:", e);
          }
        }
      }
      if (_raidFeats.raid && !launchTrusted && await isInLockdown(chatIdStr)) {
        try {
          const lockInfo = await stateGet(KEYS.lockdown(chatIdStr), null);
          if (lockInfo) {
            const untilDate = Math.floor(lockInfo.until / 1e3);
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
            const joins = await stateGet(KEYS.joins(chatIdStr), []);
            if (joins.length % 5 === 0) {
              const remainingMs = lockInfo.until - Date.now();
              const remainingMin = Math.max(1, Math.ceil(remainingMs / 6e4));
              await ctx.reply(
                `RAID LOCKDOWN WARNING

User: ${username ? `@${username}` : fullName}
REASON: Chat is in lockdown mode due to suspected raid

ACTION: Temporarily restricted for ${remainingMin} minute${remainingMin > 1 ? "s" : ""}
You'll be able to chat once lockdown ends.`
              );
            }
            await logViolation(chatIdStr, newMemberId, username || fullName, "raid_lockdown", "Joined during raid", "Restricted during lockdown", "restrict");
          }
        } catch (e) {
          console.log("Couldn't restrict user during active lockdown:", e);
        }
      }
      if (_raidFeats.impersonation && username && !launchTrusted) {
        try {
          const cached = adminCache.get(chatIdStr);
          let adminUsernames = [];
          if (!cached || Date.now() - cached.lastUpdated > ADMIN_CACHE_TTL) {
            const admins = await ctx.api.getChatAdministrators(chatId);
            adminUsernames = admins.filter((a) => !a.user.is_bot && a.user.username).map((a) => a.user.username);
            adminCache.set(chatIdStr, { usernames: adminUsernames, lastUpdated: Date.now() });
          } else {
            adminUsernames = cached.usernames;
          }
          const impersonationCheck = checkAdminImpersonation(username, adminUsernames);
          if (impersonationCheck.isImpersonation) {
            const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, member.id, true);
            const adminMentions = adminUsernames.slice(0, 3).map((u) => `@${u}`).join(", ");
            const reason = `Username similar to admin @${impersonationCheck.similarTo} (${Math.round(impersonationCheck.similarity * 100)}% match)`;
            if (shouldBan) {
              await ctx.api.banChatMember(chatId, member.id);
              const banMessage = formatWarning({
                type: "impersonation",
                username: `@${username}`,
                offenseCount,
                reason,
                action: "PERMANENTLY BANNED"
              });
              await ctx.reply(`${adminMentions}

${banMessage}

Potential scammer removed from community.`);
              await logViolation(chatIdStr, newMemberId, username, "impersonation", username, reason, "ban");
            } else {
              const untilDate = Math.floor(Date.now() / 1e3) + muteSeconds;
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
              await ctx.reply(`${adminMentions}

${warningMessage}

This could be a scammer!`);
              await logViolation(chatIdStr, newMemberId, username, "impersonation", username, reason, "mute");
            }
            await incrementModStat(chatIdStr, "scamsBlocked");
          }
        } catch (e) {
          console.log("Couldn't check impersonation:", e);
        }
      }
      try {
        const existingProfile = await db.select().from(communityProfiles).where(and(
          eq2(communityProfiles.telegramUserId, newMemberId),
          eq2(communityProfiles.chatId, chatIdStr)
        )).limit(1);
        if (existingProfile.length === 0) {
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
      const contractAddressPattern = /0x[a-fA-F0-9]{8,40}/i;
      const checkStrings = [username, fullName, member.first_name || "", member.last_name || ""];
      const hasContractAddress = checkStrings.some((str) => contractAddressPattern.test(str));
      if (hasContractAddress && !launchTrusted) {
        try {
          await ctx.api.banChatMember(chatId, member.id);
          await ctx.api.unbanChatMember(chatId, member.id);
          const admins = await ctx.api.getChatAdministrators(chatId);
          const adminMentions = admins.filter((a) => !a.user.is_bot).slice(0, 3).map((a) => a.user.username ? `@${a.user.username}` : a.user.first_name).join(", ");
          await ctx.reply(
            `\u{1F6AB} *BLOCKED* ${adminMentions}

User with contract address in name was removed:
Name: ${fullName}
Username: @${username || "none"}

The Warden doesn't play with scammers!`,
            { parse_mode: "Markdown" }
          );
          await incrementModStat(chatIdStr, "scamsBlocked");
          continue;
        } catch (kickErr) {
          console.log("Couldn't kick user with contract address:", kickErr);
          await ctx.reply(`\u26A0\uFE0F Warning: User @${username || name} has a contract address in their name. Admins please verify!`);
        }
      }
      const { isScam, flags } = detectScam("", username);
      if (isScam) {
        await ctx.reply(`Warning: New member @${username} has suspicious indicators:
${flags.join("\n")}

Admins, please verify!`);
      }
      const nameCheckTexts = [fullName, username].filter(Boolean).join(" ");
      const _bioJoinFeats = await getFeatureSettings(chatIdStr);
      if (_bioJoinFeats.bioScan && !launchTrusted) {
        try {
          const userChat = await ctx.api.getChat(member.id);
          const bio = userChat.bio || "";
          if (bio) {
            const bioLower = bio.toLowerCase();
            const bioHit = BIO_SCAM_PHRASES.find((phrase) => bioLower.includes(phrase));
            const bioHasWallet = /0x[a-fA-F0-9]{8,}/i.test(bio) || /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/.test(bio);
            if (bioHit || bioHasWallet) {
              await ctx.api.banChatMember(chatId, member.id);
              const reason = bioHit ? `Bio contains scam phrase: "${bioHit}"` : "Bio contains crypto wallet address";
              await ctx.reply(`${fullName || name} was removed at join \u2014 bio scan flagged scam content.
REASON: ${reason}`);
              await logViolation(chatIdStr, newMemberId, username || fullName, "bio_scan", bio.slice(0, 200), reason, "ban");
              await incrementModStat(chatIdStr, "scamsBlocked");
              continue;
            }
          }
        } catch {
        }
      }
      await ensureUserModerationStatus(newMemberId, chatIdStr);
      await incrementModStat(chatIdStr, "newJoins");
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
          }, { until_date: Math.floor(Date.now() / 1e3) + 600 });
          await stateSet(KEYS.captcha(chatId, member.id), { chatId, userId: member.id, timestamp: Date.now(), firstTime: isFirstCommunityJoin, username, firstName: member.first_name || name }, TTL.captcha);
          await ctx.reply(
            `Welcome ${name}! One quick step before you can chat:

Tap the button below to confirm you're a real person. You have 10 minutes \u2014 unverified accounts are automatically removed.`,
            {
              reply_markup: {
                inline_keyboard: [[
                  { text: "\u2705 I'm a real person \u2014 let me in!", callback_data: `captcha:${chatId}:${member.id}` }
                ]]
              }
            }
          );
          continue;
        } catch {
        }
      }
      const communityData = await getCommunity(chatIdStr);
      const botName = communityData?.botNickname || "The Warden";
      const label = memberLabel(member);
      let welcome;
      if (isFirstCommunityJoin) {
        welcome = buildFirstWelcome(label, botName);
      } else if (communityData?.welcomeMessage) {
        welcome = communityData.welcomeMessage.replace(/\{name\}/gi, label) + WELCOME_SAFETY;
      } else {
        welcome = `${label}, welcome back. Gate remembers you. Ask me what changed, or tag @${BOT_USERNAME2} and carry on where you left off.${WELCOME_SAFETY}`;
      }
      await wardenReply(ctx, welcome);
    }
  });
  bot.callbackQuery(/^captcha:/, async (ctx) => {
    const data = ctx.callbackQuery.data || "";
    const parts = data.split(":");
    if (parts.length !== 3) {
      await ctx.answerCallbackQuery();
      return;
    }
    const [, chatIdStr, userIdStr] = parts;
    const chatId = parseInt(chatIdStr);
    const userId = parseInt(userIdStr);
    if (ctx.from.id !== userId) {
      await ctx.answerCallbackQuery({ text: "This verification button isn't for you!", show_alert: true });
      return;
    }
    const pendingKey = KEYS.captcha(chatId, userId);
    const pendingEntry = await stateGet(pendingKey, null);
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
      await ctx.answerCallbackQuery({ text: "\u2705 Verified! You can now chat. Welcome!", show_alert: false });
      try {
        await ctx.editMessageText(
          `\u2705 ${ctx.from.first_name} passed verification and is now a full member. Welcome!`,
          { reply_markup: { inline_keyboard: [] } }
        );
      } catch {
      }
      if (pendingEntry.firstTime) {
        const communityData = await getCommunity(String(chatId));
        const botName = communityData?.botNickname || "The Warden";
        await ctx.api.sendMessage(chatId, buildFirstWelcome(memberLabel(ctx.from), botName));
      } else {
        await ctx.api.sendMessage(chatId, `${memberLabel(ctx.from)}, verified. Welcome back through the Gateway.`);
      }
    } catch {
      await ctx.answerCallbackQuery({ text: "Verification failed \u2014 please ask an admin to restore your permissions.", show_alert: true });
    }
  });
  bot.on("chat_member", async (ctx, next) => {
    try {
      const u = ctx.chatMember;
      const link = u?.invite_link;
      if (u && link && /^trusted/i.test(link.name || "") && !u.new_chat_member.user.is_bot) {
        const joined = u.new_chat_member.status === "member" && (u.old_chat_member.status === "left" || u.old_chat_member.status === "kicked");
        if (joined) {
          const chatId = ctx.chat.id, chatIdStr = String(chatId);
          const member = u.new_chat_member.user, memberId = String(member.id);
          const creatorId = link.creator?.id;
          let creatorOk = false;
          if (creatorId && staticRoleForUserId(creatorId) === "boss") creatorOk = true;
          if (creatorOk) {
            await ensureTrustRecord(memberId, chatIdStr, member.username, member.first_name);
            await db.update(trustScores).set({
              trustStatus: "vouched",
              isTrusted: true,
              trustLevel: 2,
              isEligible: true,
              vouchedBy: String(creatorId),
              vouchedAt: /* @__PURE__ */ new Date()
            }).where(and(eq2(trustScores.telegramUserId, memberId), eq2(trustScores.chatId, chatIdStr)));
            await stateSet(`w:vipjoin:${chatIdStr}:${memberId}`, true, 15 * 60);
            const pending = await stateGet(KEYS.captcha(chatId, member.id), null);
            if (pending) {
              await stateDel(KEYS.captcha(chatId, member.id));
              try {
                await ctx.api.restrictChatMember(chatId, member.id, {
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
              } catch {
              }
            }
            await logViolation(chatIdStr, memberId, member.username || "", "trusted_invite", link.name || "", "Joined via trusted invite link; vouched", "allow");
          }
        }
      }
    } catch (e) {
      console.log("Trusted invite handling failed:", e);
    }
    await next();
  });
  bot.on("chat_member", async (ctx) => {
    const update = ctx.chatMember;
    if (!update) return;
    const chatId = ctx.chat.id;
    const chatIdStr = chatId.toString();
    const newMember = update.new_chat_member;
    const oldMember = update.old_chat_member;
    const joinedNow = (newMember.status === "member" || newMember.status === "administrator") && (oldMember.status === "left" || oldMember.status === "kicked");
    const removedNow = (newMember.status === "left" || newMember.status === "kicked") && (oldMember.status === "member" || oldMember.status === "administrator");
    const user = newMember.user;
    if (!user.is_bot || user.id === ctx.me.id) return;
    if (removedNow) {
      if (!canManageExtraBots(ctx)) {
        const actor = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || String(ctx.from?.id || "unknown");
        await ctx.api.sendMessage(chatId, `BOT AUTHORITY ALERT

${actor} removed @${user.username || user.id}. Only @aussieboomer and @TreeFitty are authorised to add or remove extra bots. I cannot re-add a bot Telegram has kicked, so one of them should review this.`).catch(() => {
        });
        await logViolation(chatIdStr, String(user.id), user.username || "", "unauthorised_bot_removal", `Removed by ${actor}`, "Only Boss/Community Leader may remove bots", "alert");
      }
      return;
    }
    if (!joinedNow) return;
    const addedByOwner = canManageExtraBots(ctx);
    if (addedByOwner) {
      await logViolation(
        chatIdStr,
        String(user.id),
        user.username || "",
        "bot_added_by_owner",
        user.username || "",
        "Added by Boss/Community Leader \u2014 permitted",
        "allow"
      );
      return;
    }
    const adderName = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "someone";
    try {
      await ctx.api.banChatMember(chatId, user.id);
      const admins = await ctx.api.getChatAdministrators(chatId);
      const mentions = admins.filter((a) => !a.user.is_bot && a.user.username).slice(0, 3).map((a) => `@${a.user.username}`).join(" ");
      await ctx.api.sendMessage(
        chatId,
        `Removed a bot ${mentions}

Bot: @${user.username || user.id}
Added by: ${adderName}
REASON: only @aussieboomer or @TreeFitty may add bots to this group.`
      );
      await logViolation(
        chatIdStr,
        String(user.id),
        user.username || "",
        "unauthorised_bot",
        `Added by ${adderName} (${ctx.from?.id})`,
        "Bot added by someone other than Boss/Community Leader",
        "ban"
      );
      await incrementModStat(chatIdStr, "scamsBlocked");
    } catch {
      try {
        await ctx.api.sendMessage(
          chatId,
          `A bot was added and I couldn't remove it: @${user.username || user.id}

Added by: ${adderName}

I need ban permission to enforce this.`
        );
      } catch {
      }
    }
  });
  bot.callbackQuery(/^feedback:(up|down):(\d+)$/, async (ctx) => {
    const match = ctx.callbackQuery.data.match(/^feedback:(up|down):(\d+)$/);
    if (!match) return;
    const feedbackType = match[1];
    const interactionId = parseInt(match[2]);
    const userId = ctx.from.id.toString();
    const _feedbackChatId = ctx.chat?.id?.toString();
    if (_feedbackChatId) {
      const _learningFeats = await getFeatureSettings(_feedbackChatId);
      if (!_learningFeats.learning) {
        await ctx.answerCallbackQuery({ text: "Thanks for the feedback!" });
        return;
      }
    }
    const isPositive = feedbackType === "up";
    const success = await BotMemory.learnFromFeedback(interactionId, userId, isPositive);
    if (success) {
      const message = isPositive ? "Thanks! I'll remember that worked well!" : "Got it! I'll try to do better next time!";
      await ctx.answerCallbackQuery({ text: message });
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: void 0 });
      } catch {
      }
    } else {
      await ctx.answerCallbackQuery({ text: "Oops, couldn't save that feedback!" });
    }
  });
  const NEW_MEMBER_MEDIA_HOURS = 1;
  bot.on(["message:photo", "message:video", "message:animation", "message:video_note"], async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const from = ctx.from;
    if (!chatId || chatId >= 0 || !from || from.is_bot) {
      await next();
      return;
    }
    const chatIdStr = String(chatId), userIdStr = String(from.id);
    try {
      const trust = await getCommunityTrustClass(userIdStr, chatIdStr);
      if (trust === "full" || trust === "trusted") {
        await next();
        return;
      }
      if (await isUserAdmin(ctx, from.id)) {
        await next();
        return;
      }
      await ensureUserModerationStatus(userIdStr, chatIdStr);
      const status = await getUserModerationStatus(userIdStr, chatIdStr);
      const joined = status?.joinDate ? new Date(status.joinDate).getTime() : Date.now();
      const hours = (Date.now() - joined) / (1e3 * 60 * 60);
      if (hours >= NEW_MEMBER_MEDIA_HOURS || status?.role !== "newbie") {
        await next();
        return;
      }
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
      } catch {
      }
      await incrementModStat(chatIdStr, "messagesBlocked");
      const noticeKey = `w:medianotice:${chatIdStr}:${userIdStr}`;
      if (!await stateGet(noticeKey, false)) {
        await stateSet(noticeKey, true, 60 * 60);
        const who = from.username ? `@${from.username}` : from.first_name || "friend";
        await ctx.api.sendMessage(chatId, `${who}, pictures and video open up an hour after you join. Words are fine until then. Welcome in.`);
      }
      return;
    } catch (e) {
      console.log("New-member media check failed:", e);
      await next();
    }
  });
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
    if (communityTrust === "full") {
      await next();
      return;
    }
    if (await holdCryptoAddress(ctx, caption, ctx.message.message_id)) return;
    if (await holdAdminOnlyWord(ctx, caption, ctx.message.message_id)) return;
    if (communityTrust !== "trusted" && await holdMarketingPitch(ctx, caption, ctx.message.message_id)) return;
    if (communityTrust === "trusted") {
      if (await enforceTrustedLinkContractRules(ctx, caption)) return;
      await next();
      return;
    }
    const userIsAdmin = await isUserAdmin(ctx, ctx.from.id);
    if (userIsAdmin) {
      await next();
      return;
    }
    const settings = await getChatSettings(chatIdStr);
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = caption.match(urlRegex) || [];
    if (urls.length > 0) {
      await ensureUserModerationStatus(userIdStr, chatIdStr);
      const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
      const userJoinDate2 = userStatus?.joinDate || /* @__PURE__ */ new Date();
      const hoursInChat = (Date.now() - new Date(userJoinDate2).getTime()) / (1e3 * 60 * 60);
      const linkHoursLimit = settings.raidMode ? 48 : settings.newUserLinkHours;
      if (true) {
        const allLinksAllowed = urls.every(
          (url) => isAllowedUrl(url)
        );
        if (!allLinksAllowed) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, "linksBlocked");
            await ctx.reply(`Only trusted members can post links, including in captions.`);
          } catch (e) {
            console.log("Couldn't delete media with link caption from new user");
          }
          return;
        }
      }
    }
    const userJoinDate = (await getUserModerationStatus(userIdStr, chatIdStr))?.joinDate || /* @__PURE__ */ new Date();
    const accountAgeDays = (Date.now() - new Date(userJoinDate).getTime()) / (1e3 * 60 * 60 * 24);
    const riskScore = calculateRiskScore(caption, username, accountAgeDays);
    const highRiskThreshold = settings.raidMode ? 40 : 60;
    const mediumRiskThreshold = settings.raidMode ? 25 : 40;
    if (riskScore >= highRiskThreshold) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
        await incrementModStat(chatIdStr, "scamsBlocked");
        await db.update(userModerationStatus).set({
          riskScore,
          isQuarantined: true,
          quarantineReason: `High risk caption: ${riskScore}`
        }).where(and(
          eq2(userModerationStatus.telegramUserId, userIdStr),
          eq2(userModerationStatus.chatId, chatIdStr)
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
    const { isScam, flags } = detectScam(caption, username);
    if (isScam) {
      await ctx.reply(
        `Suspicious media detected!

Flags:
${flags.join("\n")}

Admins, please review!`,
        { reply_parameters: { message_id: ctx.message.message_id } }
      );
    }
    await next();
  });
  const mediaSpamHistory = /* @__PURE__ */ new Map();
  const MEDIA_SPAM_THRESHOLD = 3;
  const MEDIA_WINDOW_MS = 3e4;
  const MEDIA_CLEANUP_INTERVAL = 6e4;
  if (!process.env.VERCEL) setInterval(() => {
    const now = Date.now();
    const entries = Array.from(mediaSpamHistory.entries());
    for (const [key, history] of entries) {
      const filtered = history.filter((h) => now - h.lastTime < MEDIA_WINDOW_MS * 2);
      if (filtered.length === 0) {
        mediaSpamHistory.delete(key);
      } else {
        mediaSpamHistory.set(key, filtered);
      }
    }
  }, MEDIA_CLEANUP_INTERVAL);
  async function checkMediaSpam(ctx, mediaId, mediaType) {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      return false;
    }
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full") return false;
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      return false;
    }
    const key = KEYS.mediaSpam(chatId, userId, mediaType);
    const now = Date.now();
    let history = await stateGet(key, []);
    history = history.filter((h) => now - h.lastTime < MEDIA_WINDOW_MS);
    const existing = history.find((h) => h.mediaId === mediaId);
    if (existing) {
      existing.count++;
      existing.lastTime = now;
      if (existing.count >= MEDIA_SPAM_THRESHOLD) {
        try {
          await ctx.api.deleteMessage(chatId, ctx.message.message_id);
          const chatIdStr = String(chatId);
          await incrementModStat(chatIdStr, "spamBlocked");
          await ctx.reply(`${mediaType} spam detected! Please don't flood the chat.`);
          existing.count = 0;
        } catch (e) {
          console.log(`Couldn't delete ${mediaType} spam`);
        }
        await stateSet(key, history, TTL.mediaSpam);
        return true;
      }
    } else {
      history.push({ mediaId, count: 1, lastTime: now });
    }
    await stateSet(key, history, TTL.mediaSpam);
    return false;
  }
  bot.on("message:sticker", async (ctx, next) => {
    const stickerId = ctx.message.sticker.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, stickerId, "Sticker");
    if (!wasSpam) await next();
  });
  bot.on("message:animation", async (ctx, next) => {
    if (ctx.message.caption) {
      await next();
      return;
    }
    const animationId = ctx.message.animation.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, animationId, "GIF");
    if (!wasSpam) await next();
  });
  bot.on("message:photo", async (ctx, next) => {
    const photos = ctx.message.photo;
    const id = photos[photos.length - 1]?.file_unique_id;
    const wasSpam = id ? await checkMediaSpam(ctx, id, "Photo") : false;
    if (!wasSpam) await next();
  });
  bot.on("message:video", async (ctx, next) => {
    const wasSpam = await checkMediaSpam(ctx, ctx.message.video.file_unique_id, "Video");
    if (!wasSpam) await next();
  });
  bot.on("message:voice", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      await next();
      return;
    }
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") {
      await next();
      return;
    }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    const voiceId = ctx.message.voice.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, voiceId, "Voice");
    if (!wasSpam) await next();
  });
  bot.on("message:video_note", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      await next();
      return;
    }
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") {
      await next();
      return;
    }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    const videoNoteId = ctx.message.video_note.file_unique_id;
    const wasSpam = await checkMediaSpam(ctx, videoNoteId, "Video note");
    if (!wasSpam) await next();
  });
  bot.on("message", async (ctx, next) => {
    const msg = ctx.message;
    const isForwarded = msg?.forward_origin || msg?.forward_from || msg?.forward_from_chat || msg?.forward_sender_name || msg?.forward_date;
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
    if (communityTrust === "full" || communityTrust === "trusted") {
      await next();
      return;
    }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    const userIdStr = String(userId);
    const chatIdStr = String(chatId);
    await ensureUserModerationStatus(userIdStr, chatIdStr);
    const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
    const userJoinDate = userStatus?.joinDate || /* @__PURE__ */ new Date();
    const hoursInChat = (Date.now() - new Date(userJoinDate).getTime()) / (1e3 * 60 * 60);
    const _fwdFeats = await getFeatureSettings(chatIdStr);
    if (_fwdFeats.newuser && hoursInChat < 24 && userStatus?.role === "newbie") {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
        await incrementModStat(chatIdStr, "spamBlocked");
        await ctx.reply("New members can't forward messages during the first 24 hours. This protects our community from spam.");
      } catch (e) {
        console.log("Couldn't delete forwarded message from new user");
      }
      return;
    }
    await next();
  });
  bot.on("message:contact", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || chatId >= 0 || !userId || ctx.from?.is_bot) {
      await next();
      return;
    }
    const communityTrust = await getCommunityTrustClass(String(userId), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") {
      await next();
      return;
    }
    const userIsAdmin = await isUserAdmin(ctx, userId);
    if (userIsAdmin) {
      await next();
      return;
    }
    const userIdStr = String(userId);
    const chatIdStr = String(chatId);
    await ensureUserModerationStatus(userIdStr, chatIdStr);
    const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
    const userJoinDate = userStatus?.joinDate || /* @__PURE__ */ new Date();
    const hoursInChat = (Date.now() - new Date(userJoinDate).getTime()) / (1e3 * 60 * 60);
    const _contactFeats = await getFeatureSettings(chatIdStr);
    if (_contactFeats.newuser && hoursInChat < 48 && userStatus?.role === "newbie") {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
        await incrementModStat(chatIdStr, "scamsBlocked");
        await ctx.reply("Sharing contacts is restricted for new members. This protects our community from scammers impersonating support.");
      } catch (e) {
        console.log("Couldn't delete contact share from new user");
      }
      return;
    }
    await next();
  });
  const DANGEROUS_EXTENSIONS = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".scr",
    ".pif",
    ".msi",
    ".vbs",
    ".vbe",
    ".js",
    ".jse",
    ".ws",
    ".wsf",
    ".wsh",
    ".ps1",
    ".psm1",
    ".psd1",
    ".sh",
    ".bash",
    ".run",
    ".apk",
    ".app",
    ".dmg",
    ".pkg",
    ".deb",
    ".rpm"
  ];
  bot.on("message:document", async (ctx, next) => {
    const fileName = ctx.message.document.file_name?.toLowerCase() || "";
    const chatId = ctx.chat?.id;
    if (!chatId || chatId >= 0 || !ctx.from?.id || ctx.from.is_bot) {
      await next();
      return;
    }
    const communityTrust = await getCommunityTrustClass(String(ctx.from.id), String(chatId));
    if (communityTrust === "full" || communityTrust === "trusted") {
      await next();
      return;
    }
    const userIsAdmin = await isUserAdmin(ctx, ctx.from.id);
    if (userIsAdmin) {
      await next();
      return;
    }
    const _fileFeats = await getFeatureSettings(String(chatId));
    const isDangerous = _fileFeats.files && DANGEROUS_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (isDangerous) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
        const chatIdStr = String(chatId);
        await incrementModStat(chatIdStr, "scamsBlocked");
        await ctx.reply("Executable and script files are not allowed. They can contain malware.");
        await flagForModReview(
          ctx,
          String(ctx.from.id),
          ctx.from.username || "",
          `Attempted to share dangerous file: ${fileName}`,
          80,
          "Dangerous file type blocked"
        );
      } catch (e) {
        console.log("Couldn't delete dangerous file");
      }
      return;
    }
    await next();
  });
  bot.on("message:text", async (ctx, next) => {
    const text2 = ctx.message.text;
    const username = ctx.from?.username;
    const userId = ctx.from?.id.toString() || "unknown";
    const chatId = ctx.chat?.id;
    const communityTrust = chatId && chatId < 0 && ctx.from?.id ? await getCommunityTrustClass(String(ctx.from.id), String(chatId)) : "normal";
    const hasFullCommunityTrust = communityTrust === "full";
    const hasTrustedCommunityTrust = communityTrust === "trusted";
    if (chatId && chatId < 0 && communityTrust !== "full") {
      if (await recheckNameImpersonation(ctx)) return;
      if (await holdHiddenLink(ctx)) return;
      if (await holdCryptoAddress(ctx, text2, ctx.message.message_id)) return;
      if (await holdAdminOnlyWord(ctx, text2, ctx.message.message_id)) return;
      if (communityTrust !== "trusted" && await holdMarketingPitch(ctx, text2, ctx.message.message_id)) return;
      if (communityTrust !== "trusted" && await holdLinkFromUntrusted(ctx)) return;
    }
    ctx.session.lastActivityTime = Date.now();
    if (chatId && chatId < 0) {
      await markChatActivity(chatId);
      await expireTriviaIfDue(chatId, bot);
      await expirePuzzleIfDue(chatId, bot);
      await addActiveChat(chatId);
      if (ctx.from?.id && !ctx.from.is_bot) {
        await maybeSendBirthdayArrivalGreeting(ctx);
      }
      if (ctx.from?.id) {
        await updateAdminActivity(chatId, ctx.from.id, ctx.from.username || "", ctx.from.first_name || "");
      }
      if (ctx.from?.id) {
        updateLeaderboard(chatId, ctx.from.id, ctx.from.username || "", ctx.from.first_name || "Anonymous");
      }
      if (ctx.from?.id && !ctx.from.is_bot && !hasFullCommunityTrust && !hasTrustedCommunityTrust) {
        const chatIdStr = String(chatId);
        const userIdStr = String(ctx.from.id);
        const userIsNew = await isNewUser(chatIdStr, userIdStr);
        if (userIsNew) {
          const hasLinks = /https?:\/\/|t\.me\/|@\w+/i.test(text2);
          await trackNewUserMessage(
            String(ctx.message.message_id),
            chatIdStr,
            userIdStr,
            ctx.from.username,
            text2,
            false,
            // hasMedia
            hasLinks
          );
        }
      }
      const _wChatIdStr = String(chatId);
      const _wizardState = setupWizardState.get(_wChatIdStr);
      if (_wizardState && ctx.from?.id === _wizardState.initiatorId && !ctx.from.is_bot) {
        if (_wizardState.step === 1) {
          const communityName = text2.trim();
          setupWizardState.set(_wChatIdStr, { ..._wizardState, step: 2, displayName: communityName });
          await updateCommunity(_wChatIdStr, { displayName: communityName });
          communityCache.delete(_wChatIdStr);
          await ctx.reply(
            `Great name!

STEP 2 OF 4: What timezone should I use for scheduled posts?

Common options:
\u2022 Australia/Hobart (Tasmania)
\u2022 Australia/Sydney (AEST/AEDT)
\u2022 America/Los_Angeles (Pacific)
\u2022 America/New_York (Eastern)
\u2022 Europe/London (GMT/BST)
\u2022 UTC

Type one of the above, or "skip" to use ${COMMUNITY_TIMEZONE}.`
          );
        } else if (_wizardState.step === 2) {
          let timezone = text2.trim();
          if (timezone.toLowerCase() === "skip") timezone = COMMUNITY_TIMEZONE;
          try {
            Intl.DateTimeFormat(void 0, { timeZone: timezone });
          } catch {
            await ctx.reply(`That doesn't look like a valid timezone. Try again or type 'skip' to use ${COMMUNITY_TIMEZONE}.`);
            return;
          }
          setupWizardState.set(_wChatIdStr, { ..._wizardState, step: 3, timezone });
          await ctx.reply(
            `Timezone set to ${timezone}!

STEP 3 OF 4: Set a custom welcome message for new members.

Use {name} as a placeholder for the new member's name.
Example: Hey {name}! Welcome to our community! Read the pinned messages.

Type your message, or "skip" to use the default welcome rotation.`
          );
        } else if (_wizardState.step === 3) {
          const welcomeMsg = text2.trim().toLowerCase() === "skip" ? null : text2.trim();
          setupWizardState.set(_wChatIdStr, { ..._wizardState, step: 4, welcomeMessage: welcomeMsg });
          const featureList = WIZARD_FEATURE_KEYS.map((k) => `\u2022 ${k}`).join("\n");
          await ctx.reply(
            `Welcome message ${welcomeMsg ? "saved" : "skipped"}!

STEP 4 OF 4: Feature Selection

All 20 features are ON by default. Type the names of any you want to DISABLE (comma-separated), or type "all on" to enable everything.

Available features:
${featureList}

Example: "stories, giveaways, games" or "all on"`
          );
        } else if (_wizardState.step === 4) {
          const displayName = _wizardState.displayName || "Community";
          const timezone = _wizardState.timezone || COMMUNITY_TIMEZONE;
          const welcomeMsg = _wizardState.welcomeMessage ?? null;
          setupWizardState.delete(_wChatIdStr);
          const input = text2.trim().toLowerCase();
          const toDisable = [];
          if (input !== "all on" && input !== "skip") {
            const parts = input.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
            for (const part of parts) {
              const match = WIZARD_FEATURE_KEYS.find((k) => k.toLowerCase() === part);
              if (match) toDisable.push(match);
            }
          }
          if (toDisable.length > 0) {
            for (const feat of toDisable) {
              await updateFeatureSetting(_wChatIdStr, feat, false);
            }
          }
          await updateCommunity(_wChatIdStr, {
            timezone,
            ...welcomeMsg ? { welcomeMessage: welcomeMsg } : {},
            isOnboarded: true,
            onboardingStep: 5
          });
          communityCache.delete(_wChatIdStr);
          const community = await getCommunity(_wChatIdStr);
          const trialExpiry = community?.trialExpiresAt ? community.trialExpiresAt.toDateString() : "7 days from now";
          const disabledNote = toDisable.length > 0 ? `Disabled features: ${toDisable.join(", ")}` : "All 20 features: ON";
          await ctx.reply(
            `SETUP COMPLETE!

Community Name: ${displayName}
Timezone: ${timezone}
Welcome Message: ${welcomeMsg ? "Custom" : "Default rotation"}
${disabledNote}

Your 7-day FREE TRIAL is active until ${trialExpiry}.

After the trial, contact ${OWNER_CONTACT} to continue.

Use /community to view config \xB7 /settings to adjust features \xB7 /toggle [feature] to flip individual ones`
          );
        }
        return;
      }
      if (ctx.from?.id && !ctx.from.is_bot) {
        const userIsAdmin = hasFullCommunityTrust || await isAdmin(ctx);
        const _spamFeats = await getFeatureSettings(String(chatId));
        if (!userIsAdmin && _spamFeats.massMention) {
          const mentionEntities = ctx.message?.entities?.filter(
            (e) => e.type === "mention" || e.type === "text_mention"
          ) || [];
          if (mentionEntities.length >= 5) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              const mentionTarget = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
              await ctx.reply(
                `${mentionTarget} \u2014 mentioning ${mentionEntities.length} people in one message is not allowed.

Mass-mentions are a spam pattern. Please keep it to 1-2 at a time.`
              );
              await logViolation(String(chatId), String(ctx.from.id), ctx.from.username || ctx.from.first_name || "unknown", "mass_mention", text2.slice(0, 200), `${mentionEntities.length} @mentions in one message`, "delete");
            } catch {
            }
            return;
          }
        }
        if (!userIsAdmin && _spamFeats.spam && await isSpam(chatId, ctx.from.id, text2)) {
          const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, ctx.from.id);
          const firstName2 = ctx.from.first_name || "User";
          const uname = ctx.from.username;
          const spamReaction = WARDEN_REACTIONS.spamCaught[Math.floor(Math.random() * WARDEN_REACTIONS.spamCaught.length)];
          const targetName = uname ? `@${uname}` : firstName2;
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            if (shouldBan) {
              await ctx.api.banChatMember(chatId, ctx.from.id);
              const banMessage = formatWarning({
                type: "ban",
                username: targetName,
                offenseCount,
                reason: "Spam detected (repeated flooding/duplicate messages)",
                action: "PERMANENTLY BANNED"
              });
              await ctx.reply(`${spamReaction}

${banMessage}

User has been removed for repeated spam violations.`);
            } else {
              const muteUntil = Math.floor(Date.now() / 1e3) + muteSeconds;
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
              await ctx.reply(`${spamReaction}

${warningMessage}`);
            }
          } catch (error) {
            console.log("Couldn't auto-moderate spam - check bot permissions");
          }
          return;
        }
      }
    }
    if (chatId && chatId < 0 && ctx.from?.id && !ctx.from.is_bot) {
      const chatIdStr = String(chatId);
      const userIdStr = String(ctx.from.id);
      const gameCommands = ["/trivia", "/puzzle", "/guess", "/leaderboard", "/puzzleboard", "/answer"];
      const isGameCommand = gameCommands.some((cmd) => text2.toLowerCase().startsWith(cmd));
      if (hasTrustedCommunityTrust && await enforceTrustedLinkContractRules(ctx, text2)) return;
      const userIsAdminForMod = hasFullCommunityTrust || await isUserAdmin(ctx, ctx.from.id);
      const _earlyMediaFeats = await getFeatureSettings(chatIdStr);
      if (userIsAdminForMod && !hasFullCommunityTrust) {
        const compromise = detectAdminCompromise(text2);
        if (compromise) {
          let deleted = false;
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            deleted = true;
          } catch {
          }
          try {
            const admins = await ctx.api.getChatAdministrators(chatId);
            const mentions = admins.filter((a) => !a.user.is_bot && a.user.username).slice(0, 5).map((a) => `@${a.user.username}`).join(" ");
            const who = username ? `@${username}` : ctx.from.first_name || "an admin";
            await ctx.reply(
              `SECURITY ALERT ${mentions}

${who} \u2014 an admin account \u2014 posted something matching a wallet-drainer pattern.

DETECTED: ${compromise}
MESSAGE: ${deleted ? "removed" : "COULD NOT BE REMOVED \u2014 delete it manually now"}

If that wasn't you, your account is compromised. Right now, in this order:
1. Another admin: remove their admin rights.
2. Owner: terminate their sessions in Telegram settings.
3. Change the password and check for a second logged-in device.

Everyone else: do not click anything posted by this account until an admin says otherwise.`
            );
            await db.update(trustScores).set({ isFrozen: true, frozenAt: /* @__PURE__ */ new Date(), frozenReason: "Possible account compromise" }).where(and(eq2(trustScores.telegramUserId, userIdStr), eq2(trustScores.chatId, chatIdStr)));
            await logViolation(
              chatIdStr,
              userIdStr,
              username || "",
              "admin_compromise",
              text2.slice(0, 200),
              compromise,
              deleted ? "delete+alert" : "alert-only"
            );
            await incrementModStat(chatIdStr, "scamsBlocked");
          } catch {
          }
          return;
        }
      }
      if (!userIsAdminForMod && !isGameCommand) {
        const settings = await getChatSettings(chatIdStr);
        const feats = await getFeatureSettings(chatIdStr);
        if (feats.scam) {
          const verifyHit = detectFakeVerificationBot(text2);
          if (verifyHit) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, "scamsBlocked");
              const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, ctx.from.id);
              if (shouldBan) {
                await ctx.api.banChatMember(chatId, ctx.from.id);
              } else {
                await muteUser(ctx, ctx.from.id, muteSeconds, "Fake verification / clipboard malware", username);
              }
              await ctx.reply(
                `Message removed.

REASON: ${verifyHit}

Nobody in this community will ever ask you to paste a command into your computer, or to verify through a bot. That installs software that reads your wallet keys.

If you already ran something like that, move your funds to a new wallet from a different device before doing anything else.`
              );
              await logViolation(chatIdStr, userIdStr, username || "", "fake_verification", text2.slice(0, 200), verifyHit, shouldBan ? "ban" : "mute");
            } catch {
              console.log("Couldn't action fake verification message");
            }
            return;
          }
        }
        if (feats.scam) {
          const spoof = detectDomainImpersonation(text2);
          if (spoof) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, "scamsBlocked");
              const { muteSeconds, offenseCount, shouldBan } = await addOffense(chatId, ctx.from.id);
              if (shouldBan) {
                await ctx.api.banChatMember(chatId, ctx.from.id);
              } else {
                await muteUser(ctx, ctx.from.id, muteSeconds, "Posted a lookalike domain", username);
              }
              await ctx.reply(
                `Message removed \u2014 that link was not us.

The domain was built to look like ${spoof.mimicking}.

Official links: ${[OFFICIAL_WEBSITE_URL, OFFICIAL_TELEGRAM_URL, BOT_PUBLIC_URL].filter(Boolean).join(" | ")}. Type them yourself. Don't click them.`
              );
              await logViolation(chatIdStr, userIdStr, username || "", "domain_spoof", text2.slice(0, 200), `Mimicking ${spoof.mimicking}`, shouldBan ? "ban" : "mute");
            } catch {
              console.log("Couldn't action domain spoof");
            }
            return;
          }
        }
        if (feats.scam) {
          const baitHit = detectMintBait(text2);
          if (baitHit) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, "scamsBlocked");
              await ctx.reply(
                `Message removed.

REASON: mint/airdrop bait ("${baitHit}") with a link attached.

Announcements come from pinned messages here and from the official site. Nowhere else.`
              );
              await flagForModReview(ctx, userIdStr, username || "", text2, 85, `Mint/airdrop bait: ${baitHit}`);
              await logViolation(chatIdStr, userIdStr, username || "", "mint_bait", text2.slice(0, 200), baitHit, "delete");
            } catch {
              console.log("Couldn't action mint bait");
            }
            return;
          }
        }
        if (feats.impersonation) {
          const displayName = `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim();
          if (hasHomoglyphs(displayName) || hasHomoglyphs(username || "")) {
            try {
              const admins = await ctx.api.getChatAdministrators(chatId);
              const mentions = admins.filter((a) => !a.user.is_bot && a.user.username).slice(0, 3).map((a) => `@${a.user.username}`).join(" ");
              await ctx.reply(
                `Heads up ${mentions}

${displayName || username} has a name that mixes character sets \u2014 letters that look Latin but aren't. That is how impersonation accounts are built.

Worth a look.`
              );
              await flagForModReview(ctx, userIdStr, username || "", displayName, 70, "Mixed-script display name");
              await logViolation(chatIdStr, userIdStr, username || "", "homoglyph_name", displayName, "Mixed character sets in name", "flag");
            } catch {
            }
          }
        }
        if (_earlyMediaFeats.newuser && ctx.message?.photo) {
          const _mTrust = await ensureTrustRecord(userIdStr, chatIdStr, username, ctx.from.first_name);
          const _mIsNew = await isNewUser(chatIdStr, userIdStr);
          if (_mIsNew && !_mTrust?.isTrusted) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await ctx.reply(
                `${username ? "@" + username : "That"} \u2014 images are held until you've been around a little. Say hello first and it lifts on its own.`
              );
              await logViolation(
                chatIdStr,
                userIdStr,
                username || "",
                "media_new_user",
                "",
                "Image from a new, untrusted account",
                "delete"
              );
            } catch {
            }
            return;
          }
        }
        try {
          const _trustRec = await ensureTrustRecord(userIdStr, chatIdStr, username, ctx.from.first_name);
          const _isTrusted = Boolean(_trustRec?.isTrusted);
          const verdict = await assessBehaviour({
            userId: ctx.from.id,
            chatId,
            text: text2,
            isForward: Boolean(ctx.message?.forward_origin || ctx.message?.forward_from),
            hasMedia: Boolean(ctx.message?.photo || ctx.message?.video || ctx.message?.document),
            accountIsNew: isNewAccountHeuristic(ctx.from.id),
            isTrusted: _isTrusted
          });
          if (verdict.action === "restrict") {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            const { muteSeconds, shouldBan } = await addOffense(chatId, ctx.from.id);
            if (shouldBan) {
              await ctx.api.banChatMember(chatId, ctx.from.id);
              if (feats.crossBan) {
                await recordGlobalBan(
                  userIdStr,
                  username,
                  ctx.from.first_name,
                  chatIdStr,
                  "Automated behaviour pattern \u2014 repeated offences"
                );
              }
            } else {
              await muteUser(ctx, ctx.from.id, muteSeconds, "Automated behaviour pattern", username);
            }
            await ctx.reply(
              `Message removed.

This account is behaving like an automated one:
` + verdict.reasons.map((r) => `- ${r}`).join("\n") + `

If you're a person and this is wrong, an admin can clear it with /restore.`
            );
            await logViolation(
              chatIdStr,
              userIdStr,
              username || "",
              "behaviour_anomaly",
              text2.slice(0, 200),
              verdict.reasons.join("; ") + ` (score ${verdict.score})`,
              shouldBan ? "ban" : "mute"
            );
            await incrementModStat(chatIdStr, "spamBlocked");
            return;
          }
          if (verdict.action === "flag") {
            await flagForModReview(
              ctx,
              userIdStr,
              username || "",
              text2,
              verdict.score,
              "Behaviour: " + verdict.reasons.join("; ")
            );
          }
          const campaign = await checkCoordinatedPosting(chatId, ctx.from.id, text2);
          if (campaign?.detected && !_isTrusted) {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await stateSet(
              KEYS.lockdown(chatIdStr),
              { active: true, until: Date.now() + LOCKDOWN_DURATION },
              TTL.lockdown
            );
            const admins = await ctx.api.getChatAdministrators(chatId);
            const mentions = admins.filter((a) => !a.user.is_bot && a.user.username).slice(0, 3).map((a) => `@${a.user.username}`).join(" ");
            await ctx.reply(
              `COORDINATED POSTING ${mentions}

${campaign.count} different accounts have posted structurally identical messages with links in the last few minutes.

Lockdown is on and the messages are being removed. Nobody should click anything posted in this window.`
            );
            await logViolation(
              chatIdStr,
              userIdStr,
              username || "",
              "coordinated_campaign",
              text2.slice(0, 200),
              `${campaign.count} accounts, same message shape`,
              "lockdown"
            );
            await incrementModStat(chatIdStr, "raidAttempts");
            return;
          }
        } catch (err) {
          console.error("[behaviour] check failed:", err);
        }
        const lowerTextMod = text2.toLowerCase();
        if (feats.scam && detectSeedPhrase(text2)) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, "scamsBlocked");
            await ctx.reply(`Hey there! I removed that message because it looked like it might contain a wallet recovery phrase (seed phrase).

NEVER share your seed phrase with anyone - not even team members or "support." If someone asked you to share it, they're trying to steal your crypto!

If this was a mistake, no worries. Just keep those 12/24 words safe and private!`);
            await flagForModReview(ctx, userIdStr, username || "", "[SEED PHRASE DETECTED - Content hidden for safety]", 95, "Seed phrase detected");
          } catch (e) {
            console.log("Couldn't delete seed phrase message");
          }
          return;
        }
        if (feats.scam) for (const phrase of WALLET_DRAINER_PHRASES) {
          if (lowerTextMod.includes(phrase)) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, "scamsBlocked");
              await ctx.reply(`Hold up! That message contained a common scam phrase ("${phrase}").

Legit projects NEVER ask you to "verify," "sync," or "validate" your wallet through a random link. That's how scammers drain wallets!

If you received a DM asking you to do this, report and block them immediately.`);
              await flagForModReview(ctx, userIdStr, username || "", text2, 85, `Wallet drainer phrase: ${phrase}`);
            } catch (e) {
              console.log("Couldn't delete wallet drainer message");
            }
            return;
          }
        }
        if (feats.scam) {
          const urlRegexShort = /https?:\/\/([^\s\/]+)/gi;
          let shortLinkMatch;
          while ((shortLinkMatch = urlRegexShort.exec(text2)) !== null) {
            const domain = shortLinkMatch[1].toLowerCase();
            if (SHORT_LINK_DOMAINS.some((sd) => domain.includes(sd))) {
              try {
                await ctx.api.deleteMessage(chatId, ctx.message.message_id);
                await incrementModStat(chatIdStr, "linksBlocked");
                await ctx.reply(`I blocked that shortened link for your safety!

Scammers use URL shorteners (bit.ly, tinyurl, etc.) to hide malicious websites. If you have a legitimate link to share, please use the full URL so everyone can see where it goes.

Tip: Never click shortened links in crypto groups - they're often phishing sites!`);
              } catch (e) {
                console.log("Couldn't delete short link message");
              }
              return;
            }
          }
        }
        if (feats.scam) {
          const permitHit = detectPermitSignatureAttack(text2);
          if (permitHit) {
            try {
              await ctx.api.deleteMessage(chatId, ctx.message.message_id);
              await incrementModStat(chatIdStr, "scamsBlocked");
              await ctx.reply(
                `That message was removed \u2014 it matches known wallet-drain infrastructure.

Permit-signature attacks look like innocent "verification signatures" or "small gas fees" but silently grant unlimited access to your tokens via ERC-20 approve(). NEVER sign anything from a link shared in a crypto group.

Legitimate projects never ask you to sign a wallet approval to claim anything. If you received a DM pushing this, block and report them immediately.`
              );
              await flagForModReview(ctx, userIdStr, username || "", text2, 90, `Permit-sig/drainer attack: ${permitHit}`);
            } catch (e) {
              console.log("Couldn't delete permit-sig/drainer message");
            }
            return;
          }
        }
        if (feats.scam && detectFakeCaptcha(text2)) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, "scamsBlocked");
            await ctx.reply(
              `That message was removed \u2014 it looks like a fake CAPTCHA or verification prompt.

Fake "verify you're human" links inside crypto groups are a major attack vector. They harvest session tokens, inject clipboard malware, or steal private keys \u2014 NOT verify anything. The $200k Unihax0r drain in May 2025 came through exactly this.

Real group verifications NEVER use external links. If this was a mistake, reach out to an admin directly.`
            );
            await flagForModReview(ctx, userIdStr, username || "", text2, 92, "Fake CAPTCHA / verification harvest attempt");
          } catch (e) {
            console.log("Couldn't delete fake CAPTCHA message");
          }
          return;
        }
        const hateSpeechCheck = feats.hate ? detectHateSpeech(text2) : { detected: false };
        if (hateSpeechCheck.detected) {
          const warningKey = KEYS.hateWarning(userIdStr, chatIdStr);
          const now = Date.now();
          let existing = await stateGet(warningKey, null);
          if (existing && now - existing.lastWarning > HATE_SPEECH_WARNING_RESET) {
            existing = null;
          }
          const warningCount = (existing?.count || 0) + 1;
          await stateSet(warningKey, { count: warningCount, lastWarning: now }, TTL.hateWarning);
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, "messagesBlocked");
            if (warningCount === 1) {
              await ctx.reply(
                `${username ? `@${username}` : "Hey"}, your message was removed.

REASON: Inappropriate language detected.

This is WARNING #1. We're building a positive community - keep it respectful!`
              );
            } else if (warningCount === 2) {
              await ctx.reply(
                `${username ? `@${username}` : "Hey"}, your message was removed.

REASON: Inappropriate language (second offense).

This is WARNING #2. One more = 1 hour mute. Keep it friendly!`
              );
            } else {
              const muteUntil = Math.floor(Date.now() / 1e3) + 3600;
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
                `${username ? `@${username}` : "User"} has been MUTED for 1 hour.

REASON: Third offense - inappropriate language.

You can read messages but cannot post. Admins have been notified.`
              );
              await flagForModReview(ctx, userIdStr, username || "", "[Hate speech - content hidden]", 90, "Repeated hate speech violations");
            }
          } catch (e) {
            console.log("Couldn't moderate hate speech");
          }
          return;
        }
        if (feats.spam && detectEmojiSpam(text2)) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, "spamBlocked");
          } catch (e) {
            console.log("Couldn't delete emoji spam");
          }
          return;
        }
        const rateThreshold = settings.raidMode ? Math.max(3, settings.spamThreshold - 2) : settings.spamThreshold;
        const rateCheck = await checkRateLimit(userIdStr, chatIdStr, text2, rateThreshold);
        if (feats.spam && rateCheck.blocked) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, rateCheck.reason === "flood" ? "spamBlocked" : "messagesBlocked");
            if (rateCheck.reason === "duplicate_spam") {
              await ctx.reply(`Slow down! Sending the same message repeatedly is not allowed.`);
            }
          } catch (e) {
            console.log("Couldn't delete rate-limited message");
          }
          return;
        }
        const urlRegex = /https?:\/\/[^\s]+/gi;
        const urls = text2.match(urlRegex) || [];
        if (feats.links && urls.length > 0) {
          await ensureUserModerationStatus(userIdStr, chatIdStr);
          const userStatus = await getUserModerationStatus(userIdStr, chatIdStr);
          const userJoinDate2 = userStatus?.joinDate || /* @__PURE__ */ new Date();
          const hoursInChat = (Date.now() - new Date(userJoinDate2).getTime()) / (1e3 * 60 * 60);
          const linkHoursLimit = settings.raidMode ? 48 : settings.newUserLinkHours;
          if (hoursInChat < linkHoursLimit && userStatus?.role === "newbie") {
            const allLinksAllowed = urls.every(
              (url) => isAllowedUrl(url)
            );
            if (!allLinksAllowed) {
              try {
                await ctx.api.deleteMessage(chatId, ctx.message.message_id);
                await incrementModStat(chatIdStr, "linksBlocked");
                await ctx.reply(`Links are restricted for new members during the first ${linkHoursLimit} hours. Ask an admin if you need to share a link!`);
              } catch (e) {
                console.log("Couldn't delete link from new user");
              }
              return;
            }
          }
        }
        const userJoinDate = (await getUserModerationStatus(userIdStr, chatIdStr))?.joinDate || /* @__PURE__ */ new Date();
        const accountAgeDays = (Date.now() - new Date(userJoinDate).getTime()) / (1e3 * 60 * 60 * 24);
        const riskScore = feats.scam ? calculateRiskScore(text2, username, accountAgeDays) : 0;
        const highRiskThreshold = settings.raidMode ? 40 : 60;
        const mediumRiskThreshold = settings.raidMode ? 25 : 40;
        if (riskScore >= highRiskThreshold) {
          try {
            await ctx.api.deleteMessage(chatId, ctx.message.message_id);
            await incrementModStat(chatIdStr, "scamsBlocked");
            await db.update(userModerationStatus).set({
              riskScore,
              isQuarantined: true,
              quarantineReason: `High risk score: ${riskScore}`
            }).where(and(
              eq2(userModerationStatus.telegramUserId, userIdStr),
              eq2(userModerationStatus.chatId, chatIdStr)
            ));
            await ctx.reply(`\u26A0\uFE0F Suspicious message blocked. Admins have been notified.`);
            await flagForModReview(ctx, userIdStr, username || "", text2, riskScore, "High risk score - auto-quarantined");
          } catch (e) {
            console.log("Couldn't auto-quarantine high-risk message");
          }
          return;
        } else if (riskScore >= mediumRiskThreshold) {
          await flagForModReview(ctx, userIdStr, username || "", text2, riskScore, "Medium risk score - flagged for review");
        }
      }
    }
    const { isScam, flags } = detectScam(text2, username);
    if (isScam && !hasFullCommunityTrust) {
      const warningMessage = ctx.session.wardenMode ? wardenResponse(`SUSPICIOUS MESSAGE DETECTED!

Flags:
${flags.join("\n")}

Admins, please review!`) : `Suspicious message detected!

Flags:
${flags.join("\n")}

Admins, please review!`;
      await ctx.reply(warningMessage, { reply_parameters: { message_id: ctx.message.message_id } });
    }
    let userMem = ctx.session.userMemory.get(userId);
    if (!userMem) {
      userMem = { messageCount: 0, positiveScore: 0, negativeScore: 0, lastMessages: [], flaggedForTone: false };
      ctx.session.userMemory.set(userId, userMem);
    }
    userMem.messageCount++;
    userMem.lastMessages = [...userMem.lastMessages.slice(-4), text2];
    if (typeof chatId === "number" && chatId < 0 && ctx.from?.id) {
      const chatIdStr = String(chatId);
      const userIdStr = String(ctx.from.id);
      const today = getTodayDateString();
      const isReply = !!ctx.message.reply_to_message;
      const repliedToUserId = ctx.message.reply_to_message?.from?.id ? String(ctx.message.reply_to_message.from.id) : void 0;
      if (isReply && repliedToUserId && repliedToUserId !== userIdStr) {
        const cacheKey = `${userIdStr}:${chatIdStr}`;
        let cache = uniqueInteractionsCache.get(cacheKey);
        if (!cache || cache.date !== today) {
          cache = { users: /* @__PURE__ */ new Set(), date: today };
          uniqueInteractionsCache.set(cacheKey, cache);
        }
        if (!cache.users.has(repliedToUserId)) {
          cache.users.add(repliedToUserId);
          await updateTrustActivity(userIdStr, chatIdStr, "uniqueInteraction", text2.length, repliedToUserId);
        } else {
          await updateTrustActivity(userIdStr, chatIdStr, "reply", text2.length, repliedToUserId);
        }
      } else {
        await updateTrustActivity(userIdStr, chatIdStr, "message", text2.length);
      }
    }
    const { isRude, isNice } = detectRudeness(text2);
    const rudenessStatus = await updateUserRudeness(userId, username, ctx.from?.first_name, isRude, isNice);
    if (text2.startsWith("/")) {
      await next();
      return;
    }
    const lowerText = text2.toLowerCase();
    const firstName = ctx.from?.first_name || "friend";
    const wardenTriggers = ["okay warden", "ok warden", "sure warden", "whatever warden", "calm down warden", "chill warden", "relax warden"];
    const triggeredWarden = wardenTriggers.some((t) => lowerText.includes(t));
    if (triggeredWarden) {
      const wardenModeResponse = WARDEN_MODE_RESPONSES[Math.floor(Math.random() * WARDEN_MODE_RESPONSES.length)];
      await ctx.reply(wardenModeResponse, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    const conversational = detectConversationalTrigger(text2);
    if (conversational.triggered && conversational.response) {
      const mood = getWardenMood();
      let response = conversational.response;
      if (conversational.category === "greeting" && Math.random() < 0.25 && mood.prefix) {
        response = `${mood.prefix}

${response}`;
      }
      response = ctx.session.wardenMode ? wardenResponse(response) : response;
      await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    const winnerKeywords = ["winner", "winners", "leaderboard reset", "when is", "when are", "what time", "announce"];
    const scheduleKeywords = ["daily", "weekly", "monthly", "trivia", "puzzle", "reset"];
    const isWinnerQuestion = winnerKeywords.some((w) => lowerText.includes(w)) && (scheduleKeywords.some((s) => lowerText.includes(s)) || lowerText.includes("?"));
    if (isWinnerQuestion) {
      const scheduleCommunity = await getCommunity(String(chatId));
      const scheduleTimezone = scheduleCommunity?.timezone || COMMUNITY_TIMEZONE;
      const scheduleInfo = `Here's when winners are announced (all times ${scheduleTimezone}):

DAILY Winners: Every night at 11:55 PM
WEEKLY Winners: Sunday nights at 11:55 PM (before Monday reset)
MONTHLY Winners: Last day of the month at 11:55 PM (before the 1st)

Both Trivia and Puzzle games have separate leaderboards!

Check current standings anytime with /leaderboard (trivia) or /puzzleboard (puzzles).`;
      const response = ctx.session.wardenMode ? wardenResponse(scheduleInfo) : scheduleInfo;
      await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    const gameKeywords = ["how to play", "how do i play", "rules", "how does", "how do", "what is", "what's", "explain"];
    const triviaKeywords = ["trivia", "quiz"];
    const puzzleKeywords = ["puzzle", "word game", "scramble", "unscramble"];
    const isTriviaQuestion = gameKeywords.some((g) => lowerText.includes(g)) && triviaKeywords.some((t) => lowerText.includes(t));
    const isPuzzleQuestion = gameKeywords.some((g) => lowerText.includes(g)) && puzzleKeywords.some((p) => lowerText.includes(p));
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
      const response = ctx.session.wardenMode ? wardenResponse(gameInfo.trim()) : gameInfo.trim();
      await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    let shouldRespond = false;
    let responseContext = "";
    let useWardenAttitude = false;
    const conversationChatId = chatId ?? "private";
    const directBotMention = lowerText.includes(`@${BOT_USERNAME2.toLowerCase()}`) || lowerText.includes("warden");
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
    if (!shouldRespond && lowerText.includes("warden")) {
      shouldRespond = true;
      useWardenAttitude = true;
      responseContext = "Someone addressed the Warden directly. Answer plainly and briefly. No performance.";
    } else if (!shouldRespond && lowerText.includes(`@${BOT_USERNAME2.toLowerCase()}`)) {
      shouldRespond = true;
      responseContext = "User tagged the bot. Answer plainly and briefly.";
    } else if (!shouldRespond && (lowerText.includes("boomerverse") || lowerText.includes("nft"))) {
      shouldRespond = true;
      responseContext = "User curious about the project - be helpful but make it fun and cheeky!";
    } else if (!shouldRespond && text2.includes("?")) {
      shouldRespond = true;
      responseContext = "Someone has questions! Answer with sass and a witty twist";
    } else if (!shouldRespond && /^(hi|hello|hey|yo|sup|gm|good morning|good evening)$/i.test(lowerText.trim())) {
      shouldRespond = true;
      responseContext = "New friend alert! Give them a fun, cheeky welcome that makes them smile";
    } else if (!shouldRespond && ctx.message.reply_to_message?.from?.is_bot) {
      shouldRespond = true;
      responseContext = "They're talking back to The Warden! Match their energy with playful banter";
    } else if (!shouldRespond && text2.length > 50 && Math.random() < 0.1) {
      shouldRespond = true;
      responseContext = "Time to jump into the convo with a witty observation or cheeky comment!";
    }
    if (shouldRespond) {
      let response;
      const displayName = username ? `@${username}` : firstName;
      const recentConversation = activeConversation?.turns?.length ? activeConversation.turns.map((t) => `${t.role === "user" ? displayName : "Warden"}: ${t.content}`).join("\n") : "";
      const authorityContext = rolePersonalityContext(ctx.from?.id, username);
      const trackingUserId = ctx.from?.id?.toString() || "";
      const chatIdStr = chatId ? String(chatId) : "";
      const _chatFeats = chatIdStr ? await getFeatureSettings(chatIdStr) : { ...DEFAULT_FEATURE_SETTINGS };
      let newMsgCount = 0;
      if (trackingUserId) {
        try {
          newMsgCount = await trackUserInteraction(trackingUserId, text2, username, firstName);
          const milestone = _chatFeats.personality ? checkMilestone(newMsgCount) : null;
          if (milestone) {
            await ctx.reply(`${displayName} ${milestone}`, { reply_parameters: { message_id: ctx.message.message_id } });
          }
        } catch (e) {
        }
      }
      const returningContext = trackingUserId ? await getReturningUserContext(trackingUserId) : null;
      const memberMemoryContext = trackingUserId ? await getMemberMemoryContext(trackingUserId, chatIdStr) : "";
      const rudenessContext = getWardenRudenessContext(rudenessStatus, isRude);
      if (useWardenAttitude) {
        const questionText = text2.replace(/warden/gi, "").trim() || text2;
        const gamesResult = detectGamesQuery(text2);
        if (gamesResult.isGames && gamesResult.response) {
          response = gamesResult.response;
        } else {
          const knowledgeResult = checkKnowledgeBases(questionText);
          if (knowledgeResult) {
            response = returningContext ? `${returningContext}

${knowledgeResult}` : knowledgeResult;
          } else {
            const learnedResponse = _chatFeats.learning ? await BotMemory.getLearnedResponse(questionText) : null;
            if (learnedResponse) {
              response = learnedResponse;
              if (returningContext) response = `${returningContext}

${response}`;
            } else {
              const fullContext = rudenessContext ? `${authorityContext}
${memberMemoryContext ? `${memberMemoryContext}
` : ""}${recentConversation ? `Recent conversation:
${recentConversation}
` : ""}${rudenessContext}

Answer the user's question or respond helpfully. Keep the conversation natural. Address them as ${displayName}.` : `${authorityContext}
${memberMemoryContext ? `${memberMemoryContext}
` : ""}${recentConversation ? `Recent conversation:
${recentConversation}
` : ""}Answer the user's question or respond helpfully. Keep the conversation natural, with Warden personality. Address them as ${displayName}.`;
              response = await getAIResponse(questionText, fullContext);
              if (returningContext) response = `${returningContext}

${response}`;
            }
          }
        }
      } else {
        const knowledgeResult = checkKnowledgeBases(text2);
        if (knowledgeResult) {
          response = knowledgeResult;
        } else {
          const fullContext = rudenessContext ? `${authorityContext}
${memberMemoryContext ? `${memberMemoryContext}
` : ""}${recentConversation ? `Recent conversation:
${recentConversation}
` : ""}${rudenessContext}

${responseContext}. Address them as ${displayName}.` : `${authorityContext}
${memberMemoryContext ? `${memberMemoryContext}
` : ""}${recentConversation ? `Recent conversation:
${recentConversation}
` : ""}${responseContext}. Address them as ${displayName}. Keep it natural, useful and personable.`;
          const learnedResponse = _chatFeats.learning ? await BotMemory.getLearnedResponse(text2) : null;
          if (learnedResponse) {
            response = learnedResponse;
          } else {
            response = await getAIResponse(text2, fullContext);
          }
        }
      }
      if (_chatFeats.personality) {
        response = addWardenFlair(response, { includeCatchphrase: true, includeGag: true });
      }
      if (directBotMention || replyToWarden || activeConversation) {
        await saveConversationTurn(conversationChatId, ctx.from?.id || userId, text2, response);
      }
      const interactionId = _chatFeats.learning ? await BotMemory.saveInteraction(
        chatIdStr,
        trackingUserId,
        username,
        text2,
        response,
        "ai"
      ) : null;
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
var DAILY_QUOTES = [
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
  { quote: "Every stripe on that animal was a fact once. Now it's a story.", author: "The Warden" }
];
var lastQuoteIndex = -1;
function getRandomQuote() {
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
  const message = `QUOTE OF THE DAY

"${quote.quote}"

\u2014 ${quote.author}`;
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
var EASY_WORDS = [
  "EMU",
  "ROO",
  "JOEY",
  "BAT",
  "OWL",
  "COD",
  "EEL",
  "RAT",
  "FOX",
  "CAT",
  "DOG",
  "PIG",
  "COW",
  "EWE",
  "RAM",
  "SOW",
  "CROW",
  "DOVE",
  "DUCK",
  "SWAN",
  "GULL",
  "TERN",
  "IBIS",
  "KITE",
  "HAWK",
  "WREN",
  "ROBIN",
  "FINCH",
  "QUAIL",
  "SNIPE",
  "HERON",
  "EGRET",
  "CRANE",
  "EAGLE",
  "GALAH",
  "KOALA",
  "DINGO",
  "BILBY",
  "QUOLL",
  "YABBY",
  "WHALE",
  "SHARK",
  "SKATE",
  "SEAL",
  "CRAB",
  "FISH",
  "SQUID",
  "KRILL",
  "MOTH",
  "BEE",
  "ANT",
  "WASP",
  "WORM",
  "SNAIL",
  "SLUG",
  "FROG",
  "TOAD",
  "SKINK",
  "GECKO",
  "SNAKE",
  "ADDER",
  "GRUB",
  "LARVA",
  "HIVE",
  "GUM",
  "FERN",
  "MOSS",
  "REED",
  "SEDGE",
  "HAKEA",
  "MULGA",
  "BOAB",
  "PINE",
  "OAK",
  "PALM",
  "VINE",
  "HERB",
  "ROOT",
  "BARK",
  "LEAF",
  "TWIG",
  "SEED",
  "BUD",
  "POD",
  "LOG",
  "BUSH",
  "SCRUB",
  "HEATH",
  "GRASS",
  "WEED",
  "ALGAE",
  "KELP",
  "FUNGI",
  "SPORE",
  "TREE",
  "WOOD",
  "SAP",
  "RESIN",
  "PETAL",
  "BLOOM",
  "FLORA",
  "FAUNA",
  "SHOOT",
  "STEM",
  "THORN",
  "HUSK",
  "NUT",
  "BERRY",
  "BAY",
  "CAPE",
  "COVE",
  "DUNE",
  "REEF",
  "TARN",
  "LAKE",
  "POND",
  "POOL",
  "CREEK",
  "RIVER",
  "DELTA",
  "MARSH",
  "SWAMP",
  "BOG",
  "FEN",
  "PEAT",
  "PLAIN",
  "VALE",
  "GLEN",
  "GORGE",
  "PASS",
  "SPUR",
  "RIDGE",
  "PEAK",
  "MOUNT",
  "CLIFF",
  "CRAG",
  "SCREE",
  "ROCK",
  "STONE",
  "SAND",
  "MUD",
  "SILT",
  "CLAY",
  "OCHRE",
  "CAVE",
  "ISLE",
  "COAST",
  "SHORE",
  "TIDE",
  "WAVE",
  "SURF",
  "FOAM",
  "SALT",
  "BRINE",
  "INLET",
  "BLUFF",
  "BANK",
  "SHOAL",
  "RAIN",
  "MIST",
  "FOG",
  "HAZE",
  "WIND",
  "GALE",
  "STORM",
  "HAIL",
  "SNOW",
  "ICE",
  "FROST",
  "THAW",
  "SUN",
  "MOON",
  "STAR",
  "SKY",
  "CLOUD",
  "DAWN",
  "DUSK",
  "NOON",
  "NIGHT",
  "DAY",
  "HEAT",
  "COLD",
  "DRY",
  "WET",
  "FIRE",
  "ASH",
  "SMOKE",
  "EMBER",
  "FLAME",
  "BURN",
  "CHAR",
  "SLEET",
  "DEW",
  "GUST",
  "CAMP",
  "TENT",
  "SWAG",
  "BILLY",
  "MATE",
  "TRACK",
  "TRAIL",
  "PATH",
  "ROAD",
  "FORD",
  "HUT",
  "GATE",
  "FENCE",
  "YARD",
  "FARM",
  "CROP",
  "HERD",
  "MOB",
  "FLOCK",
  "PACK",
  "NEST",
  "DEN",
  "LAIR",
  "EGG",
  "WING",
  "BEAK",
  "CLAW",
  "PAW",
  "FUR",
  "PELT",
  "TAIL",
  "EAR",
  "HORN",
  "TUSK",
  "PREY",
  "HUNT",
  "FEED",
  "GRAZE",
  "ROAM",
  "RANGE",
  "SCAT",
  "SPOOR",
  "HIDE",
  "PERCH",
  "ROOST",
  "RIFT",
  "KEY",
  "RELIC",
  "MYTH",
  "LORE",
  "TALE",
  "CANON",
  "RARE",
  "EPIC",
  "MINT",
  "DROP",
  "BASE",
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "WILD",
  "VAST",
  "WIDE",
  "DEEP",
  "HIGH",
  "LOW",
  "OLD",
  "NEW",
  "LOST",
  "QUIET",
  "STILL",
  "BLEAK",
  "HARSH",
  "ROUGH",
  "SHARP",
  "CLEAR",
  "GREEN",
  "GREY",
  "BROWN",
  "BLACK",
  "WHITE",
  "GOLD",
  "RUST",
  "AMBER",
  "SLATE",
  "PALE",
  "DARK",
  "COOL",
  "MILD",
  "RAW",
  "DERBY",
  "PERTH",
  "DOVER",
  "LUNE",
  "AXE",
  "HOE",
  "PEG",
  "ROPE",
  "KNOT",
  "BOAT",
  "RAFT",
  "OAR",
  "SAIL",
  "MAST",
  "NET",
  "HOOK",
  "LINE",
  "BAIT",
  "TRAP",
  "CAGE",
  "PEN",
  "STY",
  "BARN",
  "SHED",
  "POST",
  "RAIL",
  "WIRE",
  "MESH",
  "STAKE",
  "TARP",
  "CORD",
  "TWINE",
  "MOLE",
  "HARE",
  "DEER",
  "GOAT",
  "MULE",
  "PONY",
  "FOAL",
  "CALF",
  "LAMB",
  "CHICK",
  "DRAKE",
  "HEN",
  "COCK",
  "BULL",
  "STAG",
  "DOE",
  "FAWN",
  "CUB",
  "PUP",
  "KIT",
  "BROOD",
  "SWARM",
  "LARK",
  "SWIFT",
  "PIPIT",
  "STILT",
  "COOT",
  "GREBE",
  "SKUA",
  "NODDY",
  "MYNA",
  "BASS",
  "BREAM",
  "TROUT",
  "SOLE",
  "LING",
  "HAKE",
  "TUNA",
  "PRAWN",
  "CLAM",
  "WHELK",
  "POLYP",
  "MESA",
  "BUTTE",
  "KNOLL",
  "RISE",
  "SLOPE",
  "BASIN",
  "CHASM",
  "SCARP",
  "LEDGE",
  "SHELF",
  "FLAT",
  "OASIS",
  "WADI",
  "GULLY",
  "DITCH",
  "DRAIN",
  "WEIR",
  "DAM",
  "LEVEE",
  "BUND",
  "SLUSH",
  "CHILL",
  "BLAZE",
  "GLOW",
  "BEAM",
  "SHADE",
  "GLARE",
  "GLINT",
  "UMBER",
  "SEPIA",
  "IVORY",
  "EBONY",
  "JADE",
  "TEAL",
  "AQUA",
  "LIME",
  "TAWNY",
  "DUSKY",
  "MURKY",
  "HAZY",
  "MISTY",
  "WINDY",
  "STONY",
  "ROCKY",
  "SANDY",
  "MUDDY",
  "LEAFY",
  "MOSSY",
  "WEEDY",
  "REEDY",
  "SOAR",
  "GLIDE",
  "DIVE",
  "SWIM",
  "WADE",
  "CRAWL",
  "CREEP",
  "LEAP",
  "BOUND",
  "DART",
  "DASH",
  "FLIT",
  "REAR",
  "BREED",
  "MOULT",
  "GROW",
  "WILT",
  "DECAY",
  "BLOKE",
  "YARN",
  "CHOOK",
  "ESKY",
  "THONG",
  "SCONE",
  "ROAST",
  "BREW",
  "TEA",
  "MUG",
  "PAN",
  "FLASK",
  "FEAST",
  "SNACK",
  "BOOM",
  "VERSE",
  "GENE",
  "TIER",
  "SET",
  "ART",
  "SIGIL",
  "GLYPH",
  "RUNE",
  "MARK",
  "CHAIN",
  "BLOCK",
  "PROOF",
  "TRACE"
];
var HARD_WORDS = [
  "THYLACINE",
  "PADEMELON",
  "WOMBAT",
  "ECHIDNA",
  "PLATYPUS",
  "POSSUM",
  "BANDICOOT",
  "POTOROO",
  "BETTONG",
  "NUMBAT",
  "DUNNART",
  "ANTECHINUS",
  "WALLABY",
  "KANGAROO",
  "WALLAROO",
  "QUOKKA",
  "GLIDER",
  "RINGTAIL",
  "BRUSHTAIL",
  "MARSUPIAL",
  "MONOTREME",
  "MACROPOD",
  "DASYURID",
  "DOLPHIN",
  "HUMPBACK",
  "SEALION",
  "PLATYPI",
  "FORESTER",
  "KOOKABURRA",
  "CURRAWONG",
  "PARDALOTE",
  "HONEYEATER",
  "LYREBIRD",
  "BOWERBIRD",
  "COCKATOO",
  "ROSELLA",
  "LORIKEET",
  "PARAKEET",
  "BUDGERIGAR",
  "PENGUIN",
  "ALBATROSS",
  "PELICAN",
  "CORMORANT",
  "SHEARWATER",
  "MUTTONBIRD",
  "BITTERN",
  "GOSHAWK",
  "KESTREL",
  "FALCON",
  "OSPREY",
  "PLOVER",
  "DOTTEREL",
  "SANDPIPER",
  "SPOONBILL",
  "THORNBILL",
  "SILVEREYE",
  "FANTAIL",
  "WHISTLER",
  "BUTCHERBIRD",
  "MAGPIE",
  "FIRETAIL",
  "SCRUBWREN",
  "NIGHTJAR",
  "GOANNA",
  "MONITOR",
  "PERENTIE",
  "TAIPAN",
  "TIGERSNAKE",
  "COPPERHEAD",
  "CROCODILE",
  "TORTOISE",
  "TURTLE",
  "STINGRAY",
  "SEAHORSE",
  "SEADRAGON",
  "GALAXIAS",
  "WHITEBAIT",
  "CRAYFISH",
  "LOBSTER",
  "ABALONE",
  "URCHIN",
  "EUCALYPT",
  "BANKSIA",
  "WARATAH",
  "GREVILLEA",
  "MELALEUCA",
  "CALLISTEMON",
  "CASUARINA",
  "LEATHERWOOD",
  "SASSAFRAS",
  "MYRTLE",
  "ACACIA",
  "WATTLE",
  "PAPERBARK",
  "IRONBARK",
  "STRINGYBARK",
  "BOTTLEBRUSH",
  "BUTTONGRASS",
  "SPHAGNUM",
  "SPINIFEX",
  "SALTBUSH",
  "TUSSOCK",
  "ORCHID",
  "EPACRIS",
  "RICHEA",
  "TELOPEA",
  "LOMATIA",
  "EUCRYPHIA",
  "NOTHOFAGUS",
  "CONIFER",
  "PIGFACE",
  "BRACKEN",
  "WATTLEBIRD",
  "BLACKWOOD",
  "CELERYTOP",
  "PENCILPINE",
  "HUONPINE",
  "BLUEGUM",
  "SNOWGUM",
  "MOUNTAINASH",
  "LICHEN",
  "RAINFOREST",
  "MOORLAND",
  "WOODLAND",
  "GRASSLAND",
  "HEATHLAND",
  "MANGROVE",
  "SEAGRASS",
  "WETLAND",
  "ESTUARY",
  "CATCHMENT",
  "CORRIDOR",
  "SANCTUARY",
  "RESERVE",
  "HERITAGE",
  "WILDERNESS",
  "ECOSYSTEM",
  "BIOSPHERE",
  "HABITAT",
  "ENDEMIC",
  "EXTINCT",
  "POLLINATOR",
  "MIGRATION",
  "BREEDING",
  "NESTING",
  "FORAGING",
  "NOCTURNAL",
  "CARNIVORE",
  "HERBIVORE",
  "OMNIVORE",
  "SCAVENGER",
  "PREDATOR",
  "INVASIVE",
  "REWILDING",
  "INSURANCE",
  "GENETICS",
  "GENOMICS",
  "DIVERSITY",
  "THREATENED",
  "VULNERABLE",
  "CRITICAL",
  "RECOVERY",
  "MONITORING",
  "POPULATION",
  "SURVIVAL",
  "EXTINCTION",
  "PROTECTED",
  "NATIVE",
  "COLONY",
  "BURROW",
  "WARREN",
  "ROOKERY",
  "CLUTCH",
  "HATCHING",
  "JUVENILE",
  "DORMANCY",
  "TORPOR",
  "HIBERNATE",
  "FLEDGLING",
  "BIOMASS",
  "CANOPY",
  "HOBART",
  "BURNIE",
  "DEVONPORT",
  "LAUNCESTON",
  "STRAHAN",
  "ZEEHAN",
  "WYNYARD",
  "SMITHTON",
  "STANLEY",
  "ULVERSTONE",
  "SORELL",
  "RICHMOND",
  "BICHENO",
  "SWANSEA",
  "OATLANDS",
  "ROSEBERY",
  "TULLAH",
  "SCOTTSDALE",
  "GEEVESTON",
  "HUONVILLE",
  "CYGNET",
  "MAYDENA",
  "BOTHWELL",
  "LONGFORD",
  "EVANDALE",
  "DELORAINE",
  "QUEENSTOWN",
  "CRADLE",
  "FRANKLIN",
  "GORDON",
  "TARKINE",
  "FREYCINET",
  "MACQUARIE",
  "OVERLAND",
  "OUTBACK",
  "BUSHLAND",
  "KIMBERLEY",
  "NULLARBOR",
  "GONDWANA",
  "DAINTREE",
  "BOOMERVERSE",
  "GENESIS",
  "GATEWAY",
  "LEGENDARY",
  "UNCOMMON",
  "MYTHIC",
  "COMMON",
  "COLLECTOR",
  "ROYALTY",
  "ELIGIBLE",
  "REGISTRY",
  "RULEBOOK",
  "WHITEPAPER",
  "WARDEN",
  "UNDERSTORY",
  "MIDSTORY",
  "SEEDBANK",
  "NURSERY",
  "SEEDLING",
  "SAPLING",
  "PLANTING",
  "REVEGETATE",
  "RESTORE",
  "REGROWTH",
  "OLDGROWTH",
  "DEADWOOD",
  "HOLLOWS",
  "TREEFERN",
  "WATERSHED",
  "TRIBUTARY",
  "FLOODPLAIN",
  "RIPARIAN",
  "WETLANDS",
  "LAGOON",
  "SALTMARSH",
  "SANDBAR",
  "HEADLAND",
  "PENINSULA",
  "ARCHIPELAGO",
  "ISTHMUS",
  "PLATEAU",
  "ESCARPMENT",
  "MOUNTAIN",
  "FOOTHILL",
  "VALLEY",
  "CANYON",
  "CAVERN",
  "SINKHOLE",
  "GLACIER",
  "MORAINE",
  "DOLERITE",
  "GRANITE",
  "BASALT",
  "SANDSTONE",
  "LIMESTONE",
  "QUARTZITE",
  "MINERAL",
  "SEDIMENT",
  "EROSION",
  "WEATHERING",
  "RAINFALL",
  "MONSOON",
  "CYCLONE",
  "DROUGHT",
  "BUSHFIRE",
  "WILDFIRE",
  "FIRESTICK",
  "BACKBURN",
  "SMOULDER",
  "TEMPERATE",
  "SUBALPINE",
  "ALPINE",
  "TROPICAL",
  "MARITIME",
  "SEASONAL",
  "CLIMATE",
  "BIOLOGY",
  "ECOLOGY",
  "ZOOLOGY",
  "BOTANY",
  "TAXONOMY",
  "SPECIES",
  "SUBSPECIES",
  "FAMILY",
  "HABITATS",
  "FORAGE",
  "PREDATION",
  "SYMBIOSIS",
  "MUTUALISM",
  "KEYSTONE",
  "ENDANGERED",
  "EXTIRPATE",
  "CAPTIVE",
  "RELEASE",
  "SURVEY",
  "TAGGING",
  "TRACKING",
  "CAMERATRAP",
  "FIELDWORK",
  "RANGER",
  "CUSTODIAN",
  "STEWARD",
  "TASMANIA",
  "AUSTRALIA",
  "VICTORIA",
  "QUEENSLAND",
  "CANBERRA",
  "ADELAIDE",
  "BRISBANE",
  "MELBOURNE",
  "SYDNEY",
  "DARWIN",
  "TASMAN",
  "FLINDERS",
  "FURNEAUX",
  "RAILTON",
  "SHEFFIELD",
  "LATROBE",
  "SOMERSET",
  "MOLECREEK",
  "LIFFEY",
  "MERSEY",
  "CORINNA",
  "MARRAWAH",
  "BOOBOOK",
  "PARROT",
  "PIGEON",
  "BRONZEWING",
  "TREEFROG",
  "FROGMOUTH",
  "SEAEAGLE"
];
var puzzleKey = (chatId) => `w:puzzle:${chatId}`;
var puzzleWordsKey = (chatId) => `w:puzzlewords:${chatId}`;
var MAX_RECENT_PUZZLE_WORDS = 100;
async function getPuzzle(chatId) {
  return await stateGet(puzzleKey(chatId), null);
}
async function savePuzzle(chatId, p) {
  await stateSet(puzzleKey(chatId), p, 60 * 60);
}
async function clearPuzzle(chatId) {
  await stateDel(puzzleKey(chatId));
}
async function getUnusedPuzzleWord(chatId, wordList) {
  const recentWords = await stateGet(puzzleWordsKey(chatId), []);
  const availableWords = wordList.filter((w) => !recentWords.includes(w));
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
function scrambleWord(word) {
  const chars = word.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const scrambled = chars.join("");
  if (scrambled === word && word.length > 2) {
    return scrambleWord(word);
  }
  return scrambled;
}
function getWeekNumberForPuzzle(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
}
async function getOrCreatePuzzleScore(telegramUserId, chatId, username, firstName) {
  const existing = await db.select().from(memberScores).where(and(
    eq2(memberScores.telegramUserId, telegramUserId),
    eq2(memberScores.chatId, chatId)
  )).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const inserted = await db.insert(memberScores).values({
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
  }).returning();
  return inserted[0];
}
async function updatePuzzleScore(telegramUserId, chatId, earnedPoints) {
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekNum = getWeekNumberForPuzzle(now);
  const weekStr = `${now.getFullYear()}-W${weekNum}`;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const score = await db.select().from(memberScores).where(and(
    eq2(memberScores.telegramUserId, telegramUserId),
    eq2(memberScores.chatId, chatId)
  )).limit(1);
  if (score.length === 0) return;
  const s = score[0];
  const newPuzzlePoints = (s.puzzlePoints || 0) + earnedPoints;
  const newPuzzleCorrect = (s.puzzleCorrect || 0) + 1;
  const newPuzzleAttempts = (s.puzzleAttempts || 0) + 1;
  const newPuzzleDailyPoints = s.puzzleDailyResetDate === todayStr ? (s.puzzleDailyPoints || 0) + earnedPoints : earnedPoints;
  const newPuzzleWeeklyPoints = s.puzzleWeeklyResetDate === weekStr ? (s.puzzleWeeklyPoints || 0) + earnedPoints : earnedPoints;
  const newPuzzleMonthlyPoints = s.puzzleMonthlyResetDate === monthStr ? (s.puzzleMonthlyPoints || 0) + earnedPoints : earnedPoints;
  await db.update(memberScores).set({
    puzzlePoints: newPuzzlePoints,
    puzzleCorrect: newPuzzleCorrect,
    puzzleAttempts: newPuzzleAttempts,
    puzzleDailyPoints: newPuzzleDailyPoints,
    puzzleDailyResetDate: todayStr,
    puzzleWeeklyPoints: newPuzzleWeeklyPoints,
    puzzleWeeklyResetDate: weekStr,
    puzzleMonthlyPoints: newPuzzleMonthlyPoints,
    puzzleMonthlyResetDate: monthStr
  }).where(and(
    eq2(memberScores.telegramUserId, telegramUserId),
    eq2(memberScores.chatId, chatId)
  ));
}
async function incrementPuzzleAttempt(telegramUserId, chatId) {
  await db.update(memberScores).set({
    puzzleAttempts: sql2`COALESCE(puzzle_attempts, 0) + 1`
  }).where(and(
    eq2(memberScores.telegramUserId, telegramUserId),
    eq2(memberScores.chatId, chatId)
  ));
}
function birthdayDateParts(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: COMMUNITY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value || date.getUTCFullYear());
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return { year, month, day, mmdd: `${month}-${day}` };
}
async function syncBirthdayFromTelegramProfile(ctx) {
  if (!ctx.from?.id || ctx.from.is_bot) return;
  const userId = String(ctx.from.id);
  const syncKey = KEYS.birthdayProfileSync(userId);
  if (await stateGet(syncKey, false)) return;
  await stateSet(syncKey, true, TTL.birthdayProfileSync);
  try {
    const full = await ctx.api.getChat(ctx.from.id);
    const birthdate = full?.birthdate;
    if (!birthdate?.month || !birthdate?.day) return;
    const birthday = `${String(birthdate.month).padStart(2, "0")}-${String(birthdate.day).padStart(2, "0")}`;
    const chatId = ctx.chat?.id?.toString() || "";
    const existing = await db.select().from(communityProfiles).where(eq2(communityProfiles.telegramUserId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(communityProfiles).set({
        birthday,
        chatId: chatId || existing[0].chatId,
        username: ctx.from.username || existing[0].username || "",
        firstName: ctx.from.first_name || existing[0].firstName || ""
      }).where(eq2(communityProfiles.telegramUserId, userId));
    } else {
      await db.insert(communityProfiles).values({
        telegramUserId: userId,
        chatId,
        username: ctx.from.username || "",
        firstName: ctx.from.first_name || "",
        birthday
      });
    }
  } catch {
  }
}
async function maybeSendBirthdayArrivalGreeting(ctx) {
  if (!ctx.from?.id || ctx.from.is_bot || !ctx.chat?.id || ctx.chat.id >= 0) return;
  await syncBirthdayFromTelegramProfile(ctx);
  const userId = String(ctx.from.id);
  const profileRows = await db.select().from(communityProfiles).where(eq2(communityProfiles.telegramUserId, userId)).limit(1);
  const profile = profileRows[0];
  if (!profile?.birthday) return;
  const today = birthdayDateParts();
  if (profile.birthday !== today.mmdd) return;
  const key = KEYS.birthdayArrival(ctx.chat.id, userId, today.year);
  if (await stateGet(key, false)) return;
  await stateSet(key, true, TTL.birthdayArrival);
  const who = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || "birthday legend";
  let msg = `\u{1F382} OI \u2014 ${who} just walked into chat ON THEIR BIRTHDAY.

`;
  msg += `Happy birthday from the Rift, ${who}. The Warden has checked the records: today you are officially allowed a little more chaos than usual.`;
  if (profile.location) msg += `

Birthday signal reaching all the way to ${profile.location}.`;
  if (profile.likes) msg += `
And I remember you're into ${profile.likes} \u2014 so I hope there is a decent helping of that in the day.`;
  msg += `

Have a bloody great one. The Gateway is still standing, the community is here, and for today at least I'll pretend the paperwork can wait. \u{1F389}`;
  try {
    await ctx.reply(msg);
  } catch (err) {
    console.error("Birthday arrival greeting failed:", err);
  }
}
async function generateBirthdayCakeImage(username) {
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
  const today = birthdayDateParts();
  const todayMMDD = today.mmdd;
  const currentYear = today.year;
  try {
    const birthdayProfiles = await db.select().from(communityProfiles).where(eq2(communityProfiles.birthday, todayMMDD));
    for (const profile of birthdayProfiles) {
      if (profile.lastBirthdayYear === currentYear) continue;
      if (!profile.chatId) continue;
      const chatId = parseInt(profile.chatId);
      if (isNaN(chatId)) continue;
      const _bdFeats = await getFeatureSettings(profile.chatId);
      if (!_bdFeats.scheduled) continue;
      const userName = profile.username ? `@${profile.username}` : profile.firstName || "our friend";
      const displayName = profile.firstName || profile.username || "friend";
      const cakeImageBuffer = await generateBirthdayCakeImage(displayName);
      let birthdayMessage = `\u{1F389} HAPPY BIRTHDAY ${userName}! \u{1F382}

`;
      birthdayMessage += `The Warden checked the community records and today's yours. Consider this the official Rift birthday roll-call.`;
      if (profile.location) {
        birthdayMessage += `

All the way to ${profile.location}.`;
      }
      if (profile.likes) {
        birthdayMessage += `

The record says you're fond of ${profile.likes}. hope there's some of that in the day.`;
      }
      birthdayMessage += `

Have a brilliant birthday from everyone around the Rift. Cake is authorised. Mild birthday chaos is tolerated. \u{1F388}`;
      try {
        if (cakeImageBuffer) {
          await botInstance.api.sendPhoto(chatId, new InputFile(cakeImageBuffer, `${displayName}_birthday.png`), { caption: birthdayMessage });
        } else {
          await botInstance.api.sendMessage(chatId, birthdayMessage);
        }
        await db.update(communityProfiles).set({ lastBirthdayYear: currentYear }).where(eq2(communityProfiles.telegramUserId, profile.telegramUserId));
        console.log(`Celebrated birthday for ${displayName} in chat ${chatId}`);
      } catch (err) {
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
async function generateWinnerImage(winnerName, period, game) {
  try {
    const prompt = `A cheerful cartoon Australian bush animal celebrating with a golden trophy and confetti, wearing a winner's crown. Bold stylized text banner reads "${period.toUpperCase()} ${game.toUpperCase()} WINNER" at the top. The character name "${winnerName}" appears on a ribbon below. Celebratory atmosphere with sparkles and stars. Cartoon style, vibrant colours, fun and energetic.`;
    const buffer = await generateImageBuffer(prompt, "1024x1024");
    return buffer;
  } catch (error) {
    console.error(`Error generating winner image for ${winnerName}:`, error);
    return null;
  }
}
async function getWardenWinnerMessage(winnerName, period, game, points) {
  try {
    const prompt = `Write a short, dry congratulation from The Warden to ${winnerName} for winning the ${period} ${game} competition with ${points} points. The Warden is plain-spoken and understated \u2014 no exclamation marks, no slang, no emojis. Two sentences at most.`;
    const response = await openai2.chat.completions.create({
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
async function getTopScorers(period, game) {
  const result = /* @__PURE__ */ new Map();
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekNum = getWeekNumber(now);
  const weekStr = `${now.getFullYear()}-W${weekNum}`;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let resetDateField;
  let pointsField;
  let periodStr;
  if (game === "trivia") {
    if (period === "daily") {
      resetDateField = "dailyResetDate";
      pointsField = "dailyPoints";
      periodStr = todayStr;
    } else if (period === "weekly") {
      resetDateField = "weeklyResetDate";
      pointsField = "weeklyPoints";
      periodStr = weekStr;
    } else {
      resetDateField = "monthlyResetDate";
      pointsField = "monthlyPoints";
      periodStr = monthStr;
    }
  } else {
    if (period === "daily") {
      resetDateField = "puzzleDailyResetDate";
      pointsField = "puzzleDailyPoints";
      periodStr = todayStr;
    } else if (period === "weekly") {
      resetDateField = "puzzleWeeklyResetDate";
      pointsField = "puzzleWeeklyPoints";
      periodStr = weekStr;
    } else {
      resetDateField = "puzzleMonthlyResetDate";
      pointsField = "puzzleMonthlyPoints";
      periodStr = monthStr;
    }
  }
  try {
    const allScores = await db.select().from(memberScores);
    const chatGroups = /* @__PURE__ */ new Map();
    for (const score of allScores) {
      if (!chatGroups.has(score.chatId)) {
        chatGroups.set(score.chatId, []);
      }
      chatGroups.get(score.chatId).push(score);
    }
    for (const [chatId, scores] of Array.from(chatGroups.entries())) {
      const validScores = scores.filter((s) => {
        const resetDate = game === "trivia" ? period === "daily" ? s.dailyResetDate : period === "weekly" ? s.weeklyResetDate : s.monthlyResetDate : period === "daily" ? s.puzzleDailyResetDate : period === "weekly" ? s.puzzleWeeklyResetDate : s.puzzleMonthlyResetDate;
        const pts = game === "trivia" ? period === "daily" ? s.dailyPoints : period === "weekly" ? s.weeklyPoints : s.monthlyPoints : period === "daily" ? s.puzzleDailyPoints : period === "weekly" ? s.puzzleWeeklyPoints : s.puzzleMonthlyPoints;
        return resetDate === periodStr && (pts || 0) > 0;
      });
      if (validScores.length > 0) {
        const sorted = validScores.sort((a, b) => {
          const ptsA = game === "trivia" ? period === "daily" ? a.dailyPoints : period === "weekly" ? a.weeklyPoints : a.monthlyPoints : period === "daily" ? a.puzzleDailyPoints : period === "weekly" ? a.puzzleWeeklyPoints : a.puzzleMonthlyPoints;
          const ptsB = game === "trivia" ? period === "daily" ? b.dailyPoints : period === "weekly" ? b.weeklyPoints : b.monthlyPoints : period === "daily" ? b.puzzleDailyPoints : period === "weekly" ? b.puzzleWeeklyPoints : b.puzzleMonthlyPoints;
          return (ptsB || 0) - (ptsA || 0);
        });
        const winner = sorted[0];
        const winnerPoints = game === "trivia" ? period === "daily" ? winner.dailyPoints : period === "weekly" ? winner.weeklyPoints : winner.monthlyPoints : period === "daily" ? winner.puzzleDailyPoints : period === "weekly" ? winner.puzzleWeeklyPoints : winner.puzzleMonthlyPoints;
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
async function announceWinners(period) {
  if (!botInstance) return;
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
  console.log(`Announcing ${periodLabel} winners...`);
  for (const game of ["trivia", "puzzle"]) {
    const gameLabel = game.charAt(0).toUpperCase() + game.slice(1);
    const topScorers = await getTopScorers(period, game);
    for (const [chatId, winner] of Array.from(topScorers.entries())) {
      const chatIdNum = parseInt(chatId);
      if (isNaN(chatIdNum)) continue;
      const _awFeats = await getFeatureSettings(chatId);
      if (!_awFeats.scheduled) continue;
      const winnerName = winner.username ? `@${winner.username}` : winner.firstName || "Champion";
      const displayName = winner.firstName || winner.username || "Champion";
      try {
        const imageBuffer = await generateWinnerImage(displayName, periodLabel, gameLabel);
        const wardenMessage = await getWardenWinnerMessage(winnerName, periodLabel, gameLabel, winner.points);
        const announcement = `${periodLabel.toUpperCase()} ${gameLabel.toUpperCase()} WINNER

Congratulations ${winnerName}!
${winner.points} points!

${wardenMessage}`;
        if (imageBuffer) {
          await botInstance.api.sendPhoto(chatIdNum, new InputFile(imageBuffer, `${displayName}_${period}_${game}_winner.png`), { caption: announcement });
        } else {
          await botInstance.api.sendMessage(chatIdNum, announcement);
        }
        console.log(`Announced ${period} ${game} winner ${displayName} in chat ${chatId}`);
      } catch (err) {
        console.error(`Failed to announce winner in chat ${chatId}:`, err);
        if (err.description?.includes("chat not found") || err.description?.includes("bot was blocked")) {
          activeChats.delete(chatIdNum);
        }
      }
    }
    if (topScorers.size === 0) {
      console.log(`No ${period} ${game} winners to announce`);
    }
  }
}
async function checkExpiredTrials() {
  {
    try {
      const now = /* @__PURE__ */ new Date();
      const expiredRows = await db.select().from(communities).where(sql2`status = 'trial' AND trial_expires_at IS NOT NULL AND trial_expires_at < ${now.toISOString()}`);
      for (const row of expiredRows) {
        await db.update(communities).set({ status: "free", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(communities.chatId, row.chatId));
        communityCache.delete(row.chatId);
        const chatIdNum = parseInt(row.chatId);
        if (!isNaN(chatIdNum) && botInstance) {
          try {
            await botInstance.api.sendMessage(
              chatIdNum,
              `Your The Warden 7-day trial has ended.

To continue using all features (spam/scam protection, games, scheduled posts, trust system, and more), contact ${OWNER_CONTACT} to activate your subscription.

For now, only /help, /info, and /ask are available.`
            );
          } catch {
          }
        }
        console.log(`[Community] Downgraded expired trial: ${row.chatId} (${row.displayName})`);
      }
      if (expiredRows.length > 0) {
        console.log(`[Community] Expiry check complete \u2014 downgraded ${expiredRows.length} trial(s)`);
      }
    } catch (err) {
      console.error("[Community] Error in expiry check:", err);
    }
  }
}
var TZ = COMMUNITY_TIMEZONE;
function localParts() {
  const now = /* @__PURE__ */ new Date();
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false
  }).format(now);
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short"
  }).format(now);
  return { hour: parseInt(time, 10), dateStr, weekday };
}
async function onceDaily(name, targetHour, task) {
  const { hour, dateStr } = localParts();
  if (hour < targetHour) return;
  const key = `w:cron:${name}`;
  const last = await stateGet(key, "");
  if (last === dateStr) return;
  await stateSet(key, dateStr, 3 * 24 * 60 * 60);
  try {
    await task();
  } catch (err) {
    console.error(`[cron] ${name} failed:`, err);
  }
}
async function sweepUnverifiedJoins(bot) {
  const keys = await stateScan("w:cap:");
  const now = Date.now();
  for (const key of keys) {
    const pending = await stateGet(key, null);
    if (!pending) continue;
    if (now - pending.timestamp <= 10 * 60 * 1e3) continue;
    await stateDel(key);
    try {
      await bot.api.banChatMember(pending.chatId, pending.userId);
      console.log(`[CAPTCHA] Removed unverified user ${pending.userId} from chat ${pending.chatId}`);
    } catch {
    }
  }
}
async function expireStaleGames(bot, chatId) {
  const puzzle = await getPuzzle(chatId);
  if (puzzle && !puzzle.solved && Date.now() > puzzle.deadline) {
    await clearPuzzle(chatId);
    try {
      await bot.api.sendMessage(chatId, `Time's up. The answer was: ${puzzle.word}`);
    } catch {
    }
  }
  const trivia = await getTrivia(chatId);
  if (trivia && Date.now() > trivia.questionDeadline + 2 * 60 * 1e3) {
    await clearTrivia(chatId);
    const scores = [...trivia.roundScoreboard].sort((a, b) => b.points - a.points);
    const summary = scores.length ? scores.slice(0, 5).map((s, i) => `${i + 1}. ${s.firstName}: ${s.points} pts`).join("\n") : "Nobody scored.";
    try {
      await bot.api.sendMessage(
        chatId,
        `Trivia round closed \u2014 the chat went quiet.

${summary}

Start another with /trivia`
      );
    } catch {
    }
  }
}
async function checkMyPermissions(bot, chatId) {
  const missing = [];
  try {
    const me = await bot.api.getChatMember(chatId, bot.botInfo.id);
    if (me.status !== "administrator") {
      return ["ADMIN \u2014 I am not an admin here. Almost nothing will work."];
    }
    const p = me;
    if (!p.can_delete_messages) missing.push("Delete messages \u2014 can't remove scam links or spam");
    if (!p.can_restrict_members) missing.push("Ban users \u2014 can't mute, ban, or enforce the Boss/TreeFitty extra-bot rule");
    if (!p.can_invite_users) missing.push("Invite users \u2014 CAPTCHA unrestrict may fail");
  } catch {
    missing.push("UNKNOWN \u2014 couldn't read my own permissions in this chat");
  }
  return missing;
}
async function reportMissingPermissions(bot, chatId) {
  const missing = await checkMyPermissions(bot, chatId);
  if (missing.length === 0) return false;
  const key = `w:permwarn:${chatId}`;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const last = await stateGet(key, "");
  if (last === today) return true;
  await stateSet(key, today, 3 * 24 * 60 * 60);
  try {
    await bot.api.sendMessage(
      chatId,
      `PERMISSIONS MISSING

I don't have everything I need to protect this group:

` + missing.map((m) => `- ${m}`).join("\n") + `

Fix it in Group Settings \u2192 Administrators \u2192 me. Until then the protections above are not actually enforced.`
    );
  } catch {
  }
  return true;
}
async function sendSafetyDigest(bot) {
  if (!GLOBAL_OWNER_USER_ID) return;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1e3);
  const byType = await db.select({
    type: violationLogs.violationType,
    action: violationLogs.actionTaken,
    n: sql2`count(*)::int`
  }).from(violationLogs).where(gte(violationLogs.createdAt, since)).groupBy(violationLogs.violationType, violationLogs.actionTaken).orderBy(desc(sql2`count(*)`));
  const top = await db.select({
    user: violationLogs.username,
    id: violationLogs.userId,
    n: sql2`count(*)::int`
  }).from(violationLogs).where(gte(violationLogs.createdAt, since)).groupBy(violationLogs.username, violationLogs.userId).orderBy(desc(sql2`count(*)`)).limit(3);
  const total = byType.reduce((a, r) => a + Number(r.n), 0);
  let text2;
  if (total === 0) {
    text2 = "THE WARDEN: DAILY SAFETY REPORT\n\nQuiet 24 hours. Nothing blocked, nobody muted or banned.";
  } else {
    const lines = byType.slice(0, 10).map((r) => `\u2022 ${r.type.replace(/_/g, " ")} (${r.action || "logged"}): ${r.n}`);
    const offenders = top.map((r) => `\u2022 ${r.user ? "@" + r.user : r.id}: ${r.n}`);
    text2 = `THE WARDEN: DAILY SAFETY REPORT

Last 24 hours: ${total} actions.

${lines.join("\n")}` + (offenders.length ? `

Most active offenders:
${offenders.join("\n")}` : "");
  }
  try {
    await bot.api.sendMessage(Number(GLOBAL_OWNER_USER_ID), text2);
  } catch (e) {
    console.log("Safety digest couldn't be delivered (owner may need to message the bot once):", e);
  }
}
async function runCronTick() {
  const ran = [];
  const bot = createBot();
  setBotInstance(bot);
  registerBotApi(bot.api);
  await loadActiveChats();
  try {
    await sweepUnverifiedJoins(bot);
    ran.push("captcha-sweep");
  } catch (err) {
    console.error("[cron] captcha sweep failed:", err);
  }
  try {
    await checkExpiredTrials();
    ran.push("trial-expiry");
  } catch (err) {
    console.error("[cron] trial expiry failed:", err);
  }
  try {
    await cleanupOldTrackedMessages();
    ran.push("message-cleanup");
  } catch (err) {
    console.error("[cron] message cleanup failed:", err);
  }
  for (const chatId of Array.from(activeChats)) {
    try {
      if (await reportMissingPermissions(bot, chatId)) ran.push(`perms-warning:${chatId}`);
    } catch (err) {
      console.error("[cron] permission check failed:", err);
    }
  }
  const before = ran.length;
  await onceDaily("safety-digest", 8, async () => {
    await sendSafetyDigest(bot);
    ran.push("safety-digest");
  });
  await onceDaily("quote", 10, async () => {
    await postDailyQuote();
    ran.push("daily-quote");
  });
  await onceDaily("birthdays", 9, async () => {
    await checkBirthdays();
    ran.push("birthdays");
  });
  await onceDaily("winners-daily", 20, async () => {
    await announceWinners("daily");
    ran.push("winners-daily");
  });
  for (const chatId of Array.from(activeChats)) {
    try {
      if (await autoEngageIfQuiet(bot, chatId)) ran.push(`auto-engage:${chatId}`);
    } catch (err) {
      console.error("[cron] auto-engage failed:", err);
    }
  }
  await onceDaily("admin-activity", 11, async () => {
    for (const chatId of Array.from(activeChats)) {
      await checkInactiveAdmins(chatId);
    }
    ran.push("admin-activity");
  });
  for (const chatId of Array.from(activeChats)) {
    try {
      await expireStaleGames(bot, chatId);
    } catch (err) {
      console.error("[cron] game expiry failed:", err);
    }
  }
  const { weekday } = localParts();
  if (weekday === "Sun") {
    await onceDaily("winners-weekly", 20, async () => {
      await announceWinners("weekly");
      ran.push("winners-weekly");
    });
  }
  if (ran.length === before) ran.push("nothing-due");
  return { ran };
}

// api-src/cron.ts
async function cron(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    assertDurableStateConfigured();
    const result = await runCronTick();
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] failed:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
export {
  cron as default
};
