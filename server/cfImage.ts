import { Buffer } from "node:buffer";

// Free image generation through Cloudflare Workers AI (FLUX.1 schnell).
// Needs two settings: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.

export const cfImageReady = () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

export async function generateCfImage(prompt: string): Promise<Buffer> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new Error("Cloudflare settings missing");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 45_000);
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 4 }),
      signal: ctl.signal,
    });
    const body: any = await res.json().catch(() => null);
    if (!res.ok || !body) throw new Error(`Cloudflare ${res.status}: ${JSON.stringify(body?.errors || body || "").slice(0, 200)}`);
    const b64: string | undefined = body.result?.image ?? body.image;
    if (!b64) throw new Error("Cloudflare returned no image");
    return Buffer.from(b64, "base64");
  } finally { clearTimeout(timer); }
}
