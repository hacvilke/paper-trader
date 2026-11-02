import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { rateLimit, tooMany } from "@/lib/ratelimit";
import { safeEq } from "@/lib/sec";

/**
 * The file cabinet — one save per badge (or the guest slot "main"),
 * now living in Supabase Postgres when DATABASE_URL is set, with the
 * original on-disk cabinet as fallback.
 *
 *  GET /api/save?slot=main            → guest cabinet
 *  GET /api/save?as=user&t=<token>    → per-badge cabinet (auth)
 *  PUT  same params, body = game state
 */
const DIR = path.join(process.cwd(), "data");
const ACCOUNTS = path.join(DIR, "accounts.json");

const guestFile = (slot: string | null) =>
  path.join(DIR, `${(slot || "main").replace(/[^a-z0-9_-]/gi, "")}.json`);

const isShape = (body: unknown) =>
  !!body &&
  typeof body === "object" &&
  typeof (body as { v?: unknown }).v === "number" &&
  Array.isArray((body as { stocks?: unknown }).stocks) &&
  typeof (body as { tick?: unknown }).tick === "number";

async function resolveBadge(req: Request): Promise<string | null> {
  const u = new URL(req.url);
  const as = u.searchParams.get("as");
  if (!as) return null;
  const token = u.searchParams.get("t") ?? "";
  const pool = db();
  if (pool) {
    try {
      const r = await pool.query("SELECT h FROM accounts WHERE uname = $1", [as]);
      const h = r.rows[0]?.h;
      if (h && safeEq(h, token)) return as;
      return null;
    } catch (e) {
      console.error("resolveBadge db → file fallback:", e);
    }
  }
  try {
    const acc = JSON.parse(await readFile(ACCOUNTS, "utf8"))[as];
    return acc?.h === token ? as : null;
  } catch {
    return null;
  }
}

async function fileTarget(req: Request): Promise<string | null> {
  const u = new URL(req.url);
  const as = u.searchParams.get("as");
  if (as) {
    const token = u.searchParams.get("t") ?? "";
    try {
      const acc = JSON.parse(await readFile(ACCOUNTS, "utf8"))[as];
      if (!acc?.h || !safeEq(acc.h, token)) return null;
      return path.join(DIR, "saves", `${as.replace(/[^a-z0-9_-]/gi, "")}.json`);
    } catch {
      return null;
    }
  }
  return guestFile(u.searchParams.get("slot"));
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const as = await resolveBadge(req);
  if (u.searchParams.get("as") && !as) return NextResponse.json({ ok: false }, { status: 401 });
  const pool = db();
  if (pool) {
    try {
      const r = await pool.query("SELECT state FROM saves WHERE uname = $1", [as ?? "main"]);
      if (r.rows[0]) return NextResponse.json(r.rows[0].state);
      return NextResponse.json({ ok: false });
    } catch (e) {
      console.error("save GET db → file fallback:", e);
    }
  }
  const file = await fileTarget(req);
  if (!file) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    return NextResponse.json(JSON.parse(await readFile(file, "utf8")));
  } catch {
    return NextResponse.json({ ok: false });
  }
}

async function put(req: Request) {
  if (!rateLimit(req, "save", 30, 60_000)) return tooMany();
  // cabinet guard: a save is a game state, not a dumping ground
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 600_000) return NextResponse.json({ ok: false, error: "save too big" }, { status: 413 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!isShape(body)) return NextResponse.json({ ok: false }, { status: 400 });

  const u = new URL(req.url);
  const as = await resolveBadge(req);
  if (u.searchParams.get("as") && !as) return NextResponse.json({ ok: false }, { status: 401 });
  const key = as ?? "main";
  const pool = db();
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO saves (uname, state, saved_at) VALUES ($1,$2,$3) ON CONFLICT (uname) DO UPDATE SET state=$2, saved_at=$3",
        [key, JSON.stringify(body), Date.now()]
      );
      // keep the street honest: publish the founder's fundamental fair
      // value (ratchets up only — companies grow, they don't shrink)
      try {
        const f = (body as { factory?: { founded?: boolean; listed?: boolean; sym?: string; cash?: number; history?: number[]; rep?: number } }).factory;
        if (f?.founded && f.listed && f.sym && Array.isArray(f.history)) {
          const last = f.history.slice(-10);
          const avg = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
          const fair = Math.max(1, Math.round(((f.cash ?? 0) + 30 * avg + (f.rep ?? 0)) / 100) * 100) / 100;
          await pool.query(
            "UPDATE biz SET fair = GREATEST(COALESCE(fair, 0), $2) WHERE sym = $1",
            [f.sym, fair]
          );
        }
      } catch (e) {
        console.error("fair update:", e);
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("save PUT db → file fallback:", e);
    }
  }
  const file = await fileTarget(req);
  if (!file) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export { put as POST, put as PUT };
