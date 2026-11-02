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

function worthOf(s0: unknown, street: Record<string, number> = {}): number {
  const s = (s0 ?? {}) as Record<string, any>;
  const px: Record<string, number> = {};
  for (const st of (s.stocks as Array<{ sym: string; price: number }>) ?? [])
    px[st.sym] = st.price;
  // player-listed companies are marked to the STREET (median across all
  // worlds) — a founder or holder's board worth moves while they sleep
  for (const [sym, sp] of Object.entries(street)) px[sym] = sp;
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
      // ---- street prices for player-listed companies ----
      const street: Record<string, number> = {};
      try {
        const listed = await pool.query("SELECT sym FROM biz WHERE listed = true");
        const fresh = r.rows.filter(
          (x) => Number(x.saved_at) > Date.now() - 7 * 24 * 3600_000
        );
        for (const { sym } of listed.rows) {
          const prices: number[] = [];
          for (const x of fresh) {
            const st = (x.state?.stocks as Array<{ sym: string; price: number }> | undefined)?.find(
              (s) => s.sym === sym
            );
            if (st && typeof st.price === "number" && st.price > 0) prices.push(st.price);
          }
          if (prices.length >= 2) {
            prices.sort((a, b) => a - b);
            const mid = Math.floor(prices.length / 2);
            street[sym] =
              prices.length % 2 ? prices[mid] : Math.round(((prices[mid - 1] + prices[mid]) / 2) * 100) / 100;
          }
        }
      } catch (e) {
        console.error("leaderboard street:", e);
      }
      const rows: Row[] = r.rows
        .filter((x) => x.uname !== "main") // guests stay off the board
        .map((x) => ({
          user: x.uname,
          worth: worthOf(x.state, street),
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
