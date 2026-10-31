import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { createHash, randomBytes } from "crypto";
import path from "path";

/**
 * Press-badge auth: a trader name + a 4-6 digit PIN.
 * Each badge gets its own save file in data/saves/<user>.json and a
 * row on the leaderboard. Lighter than passwords — it's a paper game.
 */
const DIR = path.join(process.cwd(), "data");
const ACCOUNTS = path.join(DIR, "accounts.json");

type Accounts = Record<string, { salt: string; h: string; created: number }>;

async function loadAccounts(): Promise<Accounts> {
  try {
    return JSON.parse(await readFile(ACCOUNTS, "utf8"));
  } catch {
    return {};
  }
}

const hashOf = (user: string, salt: string, pin: string) =>
  createHash("sha256").update(`${salt}|${user}|${pin}`).digest("hex");

export async function POST(req: Request) {
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

  const accounts = await loadAccounts();
  await mkdir(DIR, { recursive: true });

  if (body.mode === "register") {
    if (accounts[user])
      return NextResponse.json({ ok: false, error: "that badge name is taken" }, { status: 409 });
    const salt = randomBytes(8).toString("hex");
    const h = hashOf(user, salt, pin);
    accounts[user] = { salt, h, created: Date.now() };
    await writeFile(ACCOUNTS, JSON.stringify(accounts, null, 2));
    return NextResponse.json({ ok: true, user, token: h });
  }

  if (body.mode === "login") {
    const acc = accounts[user];
    if (!acc || acc.h !== hashOf(user, acc.salt, pin))
      return NextResponse.json({ ok: false, error: "no badge matches that name + PIN" }, { status: 401 });
    return NextResponse.json({ ok: true, user, token: acc.h });
  }

  return NextResponse.json({ ok: false, error: "unknown mode" }, { status: 400 });
}
