// === ENDANGERED AUSTRALIAN WILDLIFE POST ===
//
// Picks a threatened Australian species, a free-to-share photo and a short
// fact sheet. Everything factual comes from the sources (iNaturalist for the
// species list, status and photo; Wikipedia for the text). The AI only
// condenses the Wikipedia text it is handed; it is told not to add anything.

import OpenAI from "openai";
import { stateGet, stateSet } from "./state";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const AUSTRALIA_PLACE_ID = 6744;
const SEEN_KEY = "w:wildlife:seen";
const SEEN_DAYS = 60;
const OK_LICENCES = new Set(["cc0", "cc-by", "cc-by-sa"]);
// iNaturalist reports status codes in several styles ("e", "EN", "cr"...), and IUCN levels as numbers.
function statusName(cs: any): string | null {
  if (!cs) return null;
  const code = String(cs.status || "").toLowerCase();
  if (code === "cr" || code === "ce") return "Critically Endangered";
  if (code === "en" || code === "e") return "Endangered";
  if (code === "vu" || code === "v") return "Vulnerable";
  if (cs.iucn === 50) return "Critically Endangered";
  if (cs.iucn === 40) return "Endangered";
  if (cs.iucn === 30) return "Vulnerable";
  return null;
}
const LICENCE_NAMES: Record<string, string> = { "cc0": "CC0", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA" };
const UA = { "User-Agent": "RiftWardenBot/1.0 (Boomerverse community; conservation awareness posts)" };

export interface WildlifePost {
  taxonId: number;
  commonName: string;
  scientificName: string;
  status: string;
  photoUrl: string;
  credit: string;
  caption: string;
  group: string;
}

async function getJson(url: string): Promise<any | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10000);
    const res = await fetch(url, { headers: UA, signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function recentlySeen(): Promise<Record<string, number>> {
  const seen = await stateGet<Record<string, number>>(SEEN_KEY, {});
  const cutoff = Date.now() - SEEN_DAYS * 24 * 60 * 60 * 1000;
  return Object.fromEntries(Object.entries(seen).filter(([, ts]) => ts > cutoff));
}

export async function markWildlifeSeen(taxonId: number): Promise<void> {
  const seen = await recentlySeen();
  seen[String(taxonId)] = Date.now();
  await stateSet(SEEN_KEY, seen, 90 * 24 * 60 * 60);
}

async function photoLooksSafe(url: string): Promise<boolean> {
  try {
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [
        { type: "text", text: 'Is this a clear, wholesome photo of a living animal, plant or fungus in good condition? Answer false if it shows a dead, injured, trapped or distressed animal, any person or face, a dissected or preserved specimen, a museum drawing, a map, or heavy text or watermarks. JSON only: {"ok": true or false}' },
        { type: "image_url", image_url: { url, detail: "low" } },
      ] as any }],
      max_tokens: 20,
    });
    return JSON.parse(ai.choices[0]?.message?.content || "{}").ok === true;
  } catch { return false; }
}

async function condense(common: string, sci: string, status: string, extract: string): Promise<string | null> {
  try {
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content:
          "You write short fact cards about threatened Australian wildlife for a friendly community. " +
          "Use ONLY facts stated in the SOURCE TEXT. Never add facts from memory. If a detail is not in the text, leave that line out. " +
          'Reply JSON: {"where": "...", "about": "...", "threats": "...", "numbers": "...", "surprise": "..."}. ' +
          "where = where it lives. about = what it is and looks like, one sentence. threats = what threatens it. " +
          "numbers = how many are left, ONLY if the text gives a figure, else empty string. surprise = one interesting fact. " +
          "Each value under 160 characters, plain language, no hype, no emojis." },
        { role: "user", content: `Species: ${common} (${sci}). Status: ${status}.\n\nSOURCE TEXT:\n${extract.slice(0, 3500)}` },
      ],
      max_tokens: 500,
    });
    const v = JSON.parse(ai.choices[0]?.message?.content || "{}") as Record<string, string>;
    const lines: string[] = [];
    if (v.about) lines.push(v.about.trim());
    if (v.where) lines.push(`Where: ${v.where.trim()}`);
    if (v.threats) lines.push(`Threats: ${v.threats.trim()}`);
    if (v.numbers) lines.push(`How many: ${v.numbers.trim()}`);
    if (v.surprise) lines.push(`Did you know: ${v.surprise.trim()}`);
    return lines.length >= 3 ? lines.join("\n") : null;
  } catch { return null; }
}

export const wildlifeDebug: Record<string, unknown> = {};

export async function pickWildlifePost(): Promise<WildlifePost | null> {
  const seen = await recentlySeen();
  // Random page so the same popular species don't always come first.
  const page = 1 + Math.floor(Math.random() * 20);
  const data = await getJson(
    `https://api.inaturalist.org/v1/observations/species_counts?place_id=${AUSTRALIA_PLACE_ID}&threatened=true&rank=species&preferred_place_id=${AUSTRALIA_PLACE_ID}&locale=en&per_page=100&page=${page}`
  );
  const results: any[] = data?.results || [];
  wildlifeDebug.fetched = results.length; wildlifeDebug.apiOk = !!data; wildlifeDebug.total = data?.total_results;
  wildlifeDebug.sample = results.slice(0, 3).map((r: any) => ({ n: r.taxon?.name, cs: r.taxon?.conservation_status, lic: r.taxon?.default_photo?.license_code, wiki: !!r.taxon?.wikipedia_url, common: r.taxon?.preferred_common_name }));
  const why: Record<string, number> = {}; const bump = (k: string) => { why[k] = (why[k] || 0) + 1; wildlifeDebug.skipped = why; };
  // Shuffle
  for (let i = results.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [results[i], results[j]] = [results[j], results[i]]; }

  let tried = 0;
  for (const r of results) {
    const t = r.taxon;
    if (!t || seen[String(t.id)]) { bump('seen'); continue; }
    const cs0 = t.conservation_status;
    if (cs0?.place && cs0.place.id !== AUSTRALIA_PLACE_ID) { bump('statusPlace'); continue; }
    const statusLabel = statusName(cs0);
    if (!statusLabel) { bump('status'); continue; }
    const photo = t.default_photo;
    if (!photo || !OK_LICENCES.has(String(photo.license_code || "").toLowerCase())) { bump('licence'); continue; }
    if (!t.wikipedia_url || !t.preferred_common_name) { bump('nowiki'); continue; }
    if (++tried > 12) break;

    const title = decodeURIComponent(String(t.wikipedia_url).split("/wiki/")[1] || "");
    if (!title) continue;
    const wiki = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const extract: string = wiki?.extract || "";
    if (extract.length < 250) { bump('shortwiki'); continue; }

    const photoUrl: string = photo.large_url || String(photo.medium_url || "").replace("/medium.", "/large.");
    if (!photoUrl) continue;
    if (!(await photoLooksSafe(photoUrl))) { bump('photocheck'); continue; }

    const status = statusLabel;
    const authority = String(t.conservation_status?.authority || "").trim();
    const body = await condense(t.preferred_common_name, t.name, status, extract);
    if (!body) { bump('condense'); continue; }

    const credit = String(photo.attribution || "Photo: iNaturalist contributor").replace(/\s+/g, " ").slice(0, 140);
    const caption =
      `${String(t.preferred_common_name).toUpperCase()}\n${t.name}\nStatus: ${status}${authority ? ` (${authority})` : ""}\n\n${body}\n\n` +
      `Help: back local conservation groups and log sightings on the Atlas of Living Australia.\n\n` +
      `${credit}. Photo via iNaturalist. Facts from Wikipedia.`;
    return {
      taxonId: t.id,
      commonName: t.preferred_common_name,
      scientificName: t.name,
      status,
      photoUrl,
      credit,
      caption: caption.slice(0, 1020),
      group: t.iconic_taxon_name || "",
    };
  }
  return null;
}
