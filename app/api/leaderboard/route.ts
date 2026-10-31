import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import path from "path";

/**
 * Leaderboard: the net worth of every badge with a saved game,
 * best first. Computed straight from the cabinet — nothing to fake
 * except your trading skills.
 */
const DIR = path.join(process.cwd(), "data", "saves");

type Row = { user: string; worth: number; day: number; updated: number };

export async function GET() {
  let rows: Row[] = [];
  try {
    const files = await readdir(DIR);
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      try {
        const s = JSON.parse(await readFile(path.join(DIR, f), "utf8"));
        // price map first — one price per symbol, no double counting
        const px: Record<string, number> = {};
        for (const st of s.stocks ?? []) px[st.sym] = st.price;
        let worth = s.cash ?? 0;
        for (const [sym, h] of Object.entries< { qty: number } >(s.holdings ?? {})) {
          if (px[sym] !== undefined) worth += h.qty * px[sym];
        }
        for (const [sym, sh] of Object.entries< { qty: number } >(s.shorts ?? {})) {
          if (px[sym] !== undefined) worth -= sh.qty * px[sym];
        }
        worth -= s.debt ?? 0;
        rows.push({
          user: f.replace(/\.json$/, ""),
          worth: Math.round(worth * 100) / 100,
          day: Math.floor((s.tick ?? 0) / 26) + 1,
          updated: s.savedAt ?? 0,
        });
      } catch {
        /* skip unreadable save */
      }
    }
  } catch {
    /* no saves yet */
  }
  rows.sort((a, b) => b.worth - a.worth);
  return NextResponse.json({ ok: true, rows: rows.slice(0, 12) });
}
