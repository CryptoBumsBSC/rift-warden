// Test page for the wildlife post. Visit /api/wildlife?key=SETUP_KEY to see what
// would be posted (nothing is sent anywhere, and it isn't marked as used).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pickWildlifePost, pickWildlifeByName, wildlifeDebug } from "../server/wildlife";

export default async function wildlife(req: VercelRequest, res: VercelResponse) {
  const setupKey = process.env.SETUP_KEY;
  if (!setupKey || req.query.key !== setupKey) { res.status(401).json({ error: "key required" }); return; }
  const started = Date.now();
  const named = typeof req.query.name === "string" ? req.query.name : "";
  const post = named ? await pickWildlifeByName(named) : await pickWildlifePost();
  res.status(200).json({ ms: Date.now() - started, post, debug: wildlifeDebug });
}
