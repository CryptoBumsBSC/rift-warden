// === DURABLE STATE ===
//
// Why this file exists.
//
// On a normal always-on server, the bot can hold things like "how many times
// has this user been warned" in memory, because the process never stops.
//
// On Vercel there is no process. Each message may be handled by a brand new
// function that starts, answers, and dies. Anything held in memory is gone.
// Without this file, a user on their third strike comes back a first-timer.
//
// So every piece of state that MATTERS for enforcement lives here instead, in
// Redis, where it survives.
//
// Two backends:
//   - Upstash Redis, over plain HTTPS (no TCP connections, no pooling, works
//     inside a serverless function). Used when the env vars are set.
//   - An in-memory map, used automatically when they aren't. That keeps local
//     development working with no setup. It is NOT safe for production —
//     see assertDurableStateConfigured() below.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "") || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const isDurable = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// Local dev fallback. Values carry their own expiry so behaviour matches Redis.
const memory = new Map<string, { value: string; expiresAt: number }>();

function memGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt && hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function memSet(key: string, value: string, ttlSeconds?: number): void {
  memory.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
  });
}

// Fire a command at Upstash's REST endpoint. Commands are sent as a JSON array,
// e.g. ["SET", "key", "value", "EX", "600"].
async function redis(command: (string | number)[]): Promise<any> {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error(`Upstash error: ${body.error}`);
  return body.result ?? null;
}

// --- Core operations -------------------------------------------------------

export async function stateGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = isDurable ? await redis(["GET", key]) : memGet(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw as string) as T;
  } catch (err) {
    // Never let a storage hiccup take the bot down. Fall back to the default
    // and log it — a missed warning count is better than a dead bot.
    console.error(`[state] get ${key} failed:`, err);
    return fallback;
  }
}

export async function stateSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (isDurable) {
      await redis(ttlSeconds ? ["SET", key, raw, "EX", ttlSeconds] : ["SET", key, raw]);
    } else {
      memSet(key, raw, ttlSeconds);
    }
  } catch (err) {
    console.error(`[state] set ${key} failed:`, err);
  }
}

export async function stateDel(key: string): Promise<void> {
  try {
    if (isDurable) await redis(["DEL", key]);
    else memory.delete(key);
  } catch (err) {
    console.error(`[state] del ${key} failed:`, err);
  }
}

// Read, change, write back. This is the pattern almost every counter uses.
export async function stateUpdate<T>(
  key: string,
  fallback: T,
  mutate: (current: T) => T,
  ttlSeconds?: number,
): Promise<T> {
  const current = await stateGet<T>(key, fallback);
  const next = mutate(current);
  await stateSet(key, next, ttlSeconds);
  return next;
}

// Atomic counter — used where a read-modify-write race would actually matter.
export async function stateIncr(key: string, ttlSeconds?: number): Promise<number> {
  try {
    if (isDurable) {
      const n = (await redis(["INCR", key])) as number;
      if (ttlSeconds && n === 1) await redis(["EXPIRE", key, ttlSeconds]);
      return n;
    }
    const n = Number(memGet(key) || 0) + 1;
    memSet(key, String(n), ttlSeconds);
    return n;
  } catch (err) {
    console.error(`[state] incr ${key} failed:`, err);
    return 0;
  }
}

// --- Key names -------------------------------------------------------------
//
// Keep every key in one place so it's obvious what's stored and for how long.

export const KEYS = {
  spam: (chatId: number | string, userId: number | string) => `w:spam:${chatId}:${userId}`,
  offense: (chatId: number | string, userId: number | string) => `w:off:${chatId}:${userId}`,
  rateLimit: (chatId: string, userId: string) => `w:rl:${chatId}:${userId}`,
  mediaSpam: (chatId: number | string, userId: number | string, type: string) =>
    `w:media:${chatId}:${userId}:${type}`,
  joins: (chatId: string) => `w:joins:${chatId}`,
  lockdown: (chatId: string) => `w:lock:${chatId}`,
  hateWarning: (userId: string, chatId: string) => `w:hate:${userId}:${chatId}`,
  captcha: (chatId: number | string, userId: number | string) => `w:cap:${chatId}:${userId}`,
  verification: (id: string) => `w:verify:${id}`,
  activeChats: () => `w:activechats`,
  lastQuoteDate: () => `w:lastquote`,
  birthdayProfileSync: (userId: number | string) => `w:bday:sync:${userId}`,
  birthdayArrival: (chatId: number | string, userId: number | string, year: number) => `w:bday:arrival:${chatId}:${userId}:${year}`,
};

// How long each kind of state is worth keeping.
export const TTL = {
  spam: 10 * 60,               // 10 minutes — flood windows are short
  offense: 30 * 24 * 60 * 60,  // 30 days — the warn/mute/ban ladder must persist
  rateLimit: 5 * 60,
  mediaSpam: 10 * 60,
  joins: 10 * 60,              // raid window is 2 min, keep a little margin
  lockdown: 60 * 60,
  hateWarning: 7 * 24 * 60 * 60,
  captcha: 30 * 60,
  verification: 24 * 60 * 60,
  activeChats: 90 * 24 * 60 * 60,
  birthdayProfileSync: 24 * 60 * 60,
  birthdayArrival: 48 * 60 * 60,
};

/**
 * Called at startup on the serverless entry points.
 *
 * In production without Redis the bot would look like it was working while
 * silently forgetting every warning, mute count and raid lockdown. That is a
 * worse failure than not starting, because nobody would notice. So we refuse.
 */
export function assertDurableStateConfigured(): void {
  if (isDurable) return;
  const msg =
    "FATAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set.\n" +
    "On Vercel the bot has no memory between messages, so warning counts, mute\n" +
    "escalation and raid lockdowns would silently reset. Refusing to start.";
  console.error(msg);
  throw new Error(msg);
}

/**
 * List keys matching a prefix. Used by the cron job to sweep things like
 * unverified CAPTCHA joins, which no single message handler owns.
 * Uses SCAN so it never blocks Redis, unlike KEYS.
 */
export async function stateScan(prefix: string, limit = 500): Promise<string[]> {
  if (!isDurable) {
    return Array.from(memory.keys()).filter(k => k.startsWith(prefix));
  }
  const found: string[] = [];
  let cursor = "0";
  try {
    do {
      const res = (await redis(["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", 100])) as [string, string[]];
      cursor = res[0];
      found.push(...res[1]);
    } while (cursor !== "0" && found.length < limit);
  } catch (err) {
    console.error(`[state] scan ${prefix} failed:`, err);
  }
  return found;
}
