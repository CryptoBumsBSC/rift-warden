import OpenAI from "openai";
import { Buffer } from "node:buffer";

// Image generation for birthday and winner cards.
//
// A plain OpenAI images client. No platform vendor involved.

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Generate an image and return it as a Buffer, ready to send to Telegram.
 */
export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024",
  quality: "auto" | "high" = "auto",
): Promise<Buffer> {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
    quality,
  });
  const base64 = response.data?.[0]?.b64_json ?? "";
  return Buffer.from(base64, "base64");
}
