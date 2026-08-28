// === NFT COMMUNITY THREAT DETECTION (2026) ===
//
// Added after reviewing what is actually hitting NFT and crypto Telegram
// communities right now. These cover attacks that postdate the original codebase.
//
// Every function here is pure — it takes text and returns a verdict — so it is
// cheap to run on every message and easy to test.

// ---------------------------------------------------------------------------
// 1. FAKE VERIFICATION BOT ATTACK
// ---------------------------------------------------------------------------
//
// The current highest-damage attack on NFT communities. A scammer impersonates
// a project or influencer, funnels people into a group, then tells them to
// "verify" through a bot with a name like OfficiaISafeguardBot — capital I in
// place of the lowercase l, so it reads as "Official" at a glance.
//
// The bot then tells the victim to paste a command into the Windows Run box or
// PowerShell. That command installs malware which reads their private keys.
//
// The tell is the instruction, not the bot. Nothing legitimate ever asks you to
// paste a command into your operating system to join a chat.

const FAKE_VERIFICATION_BOTS = [
  "safeguard", "safeguardbot", "safeguardverify", "verifybot", "verifysafe",
  "collabland", "collab-land", "guardianbot", "shieldbot", "sentinelbot",
  "membersafe", "accessbot", "gatekeeperbot", "authbot", "verifyhuman",
];

const CLIPBOARD_ATTACK_PATTERNS = [
  // Windows Run box / PowerShell / terminal instructions
  "win+r", "win + r", "windows+r", "press win", "run dialog", "run box",
  "powershell", "cmd.exe", "command prompt", "terminal window",
  "ctrl+v", "ctrl + v", "paste it", "paste the code", "paste this",
  "copy the code below", "copy this code", "press enter to verify",
  "hold windows key", "type this command", "run the command",
  "verification code in run", "paste in terminal", "iwr ", "irm ",
  "curl | bash", "wget -o-", "mshta", "rundll32",
];

/**
 * Detects the fake-verification-bot attack chain.
 * Returns a description of what matched, or null.
 */
export function detectFakeVerificationBot(text: string): string | null {
  const lower = text.toLowerCase();

  // The clipboard instruction is the smoking gun on its own.
  for (const pattern of CLIPBOARD_ATTACK_PATTERNS) {
    if (lower.includes(pattern)) {
      return `clipboard/terminal attack instruction ("${pattern}")`;
    }
  }

  // A named verification bot plus any link is the delivery mechanism.
  const hasLink = /https?:\/\/[^\s]+|t\.me\/[^\s]+/i.test(text);
  if (hasLink) {
    for (const name of FAKE_VERIFICATION_BOTS) {
      if (lower.includes(name)) {
        return `verification-bot lure ("${name}")`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 2. HOMOGLYPH / LOOKALIKE CHARACTER DETECTION
// ---------------------------------------------------------------------------
//
// How OfficiaISafeguardBot works, and how admin impersonation works too.
// Cyrillic а, о, е, р, с and Greek ο are visually identical to Latin letters in
// most fonts. Mixing scripts inside one word is almost never innocent.

const CYRILLIC_LOOKALIKES = /[\u0430\u043E\u0435\u0440\u0441\u0445\u0443\u0410\u041E\u0415\u0420\u0421\u0425\u0423\u04BB\u0456\u0458]/;
const GREEK_LOOKALIKES = /[\u03BF\u03B1\u03B5\u03C1\u03C4\u03B9\u039F\u0391\u0395\u03A1\u03A4]/;

/**
 * True when a string mixes Latin with Cyrillic or Greek lookalike characters —
 * the standard way to fake a trusted name.
 */
export function hasHomoglyphs(text: string): boolean {
  if (!text) return false;
  const hasLatin = /[a-zA-Z]/.test(text);
  if (!hasLatin) return false;
  return CYRILLIC_LOOKALIKES.test(text) || GREEK_LOOKALIKES.test(text);
}

/**
 * Catches the capital-I-for-lowercase-l trick and its relatives by folding
 * confusable characters together before comparing.
 */
export function foldConfusables(text: string): string {
  return text
    .toLowerCase()
    .replace(/[іi1l|!]/g, "i")
    .replace(/[оo0]/g, "o")
    .replace(/[аa@4]/g, "a")
    .replace(/[еe3]/g, "e")
    .replace(/[ѕs5$]/g, "s")
    .replace(/[рp]/g, "p")
    .replace(/[сc(]/g, "c")
    .replace(/[хx]/g, "x")
    .replace(/[уy]/g, "y")
    .replace(/[gq9]/g, "g")
    .replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// 3. TYPOSQUAT DETECTION FOR YOUR OWN DOMAINS
// ---------------------------------------------------------------------------
//
// NFT-specific and, in my view, the single most valuable addition here.
//
// The most effective scam against a collection is not a generic phishing link.
// It is a near-perfect copy of YOUR mint page on a domain one character away
// from yours. Members who have been told "only trust the official site" click
// it precisely because it looks official.
//
// Generic blocklists can never cover this, because the attacker registers the
// domain the day they use it. Comparing against your own domain does.

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const OFFICIAL_DOMAINS = Array.from(new Set([
  ...(process.env.OFFICIAL_DOMAINS || "").split(","),
  hostnameFromUrl(process.env.OFFICIAL_WEBSITE_URL || "") || "",
].map(d => d.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean)));

// Domains that are allowed to look similar because they ARE us, plus the
// major marketplaces and explorers members legitimately link to.
const DOMAIN_ALLOWLIST = [
  ...OFFICIAL_DOMAINS,
  "opensea.io", "base.org", "basescan.org", "etherscan.io",
  "t.me", "telegram.org", "coingecko.com", "magiceden.io",
];

function editDistance(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

/**
 * Flags links that impersonate the project's own domains.
 * Returns the offending URL and what it was pretending to be, or null.
 */
export function detectDomainImpersonation(text: string): { url: string; mimicking: string } | null {
  const urlRegex = /https?:\/\/([^\s\/]+)/gi;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const host = match[1].toLowerCase().replace(/^www\./, "");

    // Exact match on something we trust — fine.
    if (DOMAIN_ALLOWLIST.some(d => host === d || host.endsWith("." + d))) continue;

    // Mixed-script domain names are never accidental.
    if (hasHomoglyphs(host)) {
      return { url: match[1], mimicking: "a legitimate domain (mixed character sets)" };
    }

    for (const official of OFFICIAL_DOMAINS) {
      // Our brand name appearing in someone else's domain
      const brand = official.split(".")[0];
      const officialRoot = official.replace(/\.[a-z.]+$/, "");

      if (brand.length > 5 && host.includes(brand) && !DOMAIN_ALLOWLIST.some(d => host.endsWith(d))) {
        return { url: match[1], mimicking: official };
      }

      // One or two characters away from the real thing
      const hostRoot = host.replace(/\.[a-z.]+$/, "");
      if (Math.abs(hostRoot.length - officialRoot.length) <= 3) {
        const distance = editDistance(hostRoot, officialRoot);
        if (distance > 0 && distance <= 2) {
          return { url: match[1], mimicking: official };
        }
      }

      // Confusable-folded match — catches b00merverse, boomerv3rse, etc.
      if (foldConfusables(hostRoot) === foldConfusables(officialRoot) && hostRoot !== officialRoot) {
        return { url: match[1], mimicking: official };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 4. MINT AND AIRDROP BAIT
// ---------------------------------------------------------------------------
//
// Phrases specific to NFT drops rather than generic crypto. These do real
// damage in the window around a mint, when members are primed to expect a link.

const MINT_BAIT_PHRASES = [
  "stealth mint", "surprise mint", "mint is live now", "early mint access",
  "whitelist closing", "wl spots left", "last spots", "claim your spot",
  "free mint live", "public mint open", "mint before it sells out",
  "snapshot taken", "claim your airdrop", "airdrop live", "eligible for airdrop",
  "claim rewards now", "unclaimed rewards", "you have a pending",
  "verify holdings", "verify ownership to claim", "sync your collection",
  "migrate your nft", "contract migration", "reclaim your nft",
  "your nft is at risk", "urgent action required", "wallet at risk",
];

/**
 * Mint and airdrop urgency bait. Only fires when paired with a link, because
 * "mint is live" is something the project itself will legitimately say.
 */
export function detectMintBait(text: string): string | null {
  const lower = text.toLowerCase();
  const hasLink = /https?:\/\/[^\s]+|t\.me\/[^\s]+/i.test(text);
  if (!hasLink) return null;

  for (const phrase of MINT_BAIT_PHRASES) {
    if (lower.includes(phrase)) return phrase;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. SUSPICIOUS BOT DETECTION
// ---------------------------------------------------------------------------
//
// Anyone with permission can add a bot to a group. A malicious one can read and
// post in the chat immediately. There is no verified-bot badge on Telegram, so
// a name is not evidence of anything.

export function isSuspiciousBotName(username: string | undefined): string | null {
  if (!username) return null;
  const lower = username.toLowerCase();

  if (hasHomoglyphs(username)) {
    return "bot name mixes character sets — classic impersonation";
  }

  const folded = foldConfusables(username);
  for (const name of FAKE_VERIFICATION_BOTS) {
    if (folded.includes(foldConfusables(name))) {
      return `bot name matches a known verification-scam pattern ("${name}")`;
    }
  }

  const impersonationWords = [
    "official", "support", "admin", "verify", "security", "announce",
    "helpdesk", "moderator", "team",
  ];
  for (const word of impersonationWords) {
    if (folded.includes(word)) {
      return `bot name contains "${word}" — impersonation risk`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 6. COMPROMISED ADMIN GUARD
// ---------------------------------------------------------------------------
//
// Admins are exempt from moderation, which is normally correct and is also the
// single biggest hole in any Telegram community bot.
//
// When an admin account is stolen — and in NFT projects that is a specific,
// well-funded goal — the bot's own rules guarantee it will stay silent while
// the thief posts a drainer link to everyone.
//
// This does not moderate admins. It cannot, and shouldn't. It raises an alarm
// so a human sees it within seconds instead of hours.

const CATASTROPHIC_PHRASES = [
  "connect your wallet", "connect wallet", "verify your wallet",
  "sync your wallet", "validate your wallet", "restore your wallet",
  "seed phrase", "recovery phrase", "private key",
  "approve this transaction", "sign this message to claim",
  "claim your airdrop", "stealth mint", "surprise mint",
  "send eth to", "double your",
];

/**
 * Returns a reason when an ADMIN posts something that, from an admin account,
 * is almost certainly a compromise rather than a mistake.
 */
export function detectAdminCompromise(text: string): string | null {
  const lower = text.toLowerCase();

  for (const phrase of CATASTROPHIC_PHRASES) {
    if (lower.includes(phrase)) {
      return `admin account posted "${phrase}"`;
    }
  }

  const impersonation = detectDomainImpersonation(text);
  if (impersonation) {
    return `admin account posted a link impersonating ${impersonation.mimicking}`;
  }

  return null;
}
