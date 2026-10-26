var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api-src/admin.ts
import express from "express";
import session2 from "express-session";
import connectPgSimple from "connect-pg-simple";

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

// server/adminRoutes.ts
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { eq as eq3, desc as desc2, sql as sql3, and as and2 } from "drizzle-orm";

// server/bot.ts
import { Bot, session, InputFile } from "grammy";
import OpenAI3 from "openai";

// server/communityService.ts
import { eq } from "drizzle-orm";

// server/bot.ts
import { eq as eq2, and, desc, sql as sql2, gte } from "drizzle-orm";

// server/imageGen.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

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

// server/state.ts
var UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "") || "";
var UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
var isDurable = Boolean(UPSTASH_URL && UPSTASH_TOKEN);
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

// server/nftSecurity.ts
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

// server/behaviour.ts
var BEHAVIOUR_TTL = 30 * 24 * 60 * 60;
var CAMPAIGN_WINDOW_MS = 10 * 60 * 1e3;

// server/wildlife.ts
import OpenAI2 from "openai";
var openai2 = new OpenAI2({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

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
var openai3 = new OpenAI3({
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
var CHARACTERS = LOCKED_PIECES.map((p) => ({
  name: `${p.id} ${p.name}`,
  desc: p.detail
}));
var featureSettingsCache = /* @__PURE__ */ new Map();
function invalidateFeatureCache(chatId) {
  featureSettingsCache.delete(chatId);
}
function invalidateCommunityCache(chatId) {
  communityCache.delete(chatId);
}
var _botInstance = null;
function getBotInstance() {
  return _botInstance;
}
var communityCache = /* @__PURE__ */ new Map();
var HATE_SPEECH_WARNING_RESET = 24 * 60 * 60 * 1e3;
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
var OWNER_PROFILE = [
  "He is the owner and creator of the Boomerverse, and a boomer by name, nature and age.",
  "He is an artist: an NFT artist and an AI artist. He loves art.",
  "He lives in Tasmania, Australia.",
  "He loves fishing, walking and the wilderness, and he rides and cycles.",
  "He cares about fitness, and about endangered animals, wildlife and the native fauna and flora.",
  "He is into AI and his AI family.",
  "He follows Australian rules football (he barracks for the Sydney Swans) and soccer (Western Sydney Wanderers)."
].map((l) => "- " + l).join("\n");
var WARDEN_SYSTEM_PROMPT = `You are The Warden (@${BOT_USERNAME2}), keeper of the Gateway for the Boomerverse community.

${WARDEN_IDENTITY}

CONFIRMED PROJECT FACTS \u2014 these you may state:
${PROJECT_INFO}

ABOUT THE OWNER (@aussieboomer) \u2014 confirmed, you may state these and use them naturally, never in a way that mocks him:
${OWNER_PROFILE}

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
var CONVERSATION_TTL_SECONDS = 20 * 60;
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
var PILE_WINDOW_MS = 10 * 60 * 1e3;
var PILE_FREEZE_MS = 10 * 60 * 1e3;

// server/adminRoutes.ts
var ROLE_RANK = { moderator: 1, admin: 2, owner: 3 };
async function loadSessionUser(req) {
  if (!req.session.userId) return null;
  const [u] = await db.select().from(adminUsers).where(eq3(adminUsers.id, req.session.userId)).limit(1);
  if (!u) {
    req.session.destroy(() => {
    });
    return null;
  }
  if (req.session.role !== u.role) req.session.role = u.role;
  return { id: u.id, role: u.role, email: u.email };
}
async function requireAuth(req, res, next) {
  const user = await loadSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });
  req.adminUser = user;
  next();
}
function requireRole(min) {
  return async (req, res, next) => {
    const user = await loadSessionUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });
    if (ROLE_RANK[user.role] < ROLE_RANK[min]) {
      return res.status(403).json({ error: `Requires ${min} role` });
    }
    req.adminUser = user;
    next();
  };
}
var FEATURE_GROUPS = {
  Safety: ["spam", "scam", "hate", "links", "files", "edits", "newuser"],
  Security: ["raid", "impersonation", "captcha", "accountAge", "massMention", "bioScan"],
  "AI & Voice": ["personality", "learning", "aiChat", "stories"],
  Community: ["scheduled", "giveaways", "games", "trust"]
};
var ALL_FEATURES = Object.values(FEATURE_GROUPS).flat();
function todayStr() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
async function audit(req, action, targetType, targetId, details) {
  const user = req.adminUser || { id: req.session.userId, email: req.session.email, role: req.session.role };
  try {
    await db.insert(adminAuditLog).values({
      adminUserId: user?.id ?? null,
      adminEmail: user?.email ?? "unknown",
      adminRole: user?.role ?? "unknown",
      action,
      targetType,
      targetId,
      details: details ? JSON.stringify(details) : null
    });
  } catch (e) {
    console.error("audit log write failed:", e);
  }
}
function registerAdminRoutes(app2) {
  app2.get("/api/admin/auth/me", async (req, res) => {
    if (!req.session.userId) return res.json({ user: null, needsBootstrap: await needsBootstrap() });
    const [u] = await db.select().from(adminUsers).where(eq3(adminUsers.id, req.session.userId)).limit(1);
    if (!u) {
      req.session.destroy(() => {
      });
      return res.json({ user: null });
    }
    res.json({ user: { id: u.id, email: u.email, role: u.role, displayName: u.displayName } });
  });
  app2.post("/api/admin/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const [u] = await db.select().from(adminUsers).where(eq3(adminUsers.email, String(email).toLowerCase())).limit(1);
    if (!u) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    req.session.userId = u.id;
    req.session.role = u.role;
    req.session.email = u.email;
    await db.update(adminUsers).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq3(adminUsers.id, u.id));
    res.json({ user: { id: u.id, email: u.email, role: u.role, displayName: u.displayName } });
  });
  app2.post("/api/admin/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
  app2.post("/api/admin/auth/bootstrap", async (req, res) => {
    if (!await needsBootstrap()) return res.status(403).json({ error: "Bootstrap already completed" });
    const { email, password, displayName } = req.body || {};
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: "Email and password (min 8 chars) required" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await db.insert(adminUsers).values({
      email: String(email).toLowerCase(),
      passwordHash,
      displayName: displayName || null,
      role: "owner"
    }).returning();
    req.session.userId = u.id;
    req.session.role = u.role;
    req.session.email = u.email;
    res.json({ user: { id: u.id, email: u.email, role: u.role, displayName: u.displayName } });
  });
  app2.get("/api/admin/auth/invite/:token", async (req, res) => {
    const [inv] = await db.select().from(adminInvites).where(eq3(adminInvites.token, req.params.token)).limit(1);
    if (!inv) return res.status(404).json({ error: "Invite not found" });
    if (inv.acceptedAt) return res.status(410).json({ error: "Invite already used" });
    if (inv.expiresAt < /* @__PURE__ */ new Date()) return res.status(410).json({ error: "Invite expired" });
    res.json({ email: inv.email, role: inv.role });
  });
  app2.post("/api/admin/auth/invite/:token", async (req, res) => {
    const { password, displayName } = req.body || {};
    if (!password || password.length < 8) return res.status(400).json({ error: "Password min 8 chars" });
    const [inv] = await db.select().from(adminInvites).where(eq3(adminInvites.token, req.params.token)).limit(1);
    if (!inv) return res.status(404).json({ error: "Invite not found" });
    if (inv.acceptedAt) return res.status(410).json({ error: "Invite already used" });
    if (inv.expiresAt < /* @__PURE__ */ new Date()) return res.status(410).json({ error: "Invite expired" });
    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await db.insert(adminUsers).values({
      email: inv.email.toLowerCase(),
      passwordHash,
      displayName: displayName || null,
      role: inv.role,
      invitedBy: inv.invitedBy
    }).returning();
    await db.update(adminInvites).set({ acceptedAt: /* @__PURE__ */ new Date() }).where(eq3(adminInvites.id, inv.id));
    req.session.userId = u.id;
    req.session.role = u.role;
    req.session.email = u.email;
    res.json({ user: { id: u.id, email: u.email, role: u.role, displayName: u.displayName } });
  });
  app2.get("/api/admin/team", requireRole("owner"), async (_req, res) => {
    const users = await db.select().from(adminUsers).orderBy(adminUsers.createdAt);
    const invites = await db.select().from(adminInvites).where(sql3`${adminInvites.acceptedAt} IS NULL AND ${adminInvites.expiresAt} > NOW()`);
    res.json({
      users: users.map((u) => ({ id: u.id, email: u.email, role: u.role, displayName: u.displayName, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt })),
      invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token, expiresAt: i.expiresAt }))
    });
  });
  app2.post("/api/admin/team/invite", requireRole("owner"), async (req, res) => {
    const { email, role } = req.body || {};
    if (!email || !["owner", "admin", "moderator"].includes(role)) {
      return res.status(400).json({ error: "Email and valid role required" });
    }
    const existing = await db.select().from(adminUsers).where(eq3(adminUsers.email, String(email).toLowerCase())).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: "User with that email already exists" });
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
    const [inv] = await db.insert(adminInvites).values({
      email: String(email).toLowerCase(),
      role,
      token,
      invitedBy: req.session.userId,
      expiresAt
    }).returning();
    await audit(req, "team.invite", "team_member", String(inv.id), { email: inv.email, role: inv.role });
    res.json({ invite: inv, acceptUrl: `/admin/accept-invite/${token}` });
  });
  app2.delete("/api/admin/team/invite/:id", requireRole("owner"), async (req, res) => {
    await db.delete(adminInvites).where(eq3(adminInvites.id, parseInt(req.params.id)));
    await audit(req, "team.invite.cancel", "team_member", req.params.id);
    res.json({ ok: true });
  });
  app2.patch("/api/admin/team/:id", requireRole("owner"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { role } = req.body || {};
    if (!["owner", "admin", "moderator"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    if (id === req.session.userId && role !== "owner") {
      return res.status(400).json({ error: "Cannot demote yourself" });
    }
    const [before] = await db.select().from(adminUsers).where(eq3(adminUsers.id, id)).limit(1);
    await db.update(adminUsers).set({ role }).where(eq3(adminUsers.id, id));
    await audit(req, "team.role.change", "team_member", String(id), { from: before?.role, to: role, email: before?.email });
    res.json({ ok: true });
  });
  app2.delete("/api/admin/team/:id", requireRole("owner"), async (req, res) => {
    const id = parseInt(req.params.id);
    if (id === req.session.userId) return res.status(400).json({ error: "Cannot remove yourself" });
    const [before] = await db.select().from(adminUsers).where(eq3(adminUsers.id, id)).limit(1);
    await db.delete(adminUsers).where(eq3(adminUsers.id, id));
    await audit(req, "team.remove", "team_member", String(id), { email: before?.email, role: before?.role });
    res.json({ ok: true });
  });
  app2.get("/api/admin/communities", requireAuth, async (_req, res) => {
    const rows = await db.select().from(communities).orderBy(desc2(communities.createdAt));
    const today = todayStr();
    const result = [];
    for (const c of rows) {
      const [stats] = await db.select().from(moderationStats).where(and2(eq3(moderationStats.chatId, c.chatId), eq3(moderationStats.date, today))).limit(1);
      const [{ count: memberCount }] = await db.select({ count: sql3`count(*)::int` }).from(memberScores).where(eq3(memberScores.chatId, c.chatId));
      result.push({
        chatId: c.chatId,
        displayName: c.displayName,
        botNickname: c.botNickname,
        status: c.status,
        trialExpiresAt: c.trialExpiresAt,
        isOnboarded: c.isOnboarded,
        memberCount,
        todayStats: stats ? {
          newJoins: stats.newJoins,
          messagesBlocked: stats.messagesBlocked,
          warnCount: stats.warnCount,
          muteCount: stats.muteCount,
          spamBlocked: stats.spamBlocked,
          scamsBlocked: stats.scamsBlocked
        } : null,
        createdAt: c.createdAt
      });
    }
    res.json(result);
  });
  app2.get("/api/admin/communities/:chatId", requireAuth, async (req, res) => {
    const chatId = req.params.chatId;
    const [c] = await db.select().from(communities).where(eq3(communities.chatId, chatId)).limit(1);
    if (!c) return res.status(404).json({ error: "Community not found" });
    let [features] = await db.select().from(chatFeatureSettings).where(eq3(chatFeatureSettings.chatId, chatId)).limit(1);
    if (!features) {
      [features] = await db.insert(chatFeatureSettings).values({ chatId }).returning();
    }
    const [{ count: memberCount }] = await db.select({ count: sql3`count(*)::int` }).from(memberScores).where(eq3(memberScores.chatId, chatId));
    res.json({
      community: c,
      features,
      featureGroups: FEATURE_GROUPS,
      memberCount
    });
  });
  app2.patch("/api/admin/communities/:chatId/features", requireRole("admin"), async (req, res) => {
    const chatId = req.params.chatId;
    const { feature, value } = req.body || {};
    if (!ALL_FEATURES.includes(feature)) return res.status(400).json({ error: "Unknown feature" });
    if (typeof value !== "boolean") return res.status(400).json({ error: "Value must be boolean" });
    await db.insert(chatFeatureSettings).values({ chatId, [feature]: value }).onConflictDoUpdate({ target: chatFeatureSettings.chatId, set: { [feature]: value } });
    invalidateFeatureCache(chatId);
    await audit(req, "feature.toggle", "community", chatId, { feature, value });
    res.json({ ok: true });
  });
  app2.patch("/api/admin/communities/:chatId/status", requireRole("owner"), async (req, res) => {
    const chatId = req.params.chatId;
    const { status } = req.body || {};
    if (!["trial", "active", "free", "complimentary", "banned"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [before] = await db.select().from(communities).where(eq3(communities.chatId, chatId)).limit(1);
    await db.update(communities).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(communities.chatId, chatId));
    invalidateCommunityCache(chatId);
    await audit(req, "community.status", "community", chatId, { from: before?.status, to: status });
    res.json({ ok: true });
  });
  app2.patch("/api/admin/communities/:chatId/trial", requireRole("admin"), async (req, res) => {
    const chatId = req.params.chatId;
    const { days } = req.body || {};
    const d = parseInt(days);
    if (!d || d < 1 || d > 365) return res.status(400).json({ error: "Days must be 1-365" });
    const [c] = await db.select().from(communities).where(eq3(communities.chatId, chatId)).limit(1);
    if (!c) return res.status(404).json({ error: "Not found" });
    const base = c.trialExpiresAt && c.trialExpiresAt > /* @__PURE__ */ new Date() ? c.trialExpiresAt : /* @__PURE__ */ new Date();
    const newExpiry = new Date(base.getTime() + d * 24 * 60 * 60 * 1e3);
    await db.update(communities).set({ trialExpiresAt: newExpiry, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(communities.chatId, chatId));
    invalidateCommunityCache(chatId);
    await audit(req, "community.trial.extend", "community", chatId, { days: d, newExpiry });
    res.json({ ok: true, trialExpiresAt: newExpiry });
  });
  app2.delete("/api/admin/communities/:chatId", requireRole("owner"), async (req, res) => {
    const chatId = req.params.chatId;
    const [before] = await db.select().from(communities).where(eq3(communities.chatId, chatId)).limit(1);
    await db.delete(chatFeatureSettings).where(eq3(chatFeatureSettings.chatId, chatId));
    await db.delete(communities).where(eq3(communities.chatId, chatId));
    invalidateCommunityCache(chatId);
    invalidateFeatureCache(chatId);
    await audit(req, "community.delete", "community", chatId, { displayName: before?.displayName });
    res.json({ ok: true });
  });
  app2.get("/api/admin/communities/:chatId/violations", requireAuth, async (req, res) => {
    const rows = await db.select().from(violationLogs).where(eq3(violationLogs.chatId, req.params.chatId)).orderBy(desc2(violationLogs.createdAt)).limit(100);
    res.json(rows);
  });
  app2.delete("/api/admin/violations/:id", requireAuth, async (req, res) => {
    await db.delete(violationLogs).where(eq3(violationLogs.id, parseInt(req.params.id)));
    await audit(req, "violation.clear", "violation", req.params.id);
    res.json({ ok: true });
  });
  app2.get("/api/admin/communities/:chatId/members", requireAuth, async (req, res) => {
    const rows = await db.select().from(memberScores).where(eq3(memberScores.chatId, req.params.chatId)).orderBy(desc2(memberScores.messageCount)).limit(50);
    res.json(rows);
  });
  app2.get("/api/admin/communities/:chatId/bans", requireAuth, async (req, res) => {
    const rows = await db.select().from(banEvents).where(eq3(banEvents.chatId, req.params.chatId)).orderBy(desc2(banEvents.createdAt)).limit(50);
    res.json(rows);
  });
  app2.get("/api/admin/stats", requireRole("admin"), async (_req, res) => {
    const [{ communities: communityCount }] = await db.select({
      communities: sql3`count(*)::int`
    }).from(communities);
    const [{ active }] = await db.select({ active: sql3`count(*)::int` }).from(communities).where(eq3(communities.status, "active"));
    const [{ trial }] = await db.select({ trial: sql3`count(*)::int` }).from(communities).where(eq3(communities.status, "trial"));
    const [{ members }] = await db.select({ members: sql3`count(distinct ${memberScores.telegramUserId})::int` }).from(memberScores);
    const today = todayStr();
    const todays = await db.select().from(moderationStats).where(eq3(moderationStats.date, today));
    const todayAgg = todays.reduce((acc, s) => ({
      newJoins: acc.newJoins + (s.newJoins || 0),
      messagesBlocked: acc.messagesBlocked + (s.messagesBlocked || 0),
      warnCount: acc.warnCount + (s.warnCount || 0),
      muteCount: acc.muteCount + (s.muteCount || 0),
      spamBlocked: acc.spamBlocked + (s.spamBlocked || 0),
      scamsBlocked: acc.scamsBlocked + (s.scamsBlocked || 0)
    }), { newJoins: 0, messagesBlocked: 0, warnCount: 0, muteCount: 0, spamBlocked: 0, scamsBlocked: 0 });
    const [{ violations }] = await db.select({ violations: sql3`count(*)::int` }).from(violationLogs);
    const [{ bans }] = await db.select({ bans: sql3`count(*)::int` }).from(globalBans);
    res.json({
      communities: communityCount,
      activeCommunities: active,
      trialCommunities: trial,
      totalMembers: members,
      todayStats: todayAgg,
      totalViolations: violations,
      globalBans: bans
    });
  });
  app2.get("/api/admin/global-bans", requireRole("admin"), async (_req, res) => {
    const rows = await db.select().from(globalBans).orderBy(desc2(globalBans.createdAt)).limit(200);
    res.json(rows);
  });
  app2.delete("/api/admin/global-bans/:id", requireRole("admin"), async (req, res) => {
    await db.delete(globalBans).where(eq3(globalBans.id, parseInt(req.params.id)));
    await audit(req, "global_ban.remove", "global_ban", req.params.id);
    res.json({ ok: true });
  });
  app2.post("/api/admin/broadcast", requireRole("owner"), async (req, res) => {
    const { message, target } = req.body || {};
    if (!message || typeof message !== "string" || message.length < 1) {
      return res.status(400).json({ error: "Message required" });
    }
    const bot = getBotInstance();
    if (!bot) return res.status(503).json({ error: "Bot not available" });
    const tgt = target || "active";
    const rows = tgt === "all" ? await db.select().from(communities) : await db.select().from(communities).where(sql3`${communities.status} IN ('active', 'trial', 'complimentary')`);
    let success = 0, failed = 0;
    for (const c of rows) {
      try {
        await bot.api.sendMessage(c.chatId, message, { parse_mode: "Markdown" });
        success++;
      } catch {
        failed++;
      }
    }
    await audit(req, "broadcast.send", "global", null, {
      target: tgt,
      total: rows.length,
      success,
      failed,
      preview: message.slice(0, 200)
    });
    res.json({ ok: true, success, failed, total: rows.length });
  });
  app2.get("/api/admin/audit", requireRole("admin"), async (_req, res) => {
    const rows = await db.select().from(adminAuditLog).orderBy(desc2(adminAuditLog.createdAt)).limit(200);
    res.json(rows);
  });
  app2.get("/api/admin/instances", requireRole("owner"), async (_req, res) => {
    const rows = await db.select().from(botInstances).orderBy(desc2(botInstances.isLocal), botInstances.name);
    res.json(rows.map((r) => ({ ...r, sharedSecret: r.isLocal ? r.sharedSecret : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })));
  });
  app2.post("/api/admin/instances", requireRole("owner"), async (req, res) => {
    const { name, baseUrl, sharedSecret } = req.body || {};
    if (!name || !baseUrl || !sharedSecret) {
      return res.status(400).json({ error: "name, baseUrl and sharedSecret are required" });
    }
    const cleanUrl = String(baseUrl).replace(/\/+$/, "");
    try {
      const [row] = await db.insert(botInstances).values({
        name: String(name).trim(),
        baseUrl: cleanUrl,
        sharedSecret: String(sharedSecret),
        isLocal: false,
        addedByUserId: req.adminUser.id
      }).returning();
      await audit(req, "instance.add", "instance", String(row.id), { name: row.name, baseUrl: row.baseUrl });
      res.json(row);
    } catch (e) {
      if (String(e?.message || "").includes("unique")) {
        return res.status(409).json({ error: "An instance with that name already exists" });
      }
      res.status(500).json({ error: "Failed to add instance" });
    }
  });
  app2.delete("/api/admin/instances/:id", requireRole("owner"), async (req, res) => {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(botInstances).where(eq3(botInstances.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.isLocal) return res.status(400).json({ error: "Cannot remove the local instance" });
    await db.delete(botInstances).where(eq3(botInstances.id, id));
    await audit(req, "instance.remove", "instance", String(id), { name: existing.name });
    res.json({ ok: true });
  });
  app2.post("/api/admin/instances/:id/test", requireRole("owner"), async (req, res) => {
    const id = parseInt(req.params.id);
    const [inst] = await db.select().from(botInstances).where(eq3(botInstances.id, id)).limit(1);
    if (!inst) return res.status(404).json({ error: "Not found" });
    const result = await callInstance(inst, "/api/hub/info");
    await db.update(botInstances).set({
      status: result.ok ? "ok" : "down",
      lastSeenAt: result.ok ? /* @__PURE__ */ new Date() : inst.lastSeenAt,
      lastError: result.ok ? null : result.error
    }).where(eq3(botInstances.id, id));
    await audit(req, "instance.test", "instance", String(id), { ok: result.ok, error: result.error });
    res.json({ ok: result.ok, info: result.data, error: result.error });
  });
  app2.get("/api/admin/instances/aggregate", requireRole("admin"), async (_req, res) => {
    const rows = await db.select().from(botInstances);
    const results = await Promise.all(rows.map(async (inst) => {
      const [info, stats] = await Promise.all([
        callInstance(inst, "/api/hub/info"),
        callInstance(inst, "/api/hub/stats")
      ]);
      const ok = info.ok && stats.ok;
      db.update(botInstances).set({
        status: ok ? "ok" : "down",
        lastSeenAt: ok ? /* @__PURE__ */ new Date() : inst.lastSeenAt,
        lastError: ok ? null : info.error || stats.error
      }).where(eq3(botInstances.id, inst.id)).catch(() => {
      });
      return {
        id: inst.id,
        name: inst.name,
        baseUrl: inst.baseUrl,
        isLocal: inst.isLocal,
        status: ok ? "ok" : "down",
        info: info.data,
        stats: stats.data,
        error: ok ? null : info.error || stats.error
      };
    }));
    res.json(results);
  });
}
async function callInstance(inst, path) {
  const url = inst.baseUrl.replace(/\/+$/, "") + path;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8e3);
    const r = await fetch(url, {
      headers: { "x-hub-secret": inst.sharedSecret, "accept": "application/json" },
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    return { ok: true, data: await r.json() };
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}
async function needsBootstrap() {
  try {
    const [{ count }] = await db.select({ count: sql3`count(*)::int` }).from(adminUsers);
    return count === 0;
  } catch {
    return false;
  }
}

// server/hubApi.ts
import { eq as eq4, sql as sql4 } from "drizzle-orm";
function todayStr2() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
async function requireHubSecret(req, res, next) {
  const provided = req.header("x-hub-secret");
  if (!provided) return res.status(401).json({ error: "Missing x-hub-secret" });
  const [local] = await db.select().from(botInstances).where(eq4(botInstances.isLocal, true)).limit(1);
  if (!local) return res.status(503).json({ error: "Local instance not initialized" });
  if (provided !== local.sharedSecret) return res.status(403).json({ error: "Invalid hub secret" });
  next();
}
function registerHubApi(app2) {
  app2.get("/api/hub/info", requireHubSecret, async (_req, res) => {
    const [local] = await db.select().from(botInstances).where(eq4(botInstances.isLocal, true)).limit(1);
    const [{ memberCount }] = await db.select({ memberCount: sql4`count(*)::int` }).from(memberScores);
    res.json({
      name: local?.name || "unnamed",
      version: "1.0.0",
      memberCount,
      uptimeSec: Math.round(process.uptime()),
      startedAt: new Date(Date.now() - process.uptime() * 1e3).toISOString()
    });
  });
  app2.get("/api/hub/stats", requireHubSecret, async (_req, res) => {
    const [{ communityCount }] = await db.select({ communityCount: sql4`count(*)::int` }).from(communities);
    const [{ active }] = await db.select({ active: sql4`count(*)::int` }).from(communities).where(eq4(communities.status, "active"));
    const [{ trial }] = await db.select({ trial: sql4`count(*)::int` }).from(communities).where(eq4(communities.status, "trial"));
    const [{ members }] = await db.select({ members: sql4`count(*)::int` }).from(memberScores);
    const [{ violations }] = await db.select({ violations: sql4`count(*)::int` }).from(violationLogs);
    const today = todayStr2();
    const todayRows = await db.select().from(moderationStats).where(eq4(moderationStats.date, today));
    const todayAgg = todayRows.reduce((acc, r) => ({
      newJoins: acc.newJoins + (r.newJoins ?? 0),
      messagesBlocked: acc.messagesBlocked + (r.messagesBlocked ?? 0),
      warnCount: acc.warnCount + (r.warnCount ?? 0),
      muteCount: acc.muteCount + (r.muteCount ?? 0),
      spamBlocked: acc.spamBlocked + (r.spamBlocked ?? 0),
      scamsBlocked: acc.scamsBlocked + (r.scamsBlocked ?? 0)
    }), { newJoins: 0, messagesBlocked: 0, warnCount: 0, muteCount: 0, spamBlocked: 0, scamsBlocked: 0 });
    res.json({
      communities: communityCount,
      activeCommunities: active,
      trialCommunities: trial,
      totalMembers: members,
      totalViolations: violations,
      todayStats: todayAgg
    });
  });
  app2.get("/api/hub/communities", requireHubSecret, async (_req, res) => {
    const rows = await db.select({
      chatId: communities.chatId,
      displayName: communities.displayName,
      status: communities.status,
      trialExpiresAt: communities.trialExpiresAt
    }).from(communities);
    res.json(rows);
  });
}

// api-src/admin.ts
var app = null;
function getApp() {
  if (app) return app;
  const a = express();
  a.use(express.json({ limit: "2mb" }));
  a.use(express.urlencoded({ extended: false }));
  a.set("trust proxy", 1);
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }
  const PgStore = connectPgSimple(session2);
  a.use(session2({
    store: new PgStore({ pool, tableName: "session", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1e3
    }
  }));
  registerAdminRoutes(a);
  registerHubApi(a);
  a.get("/health", (_req, res) => {
    res.json({ status: "ok", bot: (process.env.BOT_USERNAME || "RiftWardenBot").replace(/^@/, "") });
  });
  app = a;
  return a;
}
function admin(req, res) {
  return getApp()(req, res);
}
export {
  admin as default
};
