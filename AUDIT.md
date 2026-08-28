# The Warden — File Audit

**68 files. Zero type errors across server, api, shared and client.**

Every file checked for three things: does anything import it, does it contain
legacy content, and does it still describe the bot accurately.

**CORE** runs in production · **USED** imported and working · **DEV** local only · **CONFIG/DOCS** support

## Vercel entry points

| File | Lines | Verdict | Purpose |
|---|---|---|---|
| `api/admin.ts` | 58 | CORE | Admin portal as a serverless function |
| `api/cron.ts` | 28 | CORE | Scheduled work. Replaced ten setInterval timers. |
| `api/set-webhook.ts` | 42 | CORE | One-time setup — points Telegram at your deployment |
| `api/telegram.ts` | 50 | CORE | Webhook — Telegram pushes every update here |

## Server

| File | Lines | Verdict | Purpose |
|---|---|---|---|
| `server/adminRoutes.ts` | 555 | CORE | Admin portal API — auth, communities, feature toggles |
| `server/bootInstance.ts` | 31 | USED | Registers this deployment in bot_instances |
| `server/bot.ts` | 10107 | CORE | The bot itself — commands, moderation, games, cron tick |
| `server/communityService.ts` | 69 | USED | Subscription tier changes |
| `server/db.ts` | 34 | CORE | Postgres connection, tuned for serverless (max 1 connection) |
| `server/hubApi.ts` | 75 | USED | Multi-instance aggregation API |
| `server/imageGen.ts` | 29 | USED | OpenAI image generation for birthday and winner cards |
| `server/index.ts` | 85 | DEV | LOCAL ONLY — long-polling server. Refuses to run on Vercel. |
| `server/nftSecurity.ts` | 309 | CORE | NFT threat detection: fake verification bots, lookalike domains, homoglyphs, admin compromise |
| `server/riftLore.ts` | 391 | CORE | Boomerverse canon and the Warden voice. Edit this for lore. |
| `server/routes.ts` | 178 | USED | Public API + first-boot database seeding |
| `server/state.ts` | 204 | CORE | Durable state — Redis over HTTPS, in-memory fallback for local dev |
| `server/storage.ts` | 82 | USED | Data access for characters and content items |
| `server/vite.ts` | 70 | DEV | Vite dev middleware. Local only. |

## Shared

| File | Lines | Verdict | Purpose |
|---|---|---|---|
| `shared/routes.ts` | 38 | USED | Shared API route definitions |
| `shared/schema.ts` | 565 | CORE | Database schema. Seven tables marked RETIRED. |

## Admin portal pages

| File | Lines | Verdict | Purpose |
|---|---|---|---|
| `client/src/pages/admin/AcceptInvite.tsx` | 74 | USED | Admin portal page |
| `client/src/pages/admin/Activity.tsx` | 127 | USED | Admin portal page |
| `client/src/pages/admin/AdminLayout.tsx` | 102 | USED | Admin portal page |
| `client/src/pages/admin/AllBots.tsx` | 134 | USED | Admin portal page |
| `client/src/pages/admin/Bootstrap.tsx` | 73 | USED | Admin portal page |
| `client/src/pages/admin/BotControls.tsx` | 170 | USED | Admin portal page |
| `client/src/pages/admin/BotReference.tsx` | 229 | USED | Admin portal page |
| `client/src/pages/admin/CommunityDetail.tsx` | 255 | USED | Admin portal page |
| `client/src/pages/admin/Dashboard.tsx` | 171 | USED | Admin portal page |
| `client/src/pages/admin/Instances.tsx` | 181 | USED | Admin portal page |
| `client/src/pages/admin/Login.tsx` | 62 | USED | Admin portal page |
| `client/src/pages/admin/Team.tsx` | 186 | USED | Admin portal page |

## Client

| File | Lines | Verdict | Purpose |
|---|---|---|---|
| `client/src/App.tsx` | 54 | USED | Client support file |
| `client/src/components/ui/badge.tsx` | 38 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/button.tsx` | 62 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/card.tsx` | 85 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/input.tsx` | 23 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/label.tsx` | 24 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/select.tsx` | 160 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/switch.tsx` | 27 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/table.tsx` | 117 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/tabs.tsx` | 53 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/textarea.tsx` | 22 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/toast.tsx` | 127 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/toaster.tsx` | 33 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/components/ui/tooltip.tsx` | 30 | USED | shadcn component — 13 of 47 kept, 34 unused deleted |
| `client/src/hooks/use-toast.ts` | 191 | USED | Client support file |
| `client/src/index.css` | 117 | CONFIG | Styles |
| `client/src/lib/queryClient.ts` | 57 | USED | Client support file |
| `client/src/lib/utils.ts` | 6 | USED | Client support file |
| `client/src/main.tsx` | 5 | USED | Client support file |
| `client/src/pages/Dashboard.tsx` | 414 | USED | Client support file |
| `client/src/pages/not-found.tsx` | 21 | USED | Client support file |

## Client root

| File | Lines | Verdict | Purpose |
|---|---|---|---|
| `client/index.html` | 14 | USED | Client support file |
| `client/public/favicon.png` | 6 | CONFIG | Favicon |

## Root

| File | Lines | Verdict | Purpose |
|---|---|---|---|
| `.env.example` | 43 | DOCS | Every env var, and what breaks without it |
| `.gitignore` | 8 | CONFIG | Excludes node_modules, dist, .env, .vercel |
| `README.md` | 218 | DOCS | Setup, no-lore-drift rule, Vercel deploy, known gaps |
| `components.json` | 19 | CONFIG | shadcn config |
| `drizzle.config.ts` | 14 | CONFIG | Database migration config |
| `package-lock.json` | 9876 | CONFIG | Dependency lockfile |
| `package.json` | 81 | CONFIG | 35 deps + 21 dev. 40 unused packages removed. |
| `postcss.config.js` | 6 | CONFIG | Styling |
| `tailwind.config.ts` | 109 | CONFIG | Styling |
| `tsconfig.json` | 23 | CONFIG | TypeScript config |
| `vercel.json` | 32 | CORE | Functions, cron schedule, rewrites, security headers |
| `vite.config.ts` | 24 | CONFIG | Client build config |

## Removed in this audit

| What | Why |
|---|---|
| `shared/models/chat.ts` | Tables for a chat feature that doesn't exist. Nothing imported it. |
| `client/requirements.md` | Scratch note. |
| `client/src/hooks/use-mobile.tsx` | Never imported. |
| 4 public marketing pages | Inherited marketing site that didn't match the project. The real Boomerverse site is separate. |
| 3 public components + 2 hooks | Only used by those pages. |
| 34 shadcn UI components | Never imported. Calendar, carousel, sidebar, command palette and 30 more. |
| 40 npm dependencies | 79 packages. Mostly Radix backing the deleted components. |
| 93 lines of inherited term lists | Every function using them was already gone. |
| 8 dead functions (170 lines) | `getTopUsers`, `fetchCryptoMarket`, `formatMarketReport`, `getSeasonalContext` and 4 more — declared, never called. |
| `/restore` command (84 lines) | Only unsuspended 'referrers'. Rewritten as a plain unmute + offence reset. |
| Duplicate section header | Left over from an earlier restore. |

## Fixed, not removed

| What | Was |
|---|---|
| `BotReference.tsx` | Advertised six commands that no longer exist as working. |
| `adminRoutes.ts`, owner Dashboard, `CommunityDetail.tsx` | Listed 6 feature toggles that no longer exist. All four surfaces now match the bot's 21 exactly — verified programmatically. |
| `server/routes.ts` seed data | Seeded the database on first boot with inherited placeholder characters and content. |
| 7 database tables + 11 dead columns | Removed outright. New bot, new database — nothing to migrate. |

## Known gaps

- Five `TODO(CANON)` lists in `riftLore.ts` need your Rulebook values: 10 species families, 12 classes, 7 Rift Energy states, 19 regions, and trigger words for the 10 protected mysteries. Leaving them empty is safe — the Warden declines rather than inventing.
- The client bundle has never been built in my sandbox (Rollup's native binary crashes here, unrelated to your code). Vercel will build it.
- Nothing has been tested against live Telegram. Detection logic is unit-tested; whether a ban actually lands depends on the bot's permissions in your group.