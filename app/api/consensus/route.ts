import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * The street's consensus: the median price other worlds are currently
 * trading `sym` at. Used on return-from-away so a founder's (or any
 * holder's) tape catches up to what the shared market did while they
 * were offline. Needs the shared cabinet — no consensus on file mode.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const sym = (u.searchParams.get("sym") ?? "").toUpperCase();
  const except = (u.searchParams.get("except") ?? "").toLowerCase();
  if (!/^[A-Z0-9]{3,4}$/.test(sym))
    return NextResponse.json({ ok: false, error: "bad sym" }, { status: 400 });

  const pool = db();
  if (!pool) return NextResponse.json({ ok: true, n: 0 });
  try {
    const r = await pool.query(
      `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY (e->>'price')::numeric) AS px, count(*)::int AS n
       FROM saves, jsonb_array_elements(state->'stocks') AS e
       WHERE e->>'sym' = $1 AND uname <> $2 AND saved_at > $3`,
      [sym, except, Date.now() - 7 * 24 * 3600_000]
    );
    const px = Number(r.rows[0]?.px ?? 0);
    const n = Number(r.rows[0]?.n ?? 0);
    return NextResponse.json({ ok: true, n, px: Math.round(px * 100) / 100 });
  } catch (e) {
    console.error("consensus db:", e);
    return NextResponse.json({ ok: true, n: 0 });
  }
}
