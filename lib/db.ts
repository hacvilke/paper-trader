import { Pool } from "pg";

/**
 * Shared storage on Supabase Postgres (env DATABASE_URL).
 * Falls back to the on-disk file cabinet when DATABASE_URL is not set
 * (local dev / static deploys). Survives Render deploys and restarts.
 *
 * Render setup → Environment → add:
 *   DATABASE_URL = <Supabase "Connect" → Session pooler URI, port 5432,
 *                   with your password embedded, &sslmode=require>
 */
let pool: Pool | null = null;

export function db(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 5 });
    void ensureSchema();
  }
  return pool;
}

async function ensureSchema() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        uname   text PRIMARY KEY,
        salt    text NOT NULL,
        h       text NOT NULL,
        created bigint NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS saves (
        uname    text PRIMARY KEY,
        state    jsonb NOT NULL,
        saved_at bigint NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS feed (
        id    bigserial PRIMARY KEY,
        uname text NOT NULL,
        txt   text NOT NULL,
        ts    bigint NOT NULL
      );
      CREATE TABLE IF NOT EXISTS biz (
        sym     text PRIMARY KEY,
        uname   text NOT NULL,
        name    text NOT NULL,
        created bigint NOT NULL DEFAULT 0
      );
    `);
  } catch (e) {
    console.error("schema init failed:", e);
  }
}
