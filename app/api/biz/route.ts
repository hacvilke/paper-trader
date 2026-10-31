import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { rateLimit, tooMany } from "@/lib/ratelimit";

/**
 * Business registry — company tickers are globally unique across all
 * traders. POST when founding a company; GET ?sym=XXXX to check.
 */
const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "biz.json");

type Biz = Record<string, { user: string; name: string }>;

async function fileBiz(): Promise<Biz> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const sym = (new URL(req.url).searchParams.get("sym") ?? "").toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(sym))
    return NextResponse.json({ ok: false, error: "bad sym" }, { status: 400 });
  const pool = db();
  if (pool) {
    try {
      const r = await pool.query("SELECT sym FROM biz WHERE sym = $1", [sym]);
      return NextResponse.json({ ok: true, taken: r.rows.length > 0 });
    } catch (e) {
      console.error("biz GET db → file fallback:", e);
    }
  }
  return NextResponse.json({ ok: true, taken: sym in (await fileBiz()) });
}

export async function POST(req: Request) {
  if (!rateLimit(req, "biz", 5, 60_000)) return tooMany();
  try {
    const body = await req.json();
    const sym = String(body.sym ?? "").toUpperCase();
    const user = String(body.user ?? "").toLowerCase();
    const name = String(body.name ?? "").trim().slice(0, 40);
    if (!/^[A-Z0-9]{3,4}$/.test(sym) || !/^[a-z0-9_]{3,14}$/.test(user) || name.length < 3) {
      return NextResponse.json({ ok: false, error: "bad founding papers" }, { status: 400 });
    }
    const pool = db();
    if (pool) {
      try {
        await pool.query("INSERT INTO biz (sym, uname, name, created) VALUES ($1,$2,$3,$4)", [
          sym,
          user,
          name,
          Date.now(),
        ]);
        return NextResponse.json({ ok: true });
      } catch (e) {
        if ((e as { code?: string }).code === "23505")
          return NextResponse.json({ ok: false, error: `ticker ${sym} is already listed` }, { status: 409 });
        console.error("biz POST db → file fallback:", e);
      }
    }
    const biz = await fileBiz();
    if (sym in biz)
      return NextResponse.json({ ok: false, error: `ticker ${sym} is already listed` }, { status: 409 });
    biz[sym] = { user, name };
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(biz, null, 2));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("biz POST:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
