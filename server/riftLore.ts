// === THE RIFT WARDEN — LORE & VOICE MODULE ===
//
// Replaces the Boomerverse storyBible.ts.
//
// GOLDEN RULE — NO LORE DRIFT.
// Anything not written in this file, the Master Rulebook, the BVGEN Registry,
// the Lore Bible or the Living Whitepaper is NOT canon. The Warden does not
// guess, extrapolate, improvise or "fill in" canon. If it is not confirmed here,
// the Warden says so and stops. See UNCONFIRMED_REPLIES below.

// ---------------------------------------------------------------------------
// PROJECT FACTS — confirmed, safe to state publicly
// ---------------------------------------------------------------------------

export const PROJECT_INFO = `Boomerverse

An Australian collectible universe where bush legend, wildlife, relics and
strange new worlds collide.

First collection — Boomerverse: Genesis
- Code: BVGEN
- Supply: 333 unique pieces
- Chain: Base
- Standard: ERC-721

Rarity allocation (locked):
- Common 166
- Uncommon 83
- Rare 42
- Epic 24
- Legendary 12
- Mythic 5
- Relic Tier 1

What this is:
- A long-term character-driven collectible universe
- Original Australian art and written canon
- A community, and a conservation intent — a portion of profits is intended to
  support Australian endangered-animal and biodiversity causes, with the exact
  structure published when formally approved

What this is not:
- An investment
- A financial product
- A promise of profit
- A separate Boomerverse ERC-20 token launch in the current project design.
  Any future change would require an explicit versioned project-rule update.`;

const BOT_USERNAME = (process.env.BOT_USERNAME || "RiftWardenBot").replace(/^@/, "");

export const LINKS = {
  site: (process.env.OFFICIAL_WEBSITE_URL || "").trim(),
  channel: (process.env.OFFICIAL_TELEGRAM_URL || "").trim(),
  bot: (process.env.BOT_PUBLIC_URL || `https://t.me/${BOT_USERNAME}`).trim(),
};

// The two hard-locked pieces. These are the only individual pieces the Warden
// may describe in detail.
export const LOCKED_PIECES = [
  {
    id: "BVGEN #001",
    name: "The Original Boomer",
    detail:
      "Human, Founder, Legendary. Carries the Rift Stone. Green rectangular glasses, grey/white beard, coffee mug. Region: Tasmania / The Gateway. Status: HARD LOCKED.",
  },
  {
    id: "BVGEN #002",
    name: "The Last Thylacine",
    detail:
      "Thylacine, Ancient, Mythic. Carries the Stripe Key. Serious and mysterious; tied to deeper Rift history. Status: HARD LOCKED.",
  },
];

export const STRUCTURE = {
  speciesFamilies: 10,
  classes: 12,
  riftEnergyStates: 7,
  regions: 19,
};

// LOCKED — Master Rulebook v1.1.
export const SPECIES_FAMILIES: string[] = [
  "Kangaroos",
  "Wombats",
  "Cockatoos",
  "Tasmanian Devils",
  "Kookaburras",
  "Echidnas",
  "Humans",
  "Platypuses",
  "Blue Heelers",
  "Thylacines",
];

// LOCKED — Master Rulebook v1.1.
export const CLASSES: string[] = [
  "Founders",
  "Ancients",
  "Explorers",
  "Prospectors",
  "Makers",
  "Traders",
  "Trackers",
  "Broadcasters",
  "Guardians",
  "Hackers",
  "Philosophers",
  "Wildcards",
];

// LOCKED — Master Rulebook v1.1 / Lore Bible v1.0.
export const RIFT_ENERGY_STATES: string[] = [
  "None",
  "Trace",
  "Touched",
  "Active",
  "Unstable",
  "Ancient",
  "Primordial",
];

// LOCKED NAMES — Lore Bible v1.0. Detail beyond the approved continuity notes
// remains flexible/open and must not be invented by the Warden.
export const REGIONS: string[] = [
  "The Gateway",
  "Western Goldfields",
  "Tarkine Deep",
  "Zeehan Yard",
  "Central Highlands",
  "Cradle Pass",
  "Southwest Wilds",
  "Hydro Tunnels",
  "West Coast Track",
  "Derwent Camp",
  "Red Dirt Run",
  "Ironbark Country",
  "Coastal Track",
  "Gumtree Line",
  "Signal Ridge",
  "Radio Hill",
  "Northern Workshop",
  "Outback Relay",
  "The Riftlands",
];

// ---------------------------------------------------------------------------
// REWARD / FAIR-PLAY INFORMATION
// ---------------------------------------------------------------------------

export const ROYALTY_RULES = `The active Genesis reward and fair-play framework is still being finalised.

Safe, confirmed guidance:
- Genesis holders are free to sell, trade, swap, gift or transfer their NFTs.
- Ownership and provenance are not erased by a transfer.
- Reward eligibility is separate from ownership and is never guaranteed.
- For Reward Assets that change owners, a genuine qualifying open-market sale,
  the applicable royalty, fair-market verification and anti-manipulation checks
  can matter under the active rules.
- Exact royalty percentage, qualifying marketplaces, numerical fair-market
  thresholds and some Genesis transfer-treatment details remain open until a
  dated active rules version publishes them.

If somebody asks for a fixed royalty percentage, fixed ETH minimum, penalty
multiplier or an unapproved marketplace list, the correct answer is: not locked yet.`;

export const RIFT_DROPS = `RIFT DROPS are an approved collector-reward direction —
unexpected pieces and opportunities from beyond the Gateway.

Confirmed:
- RIFT DROPS can include lore-linked NFTs, unique 1/1 art, relics, locations,
  companions, alternate story moments, commemorative pieces, physical items,
  experiences or other approved rewards.
- Eligibility unlocks an opportunity, never a guaranteed reward.
- RIFT DROPS do not overwrite Genesis numbering or BVGEN identities.
- No separate ERC-20 token is required for the current RIFT DROP design.

Still open until an active dated rules version publishes them:
- exact Genesis thresholds and rarity combinations
- snapshot and holding-duration methods
- selection timing and frequency
- qualifying marketplace and royalty implementation
- final cross-collection activation rules

I won't turn a working direction into a promise.`;

// ---------------------------------------------------------------------------
// PROTECTED MYSTERIES
// ---------------------------------------------------------------------------
//
// The Lore Bible defines 10 protected mysteries. The Warden may identify a
// subject as protected but must never explain, solve or speculate about it.

export const PROTECTED_MYSTERY_TRIGGERS: string[] = [
  // Who created the Rift Stone?
  "who created the rift stone",
  "who made the rift stone",
  "origin of the rift stone",
  // Why did the Rift Stone respond to The Original Boomer?
  "why did the rift stone respond",
  "why did the rift stone choose",
  "why did the stone respond to",
  // How did the thylacines survive?
  "how did the thylacines survive",
  "how did thylacines survive",
  "thylacines survive",
  // What does The Last Thylacine know?
  "what does the last thylacine know",
  "what does last thylacine know",
  "last thylacine knows",
  // What is the true purpose of the Stripe Key?
  "purpose of the stripe key",
  "what does the stripe key do",
  "what is the stripe key for",
  // Who built the Hydro Tunnels?
  "who built the hydro tunnels",
  "who made the hydro tunnels",
  "origin of the hydro tunnels",
  // What is beyond The Gateway?
  "what is beyond the gateway",
  "what's beyond the gateway",
  "other side of the gateway",
  // What happened in Zeehan?
  "what happened in zeehan",
  "what happened at zeehan",
  "zee han mystery",
  // What exactly is Primordial Rift Energy?
  "primordial rift energy",
  "what is primordial",
  "define primordial rift",
  // Who are all three Founders?
  "who are all three founders",
  "three founders",
  "all the founders",
];

export const PROTECTED_MYSTERY_REPLIES = [
  "That one stays shut. Not being coy — it's protected.",
  "Behind the Gateway. That's all anyone gets, including me.",
  "That's a protected mystery. Asking a fourth way won't open it.",
  "No. And the answer will be no next week as well.",
];

export function isProtectedMystery(text: string): boolean {
  if (!PROTECTED_MYSTERY_TRIGGERS.length) return false;
  const lower = text.toLowerCase();
  return PROTECTED_MYSTERY_TRIGGERS.some((t) => lower.includes(t.toLowerCase()));
}

// ---------------------------------------------------------------------------
// THE WARDEN — VOICE
// ---------------------------------------------------------------------------
//
// Dry. Narrator. Educator. Firm.
// Understatement, not jokes. One warning, not two. Terse rulings, not sass.
// The Warden explains a thing once, properly, then moves on.
// The Warden does not perform, does not flirt with the chat, does not escalate,
// and never tries to win.

export const WARDEN_IDENTITY = `You are The Warden.

You keep the Gateway for the Boomerverse community. You are a sharp-eyed guardian, record-keeper, guide and community character — not a bland helpdesk bot.

How you speak:
- Dry, confident, warm when it matters, and a little cheeky. Australian flavour is welcome; forced slang is not.
- You notice people. Address them by @username when Telegram provides one.
- With newcomers, explain more and give them a proper orientation.
- If somebody tags or replies to you, have a real conversation and keep it going naturally while they keep talking to you.
- You may lightly tease regulars and staff, but never humiliate people or become a roast bot.
- @aussieboomer is the Boss/project owner. Always show respect. Light banter is fine; undermining him is not.
- @TreeFitty is a senior Community Leader with full community/bot trust. Respect them and enjoy the banter.
- @DaveyJon and @rainzy are trusted moderators/admins. Treat them as established staff while still applying link/contract safety checks.
- Explain canon accurately and never invent missing lore.
- Never give financial advice, price predictions, or promise rewards.

You are allowed to have personality. You are not allowed to let personality weaken security or canon.`;

// Dropped in occasionally. Rate is deliberately low — see FLAIR_RATE.
export const WARDEN_LINES = [
  "Noted.",
  "That's the rule. It isn't mine, but it is the rule.",
  "Asked and answered.",
  "The record disagrees with you.",
  "I'll only say this once, so read it properly.",
  "You're welcome to be wrong quietly.",
  "Gateway's been here longer than either of us.",
  "That's a no. It's not a difficult no, but it is a no.",
  "I keep the record. I don't decorate it.",
  "Everything gets written down. That's the whole job.",
];

// Roughly 5% of suitable responses get a small Warden aside.
export const FLAIR_RATE = 0.05;

export const UNCONFIRMED_REPLIES = [
  "Not confirmed. I won't guess at canon.",
  "That isn't locked yet. When it is, it'll be in the Rulebook, not in my mouth.",
  "I don't have that confirmed, so I'm not going to invent it.",
  "Open question. Genuinely open — not a hint.",
];

export const REACTIONS = {
  obviousQuestion: [
    "It's in the pinned message. Have a look.",
    "That one's answered on the site. Worth a read.",
    "Asked and answered, further up.",
  ],
  spamCaught: [
    "Removed.",
    "That's spam. Gone.",
    "No.",
  ],
  welcomeBack: [
    "You're back.",
    "Recorded. Welcome back.",
    "Long absence. Noted.",
  ],
  firstWarning: [
    "That's your warning. There isn't another one.",
    "Stop there. This is the only warning you get.",
    "One warning: stop.",
  ],
  priceTalk: [
    "I don't do price talk. Ask about the art or the canon.",
    "Not a financial product, so not a financial conversation.",
    "No price predictions here. Not from me, and preferably not from anyone.",
  ],
};

// ---------------------------------------------------------------------------
// TRUST / MODERATION COPY
// ---------------------------------------------------------------------------

export const TRUST_DENIAL_MESSAGES = [
  "You don't have the standing for that.",
  "Not yours to run.",
  "That command belongs to someone else.",
  "No. Trust level's too low.",
];

export const RESEARCH_DISCLAIMER =
  "That's outside what I can confirm. Check the official sources yourself and don't take my word as the record.";

// ---------------------------------------------------------------------------
// AMBIENT CONTENT — used when the chat goes quiet
// ---------------------------------------------------------------------------
//
// The Warden educates rather than jokes. These are conversation openers in the
// Warden's register: real Australian wildlife and bush-legend material, which is
// the actual subject matter of the universe.

export const AMBIENT_PROMPTS = [
  "The thylacine was declared extinct in 1936. People still report seeing one, most years, in Tasmania. Nobody has ever produced proof.",
  "A wedge-tailed eagle can hold a two-metre wingspan and barely move a feather doing it.",
  "There are more kangaroos than people in Australia. That has been true for a long time and nobody finds it strange anymore.",
  "The lyrebird copies what it hears. Chainsaws, car alarms, camera shutters. It learns the bush it lives in, including the parts we brought.",
  "Quiet in here. Someone say something worth writing down.",
];

export const STORY_INTROS = [
  "Out past the ridge, where the Gateway sits,",
  "The record has an entry for this one.",
  "There's a story about that, and most of it is even true.",
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function getWardenLine(): string {
  return getRandomItem(WARDEN_LINES);
}

export function getUnconfirmedReply(): string {
  return getRandomItem(UNCONFIRMED_REPLIES);
}

export function getRandomTrustDenial(): string {
  return getRandomItem(TRUST_DENIAL_MESSAGES);
}

export function getAmbientPrompt(): string {
  return getRandomItem(AMBIENT_PROMPTS);
}

// Should the Warden add a line of flair to this response?
export function shouldAddFlair(): boolean {
  return Math.random() < FLAIR_RATE;
}

export function getProjectInfo(): string {
  return PROJECT_INFO;
}

export function getRoyaltyRules(): string {
  return ROYALTY_RULES;
}

export function getRiftDropsInfo(): string {
  return RIFT_DROPS;
}

export function getLockedPieces(): string {
  return LOCKED_PIECES.map((p) => `${p.id} — ${p.name}\n${p.detail}`).join("\n\n");
}

export function describeStructure(
  kind: "species" | "classes" | "rift" | "regions",
): string {
  const map = {
    species: { list: SPECIES_FAMILIES, count: STRUCTURE.speciesFamilies, label: "species families" },
    classes: { list: CLASSES, count: STRUCTURE.classes, label: "classes" },
    rift: { list: RIFT_ENERGY_STATES, count: STRUCTURE.riftEnergyStates, label: "Rift Energy states" },
    regions: { list: REGIONS, count: STRUCTURE.regions, label: "named regions" },
  } as const;

  const entry = map[kind];
  return `${entry.count} ${entry.label}:\n${entry.list.join(", ")}`;
}

// ---------------------------------------------------------------------------
// PERMISSIONS
// ---------------------------------------------------------------------------
// Trust authority is deliberately NOT username-based. Runtime permission checks
// use immutable Telegram user IDs in bot.ts. Usernames are mutable.

export function getTrustManagers(): string[] { return []; }
export function canManageTrust(_username: string | undefined): boolean { return false; }

// ---------------------------------------------------------------------------
// STORIES — admin-invoked only, never auto-posted
// ---------------------------------------------------------------------------
//
// Composed strictly from confirmed material. The Warden narrates the setting and
// the two locked pieces. It does not name unconfirmed characters or events.

const STORY_OPENERS = [
  "The record has an entry for this one.",
  "Out past the ridge, where the Gateway sits, the log picks it up like this.",
  "Short entry. Most of the good ones are.",
];

const STORY_SETTINGS = [
  "the wind coming off the water with nothing in it but salt and distance",
  "a stand of gums that had been through fire twice and come back both times",
  "the flat quiet you get in the bush an hour before anything happens",
  "light going long and gold across country older than any of the names on it",
];

const STORY_TURNS = [
  "Something came through. It was written down and then it was left alone.",
  "The Gateway held. It usually does. That is the part nobody thanks it for.",
  "Nothing was explained. The entry ends there, and I've never seen a reason to add to it.",
  "It was logged, dated, and closed. Whatever else happened isn't mine to say.",
];

export function generateRandomStory(_triggerUsername?: string): string {
  return [
    getRandomItem(STORY_OPENERS),
    "",
    `There was ${getRandomItem(STORY_SETTINGS)}.`,
    getRandomItem(STORY_TURNS),
    "",
    "That's the whole entry. I don't embroider the record.",
  ].join("\n");
}
