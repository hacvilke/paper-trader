import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { createHash, randomBytes } from "crypto";
import path from "path";
import { db } from "@/lib/db";
import { rateLimit, tooMany } from "@/lib/ratelimit";

/**
 * Press-badge auth: trader name + 4-6 digit PIN, hashed (sha256+salt).
 * Backed by Supabase (DATABASE_URL) or a local JSON fallback.
 */
const DIR = path.join(process.cwd(), "data");
const ACCOUNTS = path.join(DIR, "accounts.json");

type Accounts = Record<string, { salt: string; h: string; created: number }>;

async function fileAccounts(): Promise<Accounts> {
  try {
    return JSON.parse(await readFile(ACCOUNTS, "utf8"));
  } catch {
    return {};
  }
}

const hashOf = (user: string, salt: string, pin: string) =>
  createHash("sha256").update(`${salt}|${user}|${pin}`).digest("hex");

export async function POST(req: Request) {
  if (!rateLimit(req, "auth", 10, 60_000)) return tooMany();
  let body: { mode?: string; user?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const user = (body.user ?? "").trim().toLowerCase();
  const pin = (body.pin ?? "").trim();
  if (!/^[a-z0-9_]{3,14}$/.test(user))
    return NextResponse.json({ ok: false, error: "name: 3-14 letters/numbers/_" }, { status: 400 });
  if (!/^\d{4,6}$/.test(pin))
    return NextResponse.json({ ok: false, error: "PIN: 4-6 digits" }, { status: 400 });

  const pool = db();
  const now = Date.now();

  if (body.mode === "register") {
    if (pool) {
      try {
        const salt = randomBytes(8).toString("hex");
        const h = hashOf(user, salt, pin);
        await pool.query("INSERT INTO accounts (uname, salt, h, created) VALUES ($1,$2,$3,$4)", [
          user,
          salt,
          h,
          now,
        ]);
        return NextResponse.json({ ok: true, user, token: h });
      } catch (e) {
        if ((e as { code?: string }).code === "23505")
          return NextResponse.json({ ok: false, error: "that badge name is taken" }, { status: 409 });
        // DB unreachable → keep the game playable on the on-disk cabinet
        console.error("register db → file cabinet fallback:", e);
      }
    }
    const accounts = await fileAccounts();
    await mkdir(DIR, { recursive: true });
    if (accounts[user])
      return NextResponse.json({ ok: false, error: "that badge name is taken" }, { status: 409 });
    const salt = randomBytes(8).toString("hex");
    const h = hashOf(user, salt, pin);
    accounts[user] = { salt, h, created: now };
    await writeFile(ACCOUNTS, JSON.stringify(accounts, null, 2));
    return NextResponse.json({ ok: true, user, token: h });
  }

  if (body.mode === "login") {
    if (pool) {
      try {
        const r = await pool.query("SELECT salt, h FROM accounts WHERE uname = $1", [user]);
        const acc = r.rows[0];
        if (!acc || acc.h !== hashOf(user, acc.salt, pin))
          return NextResponse.json({ ok: false, error: "no badge matches that name + PIN" }, { status: 401 });
        return NextResponse.json({ ok: true, user, token: acc.h });
      } catch (e) {
        console.error("login db → file cabinet fallback:", e);
      }
    }
    const acc = (await fileAccounts())[user];
    if (!acc || acc.h !== hashOf(user, acc.salt, pin))
      return NextResponse.json({ ok: false, error: "no badge matches that name + PIN" }, { status: 401 });
    return NextResponse.json({ ok: true, user, token: acc.h });
  }

  return NextResponse.json({ ok: false, error: "unknown mode" }, { status: 400 });
}
