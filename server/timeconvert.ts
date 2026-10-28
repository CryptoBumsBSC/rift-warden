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
  qld: "Australia/Brisbane", nsw: "Australia/Sydney", vic: "Australia/Melbourne", tas: "Australia/Hobart", act: "Australia/Sydney", nt: "Australia/Darwin",
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


// Every country by name -> the time zone of its capital (or main city). Countries with several zones: use a city for accuracy.
const COUNTRY_ZONES = "AF:Asia/Kabul AL:Europe/Tirane DZ:Africa/Algiers AD:Europe/Andorra AO:Africa/Luanda AG:America/Antigua AR:America/Argentina/Buenos_Aires AM:Asia/Yerevan AU:Australia/Sydney AT:Europe/Vienna AZ:Asia/Baku BS:America/Nassau BH:Asia/Bahrain BD:Asia/Dhaka BB:America/Barbados BY:Europe/Minsk BE:Europe/Brussels BZ:America/Belize BJ:Africa/Porto-Novo BT:Asia/Thimphu BO:America/La_Paz BA:Europe/Sarajevo BW:Africa/Gaborone BR:America/Sao_Paulo BN:Asia/Brunei BG:Europe/Sofia BF:Africa/Ouagadougou BI:Africa/Bujumbura CV:Atlantic/Cape_Verde KH:Asia/Phnom_Penh CM:Africa/Douala CA:America/Toronto CF:Africa/Bangui TD:Africa/Ndjamena CL:America/Santiago CN:Asia/Shanghai CO:America/Bogota KM:Indian/Comoro CG:Africa/Brazzaville CD:Africa/Kinshasa CR:America/Costa_Rica CI:Africa/Abidjan HR:Europe/Zagreb CU:America/Havana CY:Asia/Nicosia CZ:Europe/Prague DK:Europe/Copenhagen DJ:Africa/Djibouti DM:America/Dominica DO:America/Santo_Domingo EC:America/Guayaquil EG:Africa/Cairo SV:America/El_Salvador GQ:Africa/Malabo ER:Africa/Asmara EE:Europe/Tallinn SZ:Africa/Mbabane ET:Africa/Addis_Ababa FJ:Pacific/Fiji FI:Europe/Helsinki FR:Europe/Paris GA:Africa/Libreville GM:Africa/Banjul GE:Asia/Tbilisi DE:Europe/Berlin GH:Africa/Accra GR:Europe/Athens GD:America/Grenada GT:America/Guatemala GN:Africa/Conakry GW:Africa/Bissau GY:America/Guyana HT:America/Port-au-Prince HN:America/Tegucigalpa HU:Europe/Budapest IS:Atlantic/Reykjavik IN:Asia/Kolkata ID:Asia/Jakarta IR:Asia/Tehran IQ:Asia/Baghdad IE:Europe/Dublin IL:Asia/Jerusalem IT:Europe/Rome JM:America/Jamaica JP:Asia/Tokyo JO:Asia/Amman KZ:Asia/Almaty KE:Africa/Nairobi KI:Pacific/Tarawa KP:Asia/Pyongyang KR:Asia/Seoul XK:Europe/Belgrade KW:Asia/Kuwait KG:Asia/Bishkek LA:Asia/Vientiane LV:Europe/Riga LB:Asia/Beirut LS:Africa/Maseru LR:Africa/Monrovia LY:Africa/Tripoli LI:Europe/Vaduz LT:Europe/Vilnius LU:Europe/Luxembourg MG:Indian/Antananarivo MW:Africa/Blantyre MY:Asia/Kuala_Lumpur MV:Indian/Maldives ML:Africa/Bamako MT:Europe/Malta MH:Pacific/Majuro MR:Africa/Nouakchott MU:Indian/Mauritius MX:America/Mexico_City FM:Pacific/Pohnpei MD:Europe/Chisinau MC:Europe/Monaco MN:Asia/Ulaanbaatar ME:Europe/Podgorica MA:Africa/Casablanca MZ:Africa/Maputo MM:Asia/Yangon NA:Africa/Windhoek NR:Pacific/Nauru NP:Asia/Kathmandu NL:Europe/Amsterdam NZ:Pacific/Auckland NI:America/Managua NE:Africa/Niamey NG:Africa/Lagos MK:Europe/Skopje NO:Europe/Oslo OM:Asia/Muscat PK:Asia/Karachi PW:Pacific/Palau PS:Asia/Gaza PA:America/Panama PG:Pacific/Port_Moresby PY:America/Asuncion PE:America/Lima PH:Asia/Manila PL:Europe/Warsaw PT:Europe/Lisbon QA:Asia/Qatar RO:Europe/Bucharest RU:Europe/Moscow RW:Africa/Kigali KN:America/St_Kitts LC:America/St_Lucia VC:America/St_Vincent WS:Pacific/Apia SM:Europe/San_Marino ST:Africa/Sao_Tome SA:Asia/Riyadh SN:Africa/Dakar RS:Europe/Belgrade SC:Indian/Mahe SL:Africa/Freetown SG:Asia/Singapore SK:Europe/Bratislava SI:Europe/Ljubljana SB:Pacific/Guadalcanal SO:Africa/Mogadishu ZA:Africa/Johannesburg SS:Africa/Juba ES:Europe/Madrid LK:Asia/Colombo SD:Africa/Khartoum SR:America/Paramaribo SE:Europe/Stockholm CH:Europe/Zurich SY:Asia/Damascus TW:Asia/Taipei TJ:Asia/Dushanbe TZ:Africa/Dar_es_Salaam TH:Asia/Bangkok TL:Asia/Dili TG:Africa/Lome TO:Pacific/Tongatapu TT:America/Port_of_Spain TN:Africa/Tunis TR:Europe/Istanbul TM:Asia/Ashgabat TV:Pacific/Funafuti UG:Africa/Kampala UA:Europe/Kyiv AE:Asia/Dubai GB:Europe/London US:America/New_York UY:America/Montevideo UZ:Asia/Tashkent VU:Pacific/Efate VA:Europe/Vatican VE:America/Caracas VN:Asia/Ho_Chi_Minh YE:Asia/Aden ZM:Africa/Lusaka ZW:Africa/Harare HK:Asia/Hong_Kong MO:Asia/Macau PR:America/Puerto_Rico GL:America/Nuuk";
const COUNTRY_EXTRA: Record<string, string> = { usa: "US", "united states": "US", america: "US", "united states of america": "US", uk: "GB", "great britain": "GB", "united kingdom": "GB", england: "GB", scotland: "GB", wales: "GB", "northern ireland": "GB", russia: "RU", "south korea": "KR", "north korea": "KP", "ivory coast": "CI", "czech republic": "CZ", czechia: "CZ", burma: "MM", swaziland: "SZ", "east timor": "TL", "cape verde": "CV", turkey: "TR", turkiye: "TR", holland: "NL", "uae": "AE", "emirates": "AE", macedonia: "MK", palestine: "PS", kosovo: "XK", taiwan: "TW", "hong kong": "HK", "vatican city": "VA" };
let countryIndex: Map<string, string> | null = null;
function buildCountryIndex(): Map<string, string> {
  if (countryIndex) return countryIndex;
  const m = new Map<string, string>();
  let dn: any = null;
  try { dn = new (Intl as any).DisplayNames(["en"], { type: "region" }); } catch {}
  const byCode: Record<string, string> = {};
  for (const pair of COUNTRY_ZONES.split(/\s+/)) {
    const [code, zone] = pair.split(":");
    byCode[code] = zone;
    let name = "";
    try { name = dn ? dn.of(code) : ""; } catch {}
    if (name && name !== code) m.set(name.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim(), zone);
  }
  for (const [k, code] of Object.entries(COUNTRY_EXTRA)) if (byCode[code]) m.set(k, byCode[code]);
  countryIndex = m;
  return m;
}

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
  const country = buildCountryIndex().get(c);
  if (country) return country;
  // "Brisbane QLD", "Austin Texas": try again without the last word(s)
  const words = c.split(" ");
  for (let n = words.length - 1; n >= 1 && n >= words.length - 2; n--) {
    const part = words.slice(0, n).join(" ");
    if (ALIASES[part]) return ALIASES[part];
    const hit = idx.get(part.replace(/ /g, "_")) || idx.get(part) || buildCountryIndex().get(part);
    if (hit) return hit;
  }
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
  const m = text.trim().match(/^(?:(\d{4}-\d{2}-\d{2}|today|tomorrow)\s+)?(\d{3,4}|\d{1,2}(?:[:.]\d{2})?)\s*(am|pm)?\s+(.+?)\s+(?:to|in|into|->)\s+(.+)$/i);
  if (!m) return USAGE_QUICK;
  const tm = m[2].match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);
  const clock = tm ? readClock(tm[1], tm[2], m[3]) : null;
  if (!clock) return "I couldn't read that time. Use 7pm, 7:30pm, 930pm or 19:00.\n\n" + USAGE_QUICK;
  const srcTz = resolveZone(m[4]);
  if (!srcTz) return `I don't know the place "${m[4].trim()}". Try a city or country, like London, Peru or Los Angeles.`;
  const targets: { tz: string; label: string }[] = [];
  for (const raw of m[5].split(/[,;&]|\band\b/i).map(s => s.trim()).filter(Boolean).slice(0, 8)) {
    const tz = resolveZone(raw);
    if (!tz) return `I don't know the place "${raw}". Try a city or country, like London, Peru or Los Angeles.`;
    targets.push({ tz, label: raw.replace(/\b\w/g, c => c.toUpperCase()) });
  }
  if (!targets.length) return USAGE_QUICK;
  let y: number, mo: number, d: number;
  const ds = (m[1] || "").toLowerCase();
  if (/^\d{4}-/.test(ds)) { [y, mo, d] = ds.split("-").map(Number); }
  else { const t = todayIn(srcTz, ds === "tomorrow" ? 1 : 0); y = t.y; mo = t.m; d = t.d; }
  const utc = zonedToUtc(y, mo, d, clock.h, clock.mi, srcTz);
  if (Number.isNaN(utc)) return "I couldn't read that date.";
  return { utc, srcTz, srcLabel: m[4].trim().replace(/\b\w/g, c => c.toUpperCase()), targets };
}

export interface EventResult { utc: number; tz: string; title: string }
export const USAGE_EVENT = "To post a meeting time that members can check in their own time zone, send:\n/timeconvert 2026-11-05 19:00 Video chat\n\nTo use another time zone, put it before the title with a bar:\n/timeconvert 2026-11-05 19:00 London | Video chat";

// "2026-11-05 19:00 Video chat"  /  "2026-11-05 19:00 London | Video chat"
export function parseEvent(text: string, defaultTz: string): EventResult | string | null {
  const m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*(am|pm)?\s*(.*)$/i);
  if (!m) return null; // not the event form
  const clock = readClock(m[4], m[5], m[6]);
  if (!clock) return "I couldn't read that time. Use 24-hour time like 19:00.\n\n" + USAGE_EVENT;
  // "2026-11-05 19:00 Hobart to Los Angeles" is the quick form (a place then "to"), not a meeting title.
  const q = m[7].match(/^(.+?)\s+(?:to|into)\s+\S/i);
  if (q && !m[7].includes("|") && resolveZone(q[1])) return null;
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
