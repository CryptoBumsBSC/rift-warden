// === LOCAL DEVELOPMENT SERVER ===
//
// Production runs on Vercel — see the api/ folder. Telegram pushes updates to
// api/telegram.ts, scheduled work runs from api/cron.ts, and the admin portal
// is served by api/admin.ts.
//
// This file exists only so you can run the bot on your own machine to test
// before deploying. It uses long polling instead of a webhook, because there's
// no public URL for Telegram to reach on localhost.
//
//   npm run dev
//
// Nothing here is used in production.

import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer } from "http";
import { startBot } from "./bot";
import { pool } from "./db";
import { setupVite } from "./vite";
import { registerRoutes } from "./routes";
import { registerAdminRoutes } from "./adminRoutes";
import { registerHubApi } from "./hubApi";
import { ensureLocalInstance } from "./bootInstance";

console.log("The Warden — local development server");

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

const PgStore = connectPgSimple(session);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-do-not-use-in-prod";

// Trust the platform proxy so secure cookies & req.protocol work correctly
app.set("trust proxy", 1);

app.use(session({
  store: new PgStore({ pool, tableName: "session", createTableIfMissing: true }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // local only — production cookies are set in api/admin.ts
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", bot: (process.env.BOT_USERNAME || "RiftWardenBot").replace(/^@/, ""), mode: "local-dev" });
});

registerAdminRoutes(app);
registerHubApi(app);

async function main() {
  if (process.env.VERCEL) {
    console.error("This is the local dev server. On Vercel the entry points are in api/.");
    process.exit(1);
  }

  await ensureLocalInstance();
  await registerRoutes(httpServer, app);
  await setupVite(httpServer, app);

  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port, () => {
    console.log(`Local server on http://localhost:${port}`);
  });

  startBot().catch((err) => {
    console.error("Bot failed to start:", err);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
