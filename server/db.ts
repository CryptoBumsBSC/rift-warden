import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Serverless note.
//
// On Vercel every request may run in its own short-lived function. If each one
// opened a handful of database connections, the database would run out of
// connection slots quickly.
//
// Two things prevent that:
//   1. max: 1 — a function only ever needs one connection at a time.
//   2. DATABASE_URL must point at a POOLED connection string (Neon's pooled
//      endpoint, or Supabase's connection pooler on port 6543). The pooler
//      handles the fan-in; this pool just talks to it.
const isServerless = Boolean(process.env.VERCEL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 1 : 10,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: isServerless,
});

export const db = drizzle(pool, { schema });
