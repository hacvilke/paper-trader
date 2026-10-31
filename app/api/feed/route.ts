import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * The wire — a shared ticker of deeds. When any badged trader makes a
 * move, it lands here for everyone. Last 12, freshest first.
 */
const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "feed.json");

type Row = { user: string; text: string; ts: number };

async function read(): Promise<Row[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function GET() {
  const rows = await read();
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
    const rows = await read();
    rows.push({ user, text, ts: Date.now() });
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(rows.slice(-12)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
