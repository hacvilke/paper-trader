import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

/**
 * The listing window: every player-founded company that has gone
 * public, newest first. Each trader's world reads this on the day
 * roll and lists the new names on their own tape — one shared market.
 */
export async function GET(req: Request) {
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const pool = db();
  if (pool) {
    try {
      const r = await pool.query(
        "SELECT sym, uname, name, px, listed_at FROM biz WHERE listed = true AND listed_at > $1 ORDER BY listed_at ASC LIMIT 20",
        [after]
      );
      return NextResponse.json({
        ok: true,
        rows: r.rows.map((x) => ({ sym: x.sym, uname: x.uname, name: x.name, px: Number(x.px), at: Number(x.listed_at) })),
      });
    } catch (e) {
      console.error("ipos db:", e);
    }
  }
  try {
    const biz = JSON.parse(await readFile(path.join(process.cwd(), "data", "biz.json"), "utf8"));
    const rows = Object.entries<{ user: string; name: string; listed?: boolean; px?: number; at?: number }>(biz)
      .filter(([, v]) => v.listed && (v.at ?? 0) > after && typeof v.px === "number")
      .map(([sym, v]) => ({ sym, uname: v.user, name: v.name, px: v.px as number, at: v.at as number }))
      .slice(0, 20);
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: true, rows: [] });
  }
}
