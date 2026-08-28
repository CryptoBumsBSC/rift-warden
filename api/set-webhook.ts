// === ONE-TIME WEBHOOK SETUP ===
//
// Visit https://your-domain/api/set-webhook?key=YOUR_SETUP_KEY once after
// deploying. It tells Telegram where to send updates.
//
// Requires SETUP_KEY to be set, so a stranger can't repoint your bot.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function setWebhook(req: VercelRequest, res: VercelResponse) {
  const setupKey = process.env.SETUP_KEY;
  if (!setupKey || req.query.key !== setupKey) {
    res.status(401).json({ error: "Set SETUP_KEY and pass it as ?key=" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "TELEGRAM_BOT_TOKEN is not set" });
    return;
  }

  const host = process.env.PUBLIC_URL?.replace(/\/+$/, "") || `https://${req.headers.host}`;
  const url = `${host}/api/telegram`;

  const body: Record<string, unknown> = {
    url,
    drop_pending_updates: true,
    allowed_updates: ["message", "edited_message", "callback_query", "chat_member", "my_chat_member"],
  };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
  }

  const tg = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  res.status(200).json({ target: url, telegram: await tg.json() });
}
