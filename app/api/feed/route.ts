import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

/** The wire — shared ticker of deeds. Supabase-backed, file fallback. */
const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "feed.json");

type Row = { user: string; text: string; ts: number };

async function fileRead(): Promise<Row[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function GET() {
  const pool = db();
  if (pool) {
    try {
      const r = await pool.query("SELECT uname, txt, ts FROM feed ORDER BY id DESC LIMIT 12");
      return NextResponse.json(
        { ok: true, rows: r.rows.map((x) => ({ user: x.uname, text: x.txt, ts: Number(x.ts) })) },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (e) {
      console.error("feed GET db:", e);
      return NextResponse.json({ ok: true, rows: [] });
    }
  }
  const rows = await fileRead();
  return NextResponse.json(
    { ok: true, rows: rows.slice(-12).reverse() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = String(body.user ?? "");
    const text = String(body.text ?? "").trim().slice(0, 90);
    if (!/^[a-z0-9_]{3,14}$/.test(user) || text.length < 1) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const pool = db();
    if (pool) {
      await pool.query("INSERT INTO feed (uname, txt, ts) VALUES ($1,$2,$3)", [
        user,
        text,
        Date.now(),
      ]);
      return NextResponse.json({ ok: true });
    }
    const rows = await fileRead();
    rows.push({ user, text, ts: Date.now() });
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(rows.slice(-12)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
