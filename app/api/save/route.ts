import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * The file cabinet — one JSON slot per save file, on disk in the repo.
 *
 *  GET  /api/save?slot=main            → guest cabinet (legacy)
 *  GET  /api/save?as=user&t=<token>    → per-badge cabinet (auth)
 *  PUT  same params, body = game state → store
 */
const DIR = path.join(process.cwd(), "data");
const ACCOUNTS = path.join(DIR, "accounts.json");

const guestFile = (slot: string | null) =>
  path.join(DIR, `${(slot || "main").replace(/[^a-z0-9_-]/gi, "")}.json`);

async function badgeFile(user: string, token: string) {
  try {
    const acc = JSON.parse(await readFile(ACCOUNTS, "utf8"))[user];
    if (!acc || acc.h !== token) return null;
    return path.join(DIR, "saves", `${user.replace(/[^a-z0-9_-]/gi, "")}.json`);
  } catch {
    return null;
  }
}

async function resolveTarget(req: Request): Promise<string | null> {
  const u = new URL(req.url);
  const as = u.searchParams.get("as");
  if (as) return badgeFile(as, u.searchParams.get("t") ?? "");
  return guestFile(u.searchParams.get("slot"));
}

export async function GET(req: Request) {
  const file = await resolveTarget(req);
  if (!file) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    return NextResponse.json(JSON.parse(await readFile(file, "utf8")));
  } catch {
    return NextResponse.json({ ok: false });
  }
}

async function put(req: Request) {
  const file = await resolveTarget(req);
  if (!file) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const body = await req.json();
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as { v?: unknown }).v !== "number" ||
      !Array.isArray((body as { stocks?: unknown }).stocks) ||
      typeof (body as { tick?: unknown }).tick !== "number"
    ) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export { put as POST, put as PUT };
