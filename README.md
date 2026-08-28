# The Warden (@RiftWardenBot)

Telegram community manager for the Boomerverse community.

Runs on Vercel. Telegram pushes updates to `api/telegram.ts`, scheduled work
runs from `api/cron.ts`, and the admin portal is served by `api/admin.ts`.

---

## The one rule that matters

**The Warden never invents canon.**

If a fact is not written in `server/riftLore.ts`, the Warden does not know it,
does not guess at it, and says so plainly. This is enforced in three places:

1. `riftLore.ts` holds only confirmed material.
2. The AI system prompt (`WARDEN_SYSTEM_PROMPT` in `server/bot.ts`) forbids
   invention, speculation, price talk, and reward promises.
3. `checkKnowledgeBases()` answers the common questions from the lore file
   directly, without calling the AI at all.

Four lists in `riftLore.ts` are deliberately empty and marked `TODO(CANON)`:

- `SPECIES_FAMILIES` — 10 names
- `CLASSES` — 12 names
- `RIFT_ENERGY_STATES` — 7 names
- `REGIONS` — 19 names
- `PROTECTED_MYSTERY_TRIGGERS` — keywords for the 10 protected mysteries

Leaving them empty is **safe**. The Warden will answer "there are 12 classes,
the names are in the Master Rulebook, and I'd rather be silent than wrong."

Filling them with guesses is **not safe** — that creates canon by accident.
Paste them in from the Rulebook when you're ready.

---

## Setup

### 1. Install

```
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill it in.

| Variable | What it is |
|---|---|
| `BOT_USERNAME` | `RiftWardenBot` (without @). |
| `BOT_PUBLIC_URL` | `https://t.me/RiftWardenBot`. |
| `TELEGRAM_BOT_TOKEN` | From BotFather. Treat it like a password. |
| `GLOBAL_OWNER_USER_ID` | Your numeric Telegram ID (not your @username). Message @userinfobot to get it. |
| `DATABASE_URL` | Postgres connection string. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | For AI replies. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Endpoint for the above. |
| `SESSION_SECRET` | Any long random string. Signs admin portal logins. |
| `WARDEN_TRUST_MANAGERS` | Optional. @usernames allowed to run trust commands, comma separated. |

**Never paste the bot token into a chat, an issue, or a commit.** If it leaks,
revoke it in BotFather with `/revoke` and generate a new one. `.env` is already
in `.gitignore`.

### 3. Database

```
npm run db:push
```

### 4. BotFather settings

- Privacy mode **off** — otherwise the bot only sees messages that mention it,
  and moderation won't work.
- Add the bot to the group as an **admin** with delete, ban, and invite rights.

### 5. Run

```
npm run dev      # development
npm run build    # production build
npm start        # production
```

---

## Abuse limits and behavioural detection

**Webhook rate limiting.** Every Telegram update costs a Vercel invocation, so a
flood is a bill as well as a nuisance. Limits are 600 updates/minute globally,
240 per group, 60 per account — generous enough that real conversation never
touches them. Over the limit, updates are dropped before any expensive work
starts, and Telegram is still answered 200 so it doesn't retry the flood back.

**Behavioural anomaly detection** (`server/behaviour.ts`). Every other check in
this bot matches a known pattern, which works right up until someone reads the
patterns and rewords. This one never reads the message. It watches what the
account *does*:

- a link in the first message, within a minute of arriving
- most of everything they've ever posted carrying links
- the same message *shape* repeating — the signature of a script, even when the
  wording rotates
- posting faster than a person types
- a brand-new account posting links or forwards
- one account working several groups at once with no history

Score 60+ deletes and mutes. 35+ flags for review. Trusted regulars are exempt.

**Coordinated campaign detection.** Raid detection counts joins. This catches
what they do afterwards: three or more different accounts posting structurally
identical link messages inside ten minutes triggers a lockdown and removal.

**Cross-group ban sync.** Back on, and it now covers automatic bans as well as
manual ones. Someone banned in one group I manage is removed on arrival in any
other. Toggle: `crossBan`.

**Permission self-check.** The bot verifies its own Telegram permissions daily
and posts what's missing. Without delete and ban rights, most protections look
like they're working while quietly enforcing nothing — that's the failure nobody
notices until it matters.

## Owner-only bot rule

**Only the global owner can add a bot to the group.** Any bot added by anyone
else is removed immediately and logged, whatever it's called.

This is deliberately stricter than checking the name. Telegram has no verified
badge for bots, so a name proves nothing — and a bot in the group can read every
message and post to everyone the moment it lands. "Was it added by the owner?"
has a real answer. "Does the name look dodgy?" is a guess.

Two things this depends on:

1. **`GLOBAL_OWNER_USER_ID` must be set** to your numeric Telegram ID. Without
   it every owner-only power is disabled. The bot fails closed and logs a security
   warning; there is no username fallback.
2. **The Warden needs ban permission** in the group. Without it, it can only
   announce the bot, not remove it.

Both entry paths are covered — `new_chat_members` and `chat_member` updates —
because the first doesn't fire in every group configuration.

## Voice

Dry. Narrator. Educator. Firm.

Understatement rather than jokes. One warning, never a second. Terse rulings
rather than sass. The Warden explains a thing once, properly, then moves on. It
does not perform, does not escalate, and never tries to win an argument.

The dry-aside rate is 5%. Change `FLAIR_RATE` in `riftLore.ts` if that's still
too much or not enough.

---

## Removed

Several inherited features that didn't fit this project were removed along with
their feature toggles, database tables and admin-portal entries.

## What was kept

**Moderation** — spam and flood control, scam and phishing, anti-raid, admin
impersonation, hate speech, dangerous files, link control, CAPTCHA gate,
new-account age gate, mass-mention detection, bio scanning at join.

**Community** — trust system, giveaways, trivia, word puzzle, leaderboards,
member scoring, welcome messages, birthday celebrations.

**Platform** — multi-community SaaS layer, React admin portal, per-chat feature
toggles, setup wizard.

`/story` is now **admin-only** and never auto-posts.

---

## Running on Vercel

The bot is set up for Vercel. Three things had to change from a normal server.

### 1. It no longer polls — Telegram pushes to it

There's no always-running process, so the bot can't sit and ask Telegram for
new messages. Telegram now pushes each update to `/api/telegram`.

After deploying, visit this once:

```
https://your-domain/api/set-webhook?key=YOUR_SETUP_KEY
```

### 2. Enforcement state lives in Redis

This is the important one.

On a normal server the bot remembers things like "this user has two warnings"
in memory, because the process never stops. On Vercel each message may be
handled by a brand new function that starts, answers, and dies — so anything
in memory is gone.

Without a fix, someone on their third strike comes back a first-timer.

So all of this now lives in Redis (`server/state.ts`):

- Offence counts — the 15min → 4hr → 72hr → ban ladder
- Spam and flood tracking
- Rate limiting
- Hate speech warning counts
- Raid join-rate windows and active lockdowns
- Media spam counts
- Pending CAPTCHA verifications
- The list of chats the bot is active in

**If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are missing, the
bot refuses to start.** That's deliberate. Without them it would look like it
was working while quietly forgetting every warning it ever gave — a much worse
failure, because nobody would notice.

Upstash's free tier covers this comfortably. Everything talks to it over plain
HTTPS, so there are no database connections to run out of.

Caches (feature settings, admin lists, community records) were left in memory
on purpose. Losing those on a cold start just means one extra database query.

### 3. Ten timers became one cron job

`setInterval` doesn't survive in a serverless function. Everything scheduled
now runs from `/api/cron`, called every 5 minutes by Vercel: unverified-join
sweeps, expired trial downgrades, message cleanup, the daily quote, birthdays,
and winner announcements.

Each task checks a stored "last run" date, so a daily job fires once a day no
matter how often cron runs. Times are now Hobart time, not US Pacific.

### Database

`DATABASE_URL` must be a **pooled** connection string — Neon's pooled endpoint,
or Supabase's connection pooler on port 6543. Serverless functions open
connections constantly and a direct connection will exhaust the database.
The pool is capped at one connection per function.

### Still on timers — known gaps

A few things use short in-handler timers that a serverless function can't hold:

- Trivia rounds don't auto-advance to the next question on a timeout
- Word puzzles don't auto-expire
- The auto-engage nudge when a chat goes quiet
- Admin inactivity checks

None of these affect moderation or safety. All are fixable by moving them into
the cron tick, but that's separate work and I'd rather tell you than let you
find out.

The Bud Avatar scheduler was also left alone, since that feature is still
undecided.

## Layout

```
server/
  bot.ts           the bot — commands, moderation, handlers
  riftLore.ts      canon, voice, permissions   <- edit this for lore
  adminRoutes.ts   admin portal API
  communityService.ts
  db.ts  index.ts  routes.ts  storage.ts
shared/
  schema.ts        Drizzle database schema
client/            React admin portal
```

Lore and voice changes go in `riftLore.ts`. You should rarely need to touch
`bot.ts` to change what the Warden says.


## Launch authority model

- `@aussieboomer` — Boss/project owner. Full community + bot trust. Can change trust levels and authorise/remove extra bots.
- `@TreeFitty` — Community Leader. Full community + bot trust. Can change trust levels and authorise/remove extra bots.
- `@DaveyJon` and `@rainzy` — trusted moderators/admins from day one. Normal newcomer/file/flood restrictions are bypassed, but links and contract addresses still pass Warden safety checks.
- Permissions use numeric Telegram user IDs from environment variables; usernames are display/personality labels only.

### Trust command
Reply to a member's message with `/trustset full`, `/trustset trusted`, `/trustset normal`, or `/trustset restricted`. Only the Boss and Community Leader can use it.

### Conversation behaviour
Tag `@RiftWardenBot` or reply to one of its messages to open a conversational session. The Warden continues responding naturally for up to 20 minutes of activity, extending the session with every exchange.

## Rift Radio

The bot includes **Rift Radio** at `/rift-radio.html` and exposes it with `/radio`.
The page is Telegram Web App-aware and contains nine live/fallback radio signals.
If `RIFT_RADIO_URL` is blank, the bot automatically uses `PUBLIC_URL/rift-radio.html`.

The radio is deliberately independent from moderation and AI: an unavailable radio
stream cannot stop the Warden from moderating or chatting.

### Birthday memory

The Warden remembers member birthdays in the community profile. It will try to sync a visible Telegram profile birthdate (when Telegram exposes it to the bot); members can always set or correct it with `/setbirthday MM-DD`. On the birthday the Warden can post the scheduled community birthday shout-out, and when that member actually appears in chat it gives one larger personalised birthday entrance greeting for that year. The default community timezone is `Australia/Hobart`, configurable with `COMMUNITY_TIMEZONE`.
