# Getting The Warden live

Follow in order. Each step depends on the one before it.

---

## 1. Upload the code

Unzip the package. On `github.com/CryptoBumsBSC/rift-warden`, click
**uploading an existing file** and drag in the **contents** of the
`Rift-Warden-bot` folder — not the folder itself.

`package.json` and `vercel.json` must sit at the top level of the repo. If they
end up inside a subfolder, Vercel won't find them.

**Do not upload:**
- `node_modules` — thousands of files, GitHub will choke
- any real `.env` — it has your bot token in it (`.env.example` is fine)

---

## 2. Database

You need Postgres with a **pooled** connection string. Direct connections will
exhaust the database from serverless functions.

- **Supabase** — Project Settings → Database → Connection string → **Session
  pooler** (port 6543, not 5432)
- **Neon** — use the **pooled** endpoint, the one with `-pooler` in the host

Copy that string. That's your `DATABASE_URL`.

---

## 3. Redis — not optional

Free account at **upstash.com** → Create Database → Regional, pick the region
closest to Sydney.

From the database page copy:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**The bot refuses to start without these.** That's deliberate. Without Redis it
would look like it was working while forgetting every warning, mute count and
raid lockdown on every cold start — a failure nobody notices until it matters.

---

## 4. Your Telegram ID

Message **@userinfobot** on Telegram. It replies with your numeric ID.

That number is `GLOBAL_OWNER_USER_ID`. It is not your @username.

**This one matters more than it looks.** It's what enforces the owner-only bot
rule. Without it, every owner power is disabled — the bot fails closed on
purpose. Owner authority is based only on the immutable numeric Telegram ID,
never on a changeable @username.

---

## 5. Deploy to Vercel

Import the repo at vercel.com. Framework preset: **Other**. Leave the build
settings alone — `vercel.json` handles them.

Add these environment variables before the first deploy:

| Variable | Value |
|---|---|
| `BOT_USERNAME` | `RiftWardenBot` (without @) |
| `BOT_PUBLIC_URL` | `https://t.me/RiftWardenBot` |
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `GLOBAL_OWNER_USER_ID` | Your numeric ID from step 4 |
| `DATABASE_URL` | Pooled string from step 2 |
| `UPSTASH_REDIS_REST_URL` | From step 3 |
| `UPSTASH_REDIS_REST_TOKEN` | From step 3 |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Your OpenAI key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| `SESSION_SECRET` | Any long random string |
| `SETUP_KEY` | Any random string — guards the webhook setup URL |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string — Telegram sends it back to prove updates are real |
| `PUBLIC_URL` | Your fresh Vercel/backend URL, e.g. `https://rift-warden.vercel.app` |
| `COMMUNITY_TIMEZONE` | `Australia/Hobart` (or your community timezone) |

Deploy.

---

## 6. Create the database tables

Locally, with `DATABASE_URL` set in a `.env`:

```
npm install
npm run db:push
```

Nothing works until the tables exist.

---

## 7. Point Telegram at it

Visit once, in a browser:

```
https://YOUR-FRESH-WARDEN-DOMAIN/api/set-webhook?key=YOUR_SETUP_KEY
```

You should get JSON back saying `"ok": true`. That's Telegram confirming it now
pushes updates to your deployment.

---

## 8. BotFather settings

Two things, both required:

- **Privacy mode OFF** — `/setprivacy` → Disable. Without this the bot only sees
  messages that mention it by name, and no moderation fires at all.
- Then **add the bot to your group as an admin** with:
  - Delete messages
  - Ban users
  - Invite users

Without delete and ban, the Warden watches things happen and can't stop them.
It will tell you daily if permissions are missing, but check now.

---

## 9. Test in a private group first

Make a throwaway group. Add the bot. Then, with a second account:

| Test | Expected |
|---|---|
| Send 6 messages in 10 seconds | Flood detected, muted 15 min |
| Post `Win+R then Ctrl+V to verify` | Deleted immediately, muted |
| Post a one-character lookalike of your configured `OFFICIAL_DOMAINS` | Deleted — lookalike domain |
| Post your configured official website | Allowed |
| Add any other bot | Removed instantly, you're named as the adder |
| `/trivia 3` | Round runs, advances, ends with scores |
| `/safety` | The seven rules |
| `/settings` | 22 toggles, all on |

If a removal doesn't happen, it's almost always missing permissions from step 8.

---

## 10. Before it goes near the real group

Open `server/riftLore.ts` and fill the five `TODO(CANON)` lists from the Master
Rulebook: 10 species families, 12 classes, 7 Rift Energy states, 19 regions, and
trigger words for the 10 protected mysteries.

Leaving them empty is **safe** — the Warden says "not confirmed" rather than
inventing. Filling them with guesses is not, because a guess becomes canon the
moment a holder screenshots it.

---

## If something breaks

- **Bot silent** — check Vercel function logs for `/api/telegram`. A `[SECURITY]`
  line means an environment variable is missing.
- **"Refusing to start"** — Upstash variables are wrong or absent.
- **Sees messages but does nothing** — privacy mode is still on, or it isn't an
  admin.
- **Deletes nothing** — no delete permission.
- **Games stall** — Redis is unreachable. Check the Upstash token.

## Rift Radio check

After the production URL is live, open `/radio` in a private chat with @RiftWardenBot.
Confirm the `OPEN RIFT RADIO` button loads `PUBLIC_URL/rift-radio.html`, a station can
start, volume/mute works, previous/next works, and **Stop** actually ends playback.
`RIFT_RADIO_URL` is only needed if the radio is hosted somewhere other than this deployment.
