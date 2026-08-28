// === SCHEDULED WORK ===
//
// Replaces the ten setInterval timers the bot used to run. Vercel calls this
// on the schedule set in vercel.json; every task inside decides for itself
// whether it's due.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runCronTick } from "../server/bot";
import { assertDurableStateConfigured } from "../server/state";

export default async function cron(req: VercelRequest, res: VercelResponse) {
  // Vercel signs its own cron calls. If CRON_SECRET is set, only accept those,
  // so nobody can trigger scheduled posts by hitting the URL.
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
