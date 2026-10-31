import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

/**
 * Ownership lookup for a listed company: who holds how many shares,
 * straight from the shared cabinet. Powers the simple "you own X%"
 * line on the factory card — no boardroom bureaucracy needed.
 */
const DIR = path.join(process.cwd(), "data");

export async function GET(req: Request) {
  const sym = (new URL(req.url).searchParams.get("sym") ?? "").toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(sym))
    return NextResponse.json({ ok: false, error: "bad sym" }, { status: 400 });

  type Row = { user: string; qty: number };
  let rows: Row[] = [];

  const pool = db();
  if (pool) {
    try {
      const r = await pool.query(
        "SELECT uname, COALESCE(state->'holdings'->>$1, '0') AS qty FROM saves",
        [sym]
      );
      rows = r.rows
        .map((x) => ({ user: String(x.uname), qty: Number(x.qty) || 0 }))
        .filter((x) => x.qty > 0 && x.user !== "main");
    } catch {
      rows = [];
    }
  } else {
    try {
      const files = await (await import("fs/promises")).readdir(path.join(DIR, "saves"));
      for (const f of files.filter((x) => x.endsWith(".json"))) {
        try {
          const s = JSON.parse(await readFile(path.join(DIR, "saves", f), "utf8"));
          const qty = s.holdings?.[sym]?.qty ?? 0;
          if (qty > 0) rows.push({ user: f.replace(/\.json$/, ""), qty });
        } catch {
          /* skip */
        }
      }
    } catch {
      rows = [];
    }
  }

  const total = rows.reduce((a, r) => a + r.qty, 0);
  return NextResponse.json({ ok: true, rows, total });
}
