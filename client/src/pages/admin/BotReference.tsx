import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Search, MessageCircle, Shield, Sparkles, Gamepad2, Crown } from "lucide-react";

type Cmd = { name: string; desc: string; role: "everyone" | "admin" | "owner" };

const COMMANDS: Record<string, Cmd[]> = {
  "Getting Started": [
    { name: "/start", desc: "Welcome message and safety basics", role: "everyone" },
    { name: "/help", desc: "Full command list", role: "everyone" },
    { name: "/info", desc: "About Boomerverse", role: "everyone" },
    { name: "/legal", desc: "Legal disclaimers", role: "everyone" },
    { name: "/safety", desc: "How not to get robbed — the seven rules", role: "everyone" },
    { name: "/characters", desc: "The two hard-locked Genesis pieces", role: "everyone" },
    { name: "/communityinfo", desc: "Community stats & profile", role: "everyone" },
    { name: "/status", desc: "Live community snapshot", role: "admin" },
    { name: "/myprofile", desc: "Your member profile", role: "everyone" },
  ],
  "AI & Chat": [
    { name: "/ask <question>", desc: "Ask about the collection (lore-guarded GPT)", role: "everyone" },
    { name: "/fact", desc: "Australian wildlife and conservation fact", role: "everyone" },
    { name: "/warden", desc: "Toggle direct-address mode", role: "everyone" },
    { name: "/story", desc: "Read out a record entry — admin only, never auto-posted", role: "admin" },
  ],
  "Games & Leaderboards": [
    { name: "/trivia [1-25]", desc: "Trivia round — Tasmania, Australian wildlife, Boomerverse canon", role: "everyone" },
    { name: "/answer 1-4", desc: "Answer the current question", role: "everyone" },
    { name: "/puzzle [hard]", desc: "Word puzzle — Australian words", role: "everyone" },
    { name: "/guess <word>", desc: "Submit puzzle guess", role: "everyone" },
    { name: "/leaderboard", desc: "Trivia leaderboard", role: "everyone" },
    { name: "/puzzleboard", desc: "Puzzle leaderboard", role: "everyone" },
    { name: "/myscore", desc: "Your scores", role: "everyone" },
  ],
  "Giveaways": [
    { name: "/giveaway <prize>", desc: "Start a giveaway", role: "owner" },
    { name: "/enter", desc: "Enter active giveaway", role: "everyone" },
    { name: "/entries", desc: "Show entry count", role: "everyone" },
    { name: "/pickwinner", desc: "Pick winner of active giveaway", role: "owner" },
    { name: "/endgiveaway", desc: "End giveaway without a winner", role: "owner" },
    { name: "/poll <question>", desc: "Create a poll", role: "admin" },
  ],
  "Moderation": [
    { name: "/warn", desc: "Warn replied-to user (3 warns = mute)", role: "admin" },
    { name: "/mute <minutes>", desc: "Mute replied-to user", role: "admin" },
    { name: "/unmute", desc: "Unmute replied-to user", role: "admin" },
    { name: "/ban", desc: "Ban replied-to user", role: "admin" },
    { name: "/kick", desc: "Kick replied-to user (can rejoin)", role: "admin" },
    { name: "/violations", desc: "Security violation log", role: "owner" },
    { name: "/modstats", desc: "Moderation statistics", role: "admin" },
    { name: "/setrole <role>", desc: "Assign a community role", role: "admin" },
  ],
  "Anti-Raid": [
    { name: "/lockdown", desc: "Manually activate raid lockdown", role: "admin" },
    { name: "/unlock", desc: "End lockdown early", role: "admin" },
    { name: "/raidstatus", desc: "Current join rate and lockdown state", role: "admin" },
    { name: "/raidmode on|off", desc: "Toggle stricter anti-raid thresholds", role: "admin" },
  ],
  "Trust System": [
    { name: "/trustinfo", desc: "Your trust score and progress", role: "everyone" },
    { name: "/trustpoints", desc: "How trust is earned", role: "everyone" },
    { name: "/trustboard", desc: "Trust leaderboard", role: "everyone" },
    { name: "/trust", desc: "Vouch for replied-to user", role: "owner" },
    { name: "/untrust", desc: "Remove trust status", role: "owner" },
    { name: "/trustbulk @a @b", desc: "Vouch up to 10 users at once", role: "owner" },
    { name: "/trustfreeze", desc: "Freeze a user's trust progress", role: "owner" },
    { name: "/trustunfreeze", desc: "Unfreeze trust progress", role: "owner" },
    { name: "/trustset <level>", desc: "Set trust level directly", role: "owner" },
    { name: "/trustremove <level>", desc: "Reduce trust level", role: "owner" },
  ],
  "Setup & Admin": [
    { name: "/setup", desc: "Onboarding wizard", role: "admin" },
    { name: "/settings", desc: "Feature toggle dashboard", role: "admin" },
    { name: "/toggle <name>", desc: "Flip a single feature", role: "admin" },
    { name: "/adminhelp", desc: "Full admin reference in chat", role: "admin" },
    { name: "/setname", desc: "Community display name", role: "admin" },
    { name: "/setnickname", desc: "What the bot calls itself here", role: "admin" },
    { name: "/setwelcome", desc: "Custom welcome message", role: "admin" },
    { name: "/settimezone", desc: "Timezone for scheduled posts", role: "admin" },
    { name: "/addadmin", desc: "Grant bot admin rights", role: "owner" },
    { name: "/removeadmin", desc: "Revoke bot admin rights", role: "owner" },
    { name: "/changeadmin", desc: "Replace the whole bot admin list", role: "owner" },
    { name: "/listadmins", desc: "Show the bot admin list", role: "everyone" },
  ],
};

type Feature = { key: string; name: string; desc: string };
const FEATURES: Record<string, Feature[]> = {
  "Safety (6)": [
    { key: "spam", name: "Anti-Spam", desc: "Rate limits, duplicate detection, sticker/voice/media spam, emoji flood" },
    { key: "scam", name: "Scam Detection", desc: "Seed phrase detection, drainer domains, permit-signature attacks, fake CAPTCHA, fake verification bots, clipboard malware, lookalike domains of our own site, mint/airdrop bait" },
    { key: "hate", name: "Hate Speech Filter", desc: "Base64-obscured slur detection with l33t-speak normalisation" },
    { key: "links", name: "Link Control", desc: "New users can't post links; allowlist for official domains; blocks URL shorteners" },
    { key: "files", name: "Dangerous File Blocking", desc: "Blocks .exe, .bat, .apk, .scr and 22 other executable types" },
    { key: "newuser", name: "New User Restrictions", desc: "First-24h users can't forward; first-48h can't share contacts" },
  ],
  "Security Gates (6)": [
    { key: "raid", name: "Anti-Raid Mode", desc: "5+ joins in 2 min auto-triggers a 5 minute lockdown" },
    { key: "impersonation", name: "Impersonation Detection", desc: "Levenshtein matching on admin usernames, plus mixed-script (Cyrillic/Greek lookalike) name detection" },
    { key: "captcha", name: "Join CAPTCHA", desc: "Tap-to-verify on join; unverified users removed after 10 min by the cron sweep" },
    { key: "accountAge", name: "Account Age Gate", desc: "Removes brand-new Telegram accounts on join" },
    { key: "massMention", name: "Mass Mention Block", desc: "Blocks messages tagging 5+ users at once" },
    { key: "bioScan", name: "Bio Scam Scan", desc: "Reads new members' profile bio at join and bans on scam phrases or wallet addresses" },
  ],
  "Always on (no toggle)": [
    { key: "ownerOnlyBots", name: "Owner-Only Bot Rule", desc: "Only the global owner may add a bot to the group. Any bot added by anyone else is removed immediately and logged. Covers both join paths." },
    { key: "adminCompromise", name: "Compromised Admin Alarm", desc: "Admins bypass moderation by design. If an admin account posts a wallet-drainer phrase or a spoofed link, every other admin is tagged instantly." },
  ],
  "AI & Voice (4)": [
    { key: "personality", name: "Warden Voice", desc: "Dry asides and time-of-day register (Hobart time). 5% rate." },
    { key: "learning", name: "Bot Learning", desc: "Learns from thumbs up/down; reuses proven answers to cut API cost" },
    { key: "aiChat", name: "AI Chat (GPT)", desc: "GPT-4o-mini Q&A with hard no-lore-drift, no-price-talk rules" },
    { key: "stories", name: "Story Entries", desc: "Admin-invoked only, never auto-posted. Off by default." },
  ],
  "Community (5)": [
    { key: "trust", name: "Trust System", desc: "45-day eligibility, daily/weekly caps, vouching, freezing" },
    { key: "games", name: "Games", desc: "Trivia (100 questions) and word puzzle (807 words). Rounds stored in Redis." },
    { key: "giveaways", name: "Giveaways", desc: "Durable entries, random draw, owner-controlled" },
    { key: "scheduled", name: "Scheduled Posts", desc: "Quote of the day, birthdays, winner announcements — run by cron" },
    { key: "edits", name: "Edit Monitoring", desc: "Catches new users editing clean messages to sneak in scam links" },
  ],
};

function roleBadge(role: Cmd["role"]) {
  if (role === "owner") return <Badge variant="default" className="bg-purple-600">Owner</Badge>;
  if (role === "admin") return <Badge variant="secondary">Admin</Badge>;
  return <Badge variant="outline">Everyone</Badge>;
}

const ICONS: Record<string, any> = {
  "General / Info": MessageCircle,
  "AI & Chat": Sparkles,
  "Games & Leaderboards": Gamepad2,
  "Giveaways": Sparkles,
  "Moderation": Shield,
  "Trust System": Shield,
  "Community Setup (per-group)": Book,
  "Global Owner / SaaS": Crown,
};

export default function BotReference() {
  const [q, setQ] = useState("");
  const lower = q.trim().toLowerCase();
  const totalCmds = Object.values(COMMANDS).reduce((n, c) => n + c.length, 0);
  const totalFeatures = Object.values(FEATURES).reduce((n, c) => n + c.length, 0);

  const matchCmd = (c: Cmd) => !lower || c.name.toLowerCase().includes(lower) || c.desc.toLowerCase().includes(lower);
  const matchFeat = (f: Feature) => !lower || f.key.toLowerCase().includes(lower) || f.name.toLowerCase().includes(lower) || f.desc.toLowerCase().includes(lower);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bot Reference</h1>
        <p className="text-slate-500 text-sm">
          {totalCmds} commands · {totalFeatures} toggleable features
        </p>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search commands or features…"
          className="pl-9"
          value={q}
          onChange={e => setQ(e.target.value)}
          data-testid="input-search"
        />
      </div>

      <Tabs defaultValue="commands">
        <TabsList>
          <TabsTrigger value="commands" data-testid="tab-commands">Commands ({totalCmds})</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">Features ({totalFeatures})</TabsTrigger>
        </TabsList>

        <TabsContent value="commands" className="space-y-4 mt-4">
          {Object.entries(COMMANDS).map(([group, cmds]) => {
            const visible = cmds.filter(matchCmd);
            if (visible.length === 0) return null;
            const Icon = ICONS[group] || Book;
            return (
              <Card key={group}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-4 h-4" /> {group}
                    <span className="text-xs text-slate-400 font-normal ml-auto">{visible.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {visible.map(c => (
                    <div key={c.name} className="flex items-start justify-between py-2 gap-3" data-testid={`row-cmd-${c.name.slice(1)}`}>
                      <div className="flex-1 min-w-0">
                        <code className="text-sm font-mono text-emerald-700 dark:text-emerald-400">{c.name}</code>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.desc}</div>
                      </div>
                      <div className="flex-shrink-0">{roleBadge(c.role)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="features" className="space-y-4 mt-4">
          {Object.entries(FEATURES).map(([group, feats]) => {
            const visible = feats.filter(matchFeat);
            if (visible.length === 0) return null;
            return (
              <Card key={group}>
                <CardHeader><CardTitle className="text-base">{group}</CardTitle></CardHeader>
                <CardContent className="divide-y">
                  {visible.map(f => (
                    <div key={f.key} className="py-3" data-testid={`row-feature-${f.key}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{f.name}</span>
                        <code className="text-xs text-slate-500 font-mono">{f.key}</code>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.desc}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
