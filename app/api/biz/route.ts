import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { rateLimit, tooMany } from "@/lib/ratelimit";
import { safeEq } from "@/lib/sec";

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

/** DELETE ?sym=&user=&t= — a trader tearing up their papers releases the ticker. */
export async function DELETE(req: Request) {
  const u = new URL(req.url);
  const sym = (u.searchParams.get("sym") ?? "").toUpperCase();
  const user = (u.searchParams.get("user") ?? "").toLowerCase();
  const token = u.searchParams.get("t") ?? "";
  if (!/^[A-Z0-9]{3,4}$/.test(sym) || !/^[a-z0-9_]{3,14}$/.test(user))
    return NextResponse.json({ ok: false }, { status: 400 });
  const pool = db();
  if (pool) {
    try {
      const r = await pool.query("SELECT h FROM accounts WHERE uname = $1", [user]);
      const h = r.rows[0]?.h;
      if (!h || !safeEq(h, token)) return NextResponse.json({ ok: false }, { status: 401 });
      await pool.query("DELETE FROM biz WHERE sym = $1 AND uname = $2", [sym, user]);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("biz DELETE db:", e);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }
  try {
    const accs = JSON.parse(await readFile(path.join(process.cwd(), "data", "accounts.json"), "utf8"));
    if (accs[user]?.h !== token) return NextResponse.json({ ok: false }, { status: 401 });
    const biz = await fileBiz();
    if (biz[sym]?.user === user) {
      delete biz[sym];
      await mkdir(DIR, { recursive: true });
      await writeFile(FILE, JSON.stringify(biz, null, 2));
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
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
    const px = Number(body.px ?? 0);
    const pool = db();
    if (pool) {
      try {
        await pool.query("INSERT INTO biz (sym, uname, name, created) VALUES ($1,$2,$3,$4)", [
          sym,
          user,
          name,
          Date.now(),
        ]);
        if (px > 0)
          await pool.query("UPDATE biz SET listed = true, px = $2, listed_at = $3 WHERE sym = $1", [
            sym,
            px,
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
    biz[sym] = { user, name, ...(px > 0 ? { listed: true, px, at: Date.now() } : {}) } as never;
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(biz, null, 2));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("biz POST:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
