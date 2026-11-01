import { timingSafeEqual } from "crypto";

/** Compare two secret strings without leaking length/content by timing. */
export function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}
