// === ADMIN PORTAL API ===
//
// The Express app that used to run permanently now runs per request. Same
// routes, same auth — it just starts and stops around each call.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../server/db";
import { registerAdminRoutes } from "../server/adminRoutes";
import { registerHubApi } from "../server/hubApi";

let app: express.Express | null = null;

function getApp(): express.Express {
  if (app) return app;

  const a = express();
  a.use(express.json({ limit: "2mb" }));
  a.use(express.urlencoded({ extended: false }));
  a.set("trust proxy", 1);

  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }

  // Sessions live in Postgres, not in memory, because there is no memory to
  // live in between requests.
  const PgStore = connectPgSimple(session);
  a.use(session({
    store: new PgStore({ pool, tableName: "session", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }));

  registerAdminRoutes(a);
  registerHubApi(a);

  a.get("/health", (_req, res) => {
    res.json({ status: "ok", bot: (process.env.BOT_USERNAME || "RiftWardenBot").replace(/^@/, "") });
  });

  app = a;
  return a;
}

export default function admin(req: VercelRequest, res: VercelResponse) {
  return getApp()(req as any, res as any);
}
