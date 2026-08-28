import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  activateCommunity,
  deactivateCommunity,
  makeComplimentary,
  banCommunity,
} from "./communityService";

// ─── Session store ────────────────────────────────────────────────────────────
// Short-lived tokens (8 hours) issued after successful server-side PIN validation.
// The master secret (DASHBOARD_SECRET) never leaves the server.
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
interface Session { expiresAt: number }
const sessions = new Map<string, Session>();

function createSession(): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function isValidSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireDashboardAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ─── Routes ───────────────────────────────────────────────────────────────────
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Characters ===
  app.get(api.characters.list.path, async (req, res) => {
    const chars = await storage.getCharacters();
    res.json(chars);
  });

  // === Content ===
  app.get(api.content.list.path, async (req, res) => {
    const type = req.query.type as string | undefined;
    const content = await storage.getContentItems(type);
    res.json(content);
  });

  // === Dashboard auth ===
  // Validates PIN server-side against DASHBOARD_SECRET env var.
  // Returns a short-lived session token — the master secret never reaches the client.
  app.post("/api/dashboard/auth", (req, res) => {
    const { pin } = req.body as { pin?: string };
    const secret = process.env.DASHBOARD_SECRET;
    if (!secret) {
      console.error("[Dashboard] DASHBOARD_SECRET env var is not set — dashboard login is disabled");
      return res.status(503).json({ error: "Dashboard authentication is not configured. Set DASHBOARD_SECRET." });
    }
    if (!pin || pin !== secret) {
      return res.status(401).json({ error: "Invalid PIN" });
    }
    const token = createSession();
    return res.json({ token });
  });

  // === Dashboard: list communities ===
  app.get("/api/dashboard/communities", requireDashboardAuth, async (req, res) => {
    try {
      const comms = await storage.getCommunities();
      const withFeatures = await Promise.all(
        comms.map(async (c) => {
          const features = await storage.getCommunityFeatures(c.chatId);
          return { ...c, features: features ?? null };
        })
      );
      res.json(withFeatures);
    } catch (err) {
      console.error("Dashboard communities error:", err);
      res.status(500).json({ error: "Failed to load communities" });
    }
  });

  // === Dashboard: update community subscription status ===
  // Routes through the shared communityService so behavior (DB update, cache
  // invalidation, Telegram group notification) matches bot command logic exactly.
  const statusSchema = z.object({
    status: z.enum(["active", "free", "complimentary", "trial", "banned"]),
  });

  app.post(
    "/api/dashboard/communities/:chatId/status",
    requireDashboardAuth,
    async (req, res) => {
      try {
        const { chatId } = req.params;
        const parsed = statusSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Invalid status value" });
        }

        const community = await storage.getCommunityById(chatId);
        if (!community) {
          return res.status(404).json({ error: "Community not found" });
        }

        const { status } = parsed.data;
        switch (status) {
          case "active":       await activateCommunity(chatId);       break;
          case "free":         await deactivateCommunity(chatId);     break;
          case "complimentary":await makeComplimentary(chatId);        break;
          case "banned":       await banCommunity(chatId);             break;
          default:
            return res.status(400).json({ error: `Unhandled status: ${status}` });
        }

        // Fetch fresh record to return up-to-date state
        const updated = await storage.getCommunityById(chatId);
        res.json(updated);
      } catch (err) {
        console.error("Update community status error:", err);
        res.status(500).json({ error: "Failed to update status" });
      }
    }
  );

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingChars = await storage.getCharacters();
  if (existingChars.length === 0) {
    console.log("Seeding database...");

    await storage.createCharacter({ name: "BVGEN #001 The Original Boomer", description: "Human, Founder. Carries the Rift Stone. Green glasses. Tasmania. Status: HARD LOCKED.", role: "Founder" });
    await storage.createCharacter({ name: "BVGEN #002 The Last Thylacine", description: "Ancient, Mythic. Carries the Stripe Key. Status: HARD LOCKED.", role: "Mythic" });

    const facts = [
      "The thylacine was declared extinct in 1936. Tasmania still logs sighting reports most years. None has ever been confirmed.",
      "The Tasmanian devil is the largest carnivorous marsupial alive.",
      "King's lomatia grows only in Tasmania, and every surviving plant is a genetically identical clone.",
      "Base is an Ethereum layer-2 — cheaper to transact, same underlying security model.",
    ];
    for (const fact of facts) await storage.createContentItem({ type: "fact", content: fact });

    await storage.createContentItem({ type: "project_info", title: "What this is", content: "A long-term Australian character-driven collectible universe\nOriginal art and written canon\nA community, and a conservation intent" });
    await storage.createContentItem({ type: "project_info", title: "What this is not", content: "An investment\nA financial product\nA promise of profit\nA token launch — there is no ERC-20" });

    const legalPoints = [
      "Not investments, securities, or financial products",
      "No returns, income, or appreciation promised",
      "Art, canon, and community only",
      "There is no ERC-20 token and there will not be one",
    ];
    for (const point of legalPoints) await storage.createContentItem({ type: "legal", content: point });

    console.log("Database seeded!");
  }
}
