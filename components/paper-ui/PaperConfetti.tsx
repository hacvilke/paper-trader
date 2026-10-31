"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PaperConfetti.module.css";

type Piece = {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
  delay: number;
  color: string;
  w: number;
  h: number;
};

const COLORS = ["#ffee9c", "#ffd6e6", "#d3f4e0", "#d7e9ff", "#fffdf4"];

/** PaperConfetti — scraps of colored paper tossed in the air. Bump `burst` to fire. */
export default function PaperConfetti({
  burst,
  x = "58%",
  y = "46%",
}: {
  burst: number;
  x?: string;
  y?: string;
}) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (burst <= 0) return;
    const list: Piece[] = Array.from({ length: 26 }, (_, i) => ({
      id: burst * 1000 + i,
      dx: Math.random() * 380 - 190,
      dy: 240 + Math.random() * 260,
      rot: Math.random() * 900 - 450,
      dur: 0.9 + Math.random() * 0.7,
      delay: Math.random() * 0.15,
      color: COLORS[i % COLORS.length],
      w: 8 + Math.random() * 7,
      h: 11 + Math.random() * 8,
    }));
    setPieces(list);
    const t = window.setTimeout(() => setPieces([]), 1900);
    return () => window.clearTimeout(t);
  }, [burst]);

  return (
    <div className={styles.host} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={styles.piece}
          style={
            {
              left: x,
              top: y,
              width: p.w,
              height: p.h,
              background: p.color,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
