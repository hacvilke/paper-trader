/**
 * Tiny in-memory rate limiter — per-instance token buckets.
 * Right-sized for one Render instance; keeps guests & bots from
 * hammering the shared cabinet.
 */
const buckets = new Map<string, { n: number; ts: number }>();

export function rateLimit(req: Request, key: string, limit: number, windowMs: number): boolean {
  const ip =
    (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim().slice(0, 40) || "local";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || now - b.ts > windowMs) {
    buckets.set(k, { n: 1, ts: now });
    // opportunistic sweep
    if (buckets.size > 5000) {
      for (const [kk, bb] of buckets) if (now - bb.ts > windowMs) buckets.delete(kk);
    }
    return true;
  }
  if (b.n >= limit) return false;
  b.n += 1;
  return true;
}

export const tooMany = () =>
  new Response(JSON.stringify({ ok: false, error: "slow down — the ink needs a second" }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
