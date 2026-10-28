// Time converter shared by VeilAegis and the Warden. Pure functions: no AI, no network.
// Zones can be typed as a city ("Los Angeles"), a region ("Australia/Hobart") or a short name ("PST").

const ALIASES: Record<string, string> = {
  utc: "UTC", gmt: "UTC", z: "UTC",
  est: "America/New_York", edt: "America/New_York", eastern: "America/New_York", "us east": "America/New_York",
  cst: "America/Chicago", cdt: "America/Chicago", central: "America/Chicago",
  mst: "America/Denver", mdt: "America/Denver", mountain: "America/Denver",
  pst: "America/Los_Angeles", pdt: "America/Los_Angeles", pacific: "America/Los_Angeles", "us west": "America/Los_Angeles",
  aest: "Australia/Sydney", aedt: "Australia/Sydney", acst: "Australia/Adelaide", acdt: "Australia/Adelaide", awst: "Australia/Perth",
  nzst: "Pacific/Auckland", nzdt: "Pacific/Auckland", "new zealand": "Pacific/Auckland", nz: "Pacific/Auckland",
  bst: "Europe/London", uk: "Europe/London", britain: "Europe/London", england: "Europe/London", "united kingdom": "Europe/London",
  cet: "Europe/Paris", cest: "Europe/Paris", ist: "Asia/Kolkata", india: "Asia/Kolkata", jst: "Asia/Tokyo", japan: "Asia/Tokyo",
  sgt: "Asia/Singapore", hkt: "Asia/Hong_Kong", china: "Asia/Shanghai", beijing: "Asia/Shanghai", korea: "Asia/Seoul",
  tasmania: "Australia/Hobart", australia: "Australia/Sydney", "gold coast": "Australia/Brisbane", queensland: "Australia/Brisbane",
  "new south wales": "Australia/Sydney", victoria: "Australia/Melbourne", "south australia": "Australia/Adelaide",
  "western australia": "Australia/Perth", "northern territory": "Australia/Darwin", canberra: "Australia/Sydney",
  "new york": "America/New_York", nyc: "America/New_York", miami: "America/New_York", boston: "America/New_York", atlanta: "America/New_York",
  florida: "America/New_York", "washington dc": "America/New_York", toronto: "America/Toronto",
  dallas: "America/Chicago", houston: "America/Chicago", texas: "America/Chicago", austin: "America/Chicago",
  seattle: "America/Los_Angeles", "san francisco": "America/Los_Angeles", "san diego": "America/Los_Angeles", "las vegas": "America/Los_Angeles",
  california: "America/Los_Angeles", la: "America/Los_Angeles", "los angeles": "America/Los_Angeles",
  mumbai: "Asia/Kolkata", delhi: "Asia/Kolkata", "new delhi": "Asia/Kolkata", bangalore: "Asia/Kolkata", dubai: "Asia/Dubai", uae: "Asia/Dubai",
  bali: "Asia/Makassar", manila: "Asia/Manila", philippines: "Asia/Manila", "kuala lumpur": "Asia/Kuala_Lumpur", vietnam: "Asia/Ho_Chi_Minh",
  germany: "Europe/Berlin", france: "Europe/Paris", spain: "Europe/Madrid", italy: "Europe/Rome", netherlands: "Europe/Amsterdam",
  brazil: "America/Sao_Paulo", "sao paulo": "America/Sao_Paulo", mexico: "America/Mexico_City", canada: "America/Toronto",
  "south africa": "Africa/Johannesburg", nigeria: "Africa/Lagos", kenya: "Africa/Nairobi", egypt: "Africa/Cairo",
  hawaii: "Pacific/Honolulu", alaska: "America/Anchorage", fiji: "Pacific/Fiji", "cape town": "Africa/Johannesburg",
};

let index: Map<string, string> | null = null;
function buildIndex(): Map<string, string> {
  if (index) return index;
  const m = new Map<string, string>();
  let zones: string[] = [];
  try { zones = (Intl as any).supportedValuesOf("timeZone") as string[]; } catch {}
  for (const z of zones) {
    m.set(z.toLowerCase(), z);
    const last = z.split("/").pop()!.replace(/_/g, " ").toLowerCase();
    if (!m.has(last)) m.set(last, z);
  }
  m.set("utc", "UTC");
  index = m;
  return m;
}

const clean = (s: string) => s.toLowerCase().replace(/[.,]/g, " ").replace(/_/g, " ").replace(/\s+/g, " ").trim();

export function resolveZone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const c = clean(raw);
  if (ALIASES[c]) return ALIASES[c];
  const idx = buildIndex();
  const direct = idx.get(raw.toLowerCase().replace(/\s+/g, "_")) || idx.get(c);
  if (direct) return direct;
  return null;
}

export const zoneName = (tz: string) => tz.split("/").pop()!.replace(/_/g, " ");

function offsetMs(utc: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utc));
  const g = (t: string) => Number(parts.find(x => x.type === t)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - utc;
}
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - offsetMs(guess, tz);
  utc = guess - offsetMs(utc, tz);
  return utc;
}
function todayIn(tz: string, plusDays = 0): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const g = (t: string) => Number(parts.find(x => x.type === t)!.value);
  const dt = new Date(Date.UTC(g("year"), g("month") - 1, g("day") + plusDays));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function formatIn(utc: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }).formatToParts(new Date(utc));
  const g = (t: string) => parts.find(x => x.type === t)?.value || "";
  return `${g("weekday")} ${g("day")} ${g("month")}, ${g("hour")}:${g("minute")} ${g("dayPeriod").toLowerCase()} ${g("timeZoneName")}`;
}
export const lineFor = (utc: number, tz: string, label?: string) => `${label || zoneName(tz)}: ${formatIn(utc, tz)}`;

function readClock(h: string, mi: string | undefined, ap: string | undefined): { h: number; mi: number } | null {
  let hh = Number(h); const mm = mi ? Number(mi) : 0;
  if (mm > 59) return null;
  if (ap) {
    if (hh < 1 || hh > 12) return null;
    hh = hh % 12 + (ap.toLowerCase() === "pm" ? 12 : 0);
  } else if (hh > 23) return null;
  return { h: hh, mi: mm };
}

export interface QuickResult { utc: number; srcTz: string; srcLabel: string; targets: { tz: string; label: string }[] }
const USAGE_QUICK = "Try: /timeconvert 7pm Hobart to London, New York\nOr with a date: /timeconvert 2026-11-05 19:00 Hobart to Los Angeles";

// "7pm Hobart to London, New York"  /  "2026-11-05 19:00 Hobart to Los Angeles"  /  "tomorrow 8:30am London to Sydney"
export function parseQuick(text: string): QuickResult | string {
  const m = text.trim().match(/^(?:(\d{4}-\d{2}-\d{2}|today|tomorrow)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(.+?)\s+(?:to|in|into|->)\s+(.+)$/i);
  if (!m) return USAGE_QUICK;
  const clock = readClock(m[2], m[3], m[4]);
  if (!clock) return "I couldn't read that time. Use 7pm, 7:30pm or 19:00.\n\n" + USAGE_QUICK;
  const srcTz = resolveZone(m[5]);
  if (!srcTz) return `I don't know the place "${m[5].trim()}". Try a city like London or Los Angeles, or a name like Australia/Hobart.`;
  const targets: { tz: string; label: string }[] = [];
  for (const raw of m[6].split(/[,;&]|\band\b/i).map(s => s.trim()).filter(Boolean).slice(0, 8)) {
    const tz = resolveZone(raw);
    if (!tz) return `I don't know the place "${raw}". Try a city like London or Los Angeles, or a name like Australia/Hobart.`;
    targets.push({ tz, label: raw.replace(/\b\w/g, c => c.toUpperCase()) });
  }
  if (!targets.length) return USAGE_QUICK;
  let y: number, mo: number, d: number;
  const ds = (m[1] || "").toLowerCase();
  if (/^\d{4}-/.test(ds)) { [y, mo, d] = ds.split("-").map(Number); }
  else { const t = todayIn(srcTz, ds === "tomorrow" ? 1 : 0); y = t.y; mo = t.m; d = t.d; }
  const utc = zonedToUtc(y, mo, d, clock.h, clock.mi, srcTz);
  if (Number.isNaN(utc)) return "I couldn't read that date.";
  return { utc, srcTz, srcLabel: m[5].trim().replace(/\b\w/g, c => c.toUpperCase()), targets };
}

export interface EventResult { utc: number; tz: string; title: string }
export const USAGE_EVENT = "To post a meeting time that members can check in their own time zone, send:\n/timeconvert 2026-11-05 19:00 Video chat\n\nTo use another time zone, put it before the title with a bar:\n/timeconvert 2026-11-05 19:00 London | Video chat";

// "2026-11-05 19:00 Video chat"  /  "2026-11-05 19:00 London | Video chat"
export function parseEvent(text: string, defaultTz: string): EventResult | string | null {
  const m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*(am|pm)?\s*(.*)$/i);
  if (!m) return null; // not the event form
  const clock = readClock(m[4], m[5], m[6]);
  if (!clock) return "I couldn't read that time. Use 24-hour time like 19:00.\n\n" + USAGE_EVENT;
  let tz = defaultTz, title = m[7].trim();
  const bar = title.indexOf("|");
  if (bar >= 0) {
    const z = resolveZone(title.slice(0, bar));
    if (!z) return `I don't know the place "${title.slice(0, bar).trim()}". Try a city like London or a name like Australia/Hobart.`;
    tz = z; title = title.slice(bar + 1).trim();
  }
  const utc = zonedToUtc(Number(m[1]), Number(m[2]), Number(m[3]), clock.h, clock.mi, tz);
  if (Number.isNaN(utc)) return "I couldn't read that date.";
  return { utc, tz, title: title.slice(0, 120) || "Meeting" };
}
