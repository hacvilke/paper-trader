import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

/**
 * Live leaderboard: net worth of every badged trader from the shared
 * cabinet (Supabase when configured), best first.
 */
const DIR = path.join(process.cwd(), "data", "saves");

type Row = { user: string; worth: number; day: number; updated: number };

function worthOf(s0: unknown): number {
  const s = (s0 ?? {}) as Record<string, any>;
  const px: Record<string, number> = {};
  for (const st of (s.stocks as Array<{ sym: string; price: number }>) ?? [])
    px[st.sym] = st.price;
  let worth = s.cash ?? 0;
  for (const [sym, h] of Object.entries<{ qty: number }>((s.holdings as never) ?? {})) {
    if (px[sym] !== undefined) worth += h.qty * px[sym];
  }
  for (const [sym, sh] of Object.entries<{ qty: number }>((s.shorts as never) ?? {})) {
    if (px[sym] !== undefined) worth -= sh.qty * px[sym];
  }
  return Math.round((worth - (s.debt ?? 0)) * 100) / 100;
}

export async function GET() {
  const pool = db();
  if (pool) {
    try {
      const r = await pool.query("SELECT uname, state, saved_at FROM saves");
      const rows: Row[] = r.rows
        .filter((x) => x.uname !== "main") // guests stay off the board
        .map((x) => ({
          user: x.uname,
          worth: worthOf(x.state),
          day: Math.floor(((x.state as { tick?: number }).tick ?? 0) / 26) + 1,
          updated: Number(x.saved_at) || 0,
        }));
      rows.sort((a, b) => b.worth - a.worth);
      return NextResponse.json({ ok: true, rows: rows.slice(0, 12) });
    } catch (e) {
      console.error("leaderboard db:", e);
      return NextResponse.json({ ok: true, rows: [] });
    }
  }
  const rows: Row[] = [];
  try {
    const files = await readdir(DIR);
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      try {
        const s = JSON.parse(await readFile(path.join(DIR, f), "utf8"));
        rows.push({
          user: f.replace(/\.json$/, ""),
          worth: worthOf(s),
          day: Math.floor((s.tick ?? 0) / 26) + 1,
          updated: s.savedAt ?? 0,
        });
      } catch {
        /* skip unreadable */
      }
    }
  } catch {
    /* no saves yet */
  }
  rows.sort((a, b) => b.worth - a.worth);
  return NextResponse.json({ ok: true, rows: rows.slice(0, 12) });
}
