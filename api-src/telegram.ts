// === TELEGRAM WEBHOOK ===
//
// Vercel has no always-running process, so the bot can't sit there polling
// Telegram for new messages. Instead Telegram pushes each update to this URL
// and this function handles it, then exits.
//
// Register the URL once by visiting /api/set-webhook after deploying.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { webhookCallback } from "grammy";
import { createWebhookBot } from "../server/bot";
import { assertDurableStateConfigured } from "../server/state";
import { checkWebhookLimits } from "../server/behaviour";

// Reuse the bot across warm invocations. Building it costs a Telegram API call,
// so we only do it when the function is genuinely cold.
let handler: ((req: VercelRequest, res: VercelResponse) => Promise<void>) | null = null;

async function getHandler() {
  if (handler) return handler;
  assertDurableStateConfigured();
  const bot = await createWebhookBot();
  handler = webhookCallback(bot, "https") as any;
  return handler!;
}

export default async function telegram(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "This endpoint only accepts Telegram updates." });
    return;
  }

  // Telegram can be told to send a secret token with every update. If we've set
  // one, reject anything that doesn't carry it — otherwise anyone who guesses
  // the URL could feed the bot fake messages.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    res.status(401).json({ error: "Bad webhook secret." });
    return;
  }

  try {
    // Shed load before doing any expensive work. On Vercel every update costs
    // an invocation, so a flood is a bill as well as a nuisance.
    const update = req.body as {
      message?: { chat?: { id?: number }; from?: { id?: number } };
      edited_message?: { chat?: { id?: number }; from?: { id?: number } };
      callback_query?: { from?: { id?: number } };
    } | undefined;
    const chatId = update?.message?.chat?.id ?? update?.edited_message?.chat?.id;
    const userId = update?.message?.from?.id ?? update?.edited_message?.from?.id
      ?? update?.callback_query?.from?.id;

    const limit = await checkWebhookLimits(chatId, userId);
    if (!limit.allow) {
      console.warn(`[webhook] dropped update — ${limit.reason}`);
      // 200 so Telegram doesn't retry the same flood back at us.
      res.status(200).json({ ok: true, dropped: true });
      return;
    }

    const h = await getHandler();
    await h(req, res);
  } catch (err) {
    console.error("[webhook] failed:", err);
    // Always 200 to Telegram. A non-200 makes Telegram retry the same update
    // over and over, which turns one bad message into a flood.
    if (!res.headersSent) res.status(200).json({ ok: false });
  }
}
