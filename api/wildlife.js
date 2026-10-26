// server/wildlife.ts
import OpenAI from "openai";

// server/state.ts
var UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "") || "";
var UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
var isDurable = Boolean(UPSTASH_URL && UPSTASH_TOKEN);
var memory = /* @__PURE__ */ new Map();
function memGet(key) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt && hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}
async function redis(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  if (body.error) throw new Error(`Upstash error: ${body.error}`);
  return body.result ?? null;
}
async function stateGet(key, fallback) {
  try {
    const raw = isDurable ? await redis(["GET", key]) : memGet(key);
    if (raw === null || raw === void 0) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[state] get ${key} failed:`, err);
    return fallback;
  }
}
var TTL = {
  spam: 10 * 60,
  // 10 minutes — flood windows are short
  offense: 30 * 24 * 60 * 60,
  // 30 days — the warn/mute/ban ladder must persist
  rateLimit: 5 * 60,
  mediaSpam: 10 * 60,
  joins: 10 * 60,
  // raid window is 2 min, keep a little margin
  lockdown: 60 * 60,
  hateWarning: 7 * 24 * 60 * 60,
  captcha: 30 * 60,
  verification: 24 * 60 * 60,
  activeChats: 90 * 24 * 60 * 60,
  birthdayProfileSync: 24 * 60 * 60,
  birthdayArrival: 48 * 60 * 60
};

// server/wildlife.ts
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var AUSTRALIA_PLACE_ID = 6744;
var SEEN_KEY = "w:wildlife:seen";
var SEEN_DAYS = 60;
var OK_LICENCES = /* @__PURE__ */ new Set(["cc0", "cc-by", "cc-by-sa"]);
var STATUS_NAMES = { CR: "Critically Endangered", EN: "Endangered", VU: "Vulnerable" };
var LICENCE_NAMES = { "cc0": "CC0", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA" };
var UA = { "User-Agent": "RiftWardenBot/1.0 (Boomerverse community; conservation awareness posts)" };
async function getJson(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1e4);
    const res = await fetch(url, { headers: UA, signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
async function recentlySeen() {
  const seen = await stateGet(SEEN_KEY, {});
  const cutoff = Date.now() - SEEN_DAYS * 24 * 60 * 60 * 1e3;
  return Object.fromEntries(Object.entries(seen).filter(([, ts]) => ts > cutoff));
}
async function photoLooksSafe(url) {
  try {
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [
        { type: "text", text: 'Is this a clear, wholesome photo of a living animal, plant or fungus in good condition? Answer false if it shows a dead, injured, trapped or distressed animal, any person or face, a dissected or preserved specimen, a museum drawing, a map, or heavy text or watermarks. JSON only: {"ok": true or false}' },
        { type: "image_url", image_url: { url, detail: "low" } }
      ] }],
      max_tokens: 20
    });
    return JSON.parse(ai.choices[0]?.message?.content || "{}").ok === true;
  } catch {
    return false;
  }
}
async function condense(common, sci, status, extract) {
  try {
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: 'You write short fact cards about threatened Australian wildlife for a friendly community. Use ONLY facts stated in the SOURCE TEXT. Never add facts from memory. If a detail is not in the text, leave that line out. Reply JSON: {"where": "...", "about": "...", "threats": "...", "numbers": "...", "surprise": "..."}. where = where it lives. about = what it is and looks like, one sentence. threats = what threatens it. numbers = how many are left, ONLY if the text gives a figure, else empty string. surprise = one interesting fact. Each value under 160 characters, plain language, no hype, no emojis.' },
        { role: "user", content: `Species: ${common} (${sci}). Status: ${status}.

SOURCE TEXT:
${extract.slice(0, 3500)}` }
      ],
      max_tokens: 500
    });
    const v = JSON.parse(ai.choices[0]?.message?.content || "{}");
    const lines = [];
    if (v.about) lines.push(v.about.trim());
    if (v.where) lines.push(`Where: ${v.where.trim()}`);
    if (v.threats) lines.push(`Threats: ${v.threats.trim()}`);
    if (v.numbers) lines.push(`How many: ${v.numbers.trim()}`);
    if (v.surprise) lines.push(`Did you know: ${v.surprise.trim()}`);
    return lines.length >= 3 ? lines.join("\n") : null;
  } catch {
    return null;
  }
}
var wildlifeDebug = {};
async function pickWildlifePost() {
  const seen = await recentlySeen();
  const page = 1 + Math.floor(Math.random() * 6);
  const data = await getJson(
    `https://api.inaturalist.org/v1/observations/species_counts?place_id=${AUSTRALIA_PLACE_ID}&threatened=true&rank=species&preferred_place_id=${AUSTRALIA_PLACE_ID}&locale=en&per_page=100&page=${page}`
  );
  const results = data?.results || [];
  wildlifeDebug.fetched = results.length;
  wildlifeDebug.apiOk = !!data;
  wildlifeDebug.total = data?.total_results;
  wildlifeDebug.sample = results.slice(0, 3).map((r) => ({ n: r.taxon?.name, cs: r.taxon?.conservation_status?.status, lic: r.taxon?.default_photo?.license_code, wiki: !!r.taxon?.wikipedia_url, common: r.taxon?.preferred_common_name }));
  const why = {};
  const bump = (k) => {
    why[k] = (why[k] || 0) + 1;
    wildlifeDebug.skipped = why;
  };
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }
  let tried = 0;
  for (const r of results) {
    const t = r.taxon;
    if (!t || seen[String(t.id)]) {
      bump("seen");
      continue;
    }
    const code = t.conservation_status?.status;
    if (!STATUS_NAMES[code]) {
      bump("status");
      continue;
    }
    const photo = t.default_photo;
    if (!photo || !OK_LICENCES.has(String(photo.license_code || "").toLowerCase())) {
      bump("licence");
      continue;
    }
    if (!t.wikipedia_url || !t.preferred_common_name) {
      bump("nowiki");
      continue;
    }
    if (++tried > 10) break;
    const title = decodeURIComponent(String(t.wikipedia_url).split("/wiki/")[1] || "");
    if (!title) continue;
    const wiki = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const extract = wiki?.extract || "";
    if (extract.length < 250) {
      bump("shortwiki");
      continue;
    }
    const photoUrl = photo.large_url || String(photo.medium_url || "").replace("/medium.", "/large.");
    if (!photoUrl) continue;
    if (!await photoLooksSafe(photoUrl)) {
      bump("photocheck");
      continue;
    }
    const status = STATUS_NAMES[code];
    const body = await condense(t.preferred_common_name, t.name, status, extract);
    if (!body) {
      bump("condense");
      continue;
    }
    const credit = `${String(photo.attribution || "Photo: iNaturalist contributor").replace(/\s+/g, " ").slice(0, 120)} (${LICENCE_NAMES[String(photo.license_code).toLowerCase()]})`;
    const caption = `${String(t.preferred_common_name).toUpperCase()}
${t.name} | ${status}

${body}

Help: back local conservation groups and log sightings on the Atlas of Living Australia.

${credit}. Photo via iNaturalist. Facts from Wikipedia.`;
    return {
      taxonId: t.id,
      commonName: t.preferred_common_name,
      scientificName: t.name,
      status,
      photoUrl,
      credit,
      caption: caption.slice(0, 1020),
      group: t.iconic_taxon_name || ""
    };
  }
  return null;
}

// api-src/wildlife.ts
async function wildlife(req, res) {
  const setupKey = process.env.SETUP_KEY;
  if (!setupKey || req.query.key !== setupKey) {
    res.status(401).json({ error: "key required" });
    return;
  }
  const started = Date.now();
  const post = await pickWildlifePost();
  res.status(200).json({ ms: Date.now() - started, post, debug: wildlifeDebug });
}
export {
  wildlife as default
};
