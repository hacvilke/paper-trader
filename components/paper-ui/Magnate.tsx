"use client";

import { useEffect, useMemo, useState } from "react";
import type { Stock } from "@/lib/game";
import { fmtMoney } from "@/lib/game";
import { useChecks } from "@/lib/checks";
import styles from "./Magnate.module.css";

/**
 * The Magnate — the quiet owner of the best stock on the floor.
 * A paper stickman (hand-rigged SVG joints, pencil strokes) who
 * walks in from the right at big net-worth marks, check in hand.
 * He insists you sign for it. Unsigned = no money. That's the plot.
 */
export default function Magnate({
  bonus,
  day,
  stocks,
  onReceive,
  onDone,
}: {
  bonus: number;
  day: number;
  stocks: Stock[];
  onReceive: (amt: number) => void;
  onDone: () => void;
}) {
  const showCheck = useChecks();
  const [phase, setPhase] = useState<"in" | "hold" | "bye">("in");

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("hold"), 1250);
    return () => window.clearTimeout(t);
  }, []);

  // his credentials: the best performer on the board right now
  const best = useMemo(() => {
    let b: { sym: string; pct: number } | null = null;
    for (const s of stocks) {
      if (s.doom !== undefined || s.hist.length < 9) continue;
      const base = s.hist[s.hist.length - 9];
      const pct = (s.price - base) / base;
      if (!b || pct > b.pct) b = { sym: s.sym, pct };
    }
    return b ?? { sym: "TAPE", pct: 0 };
  }, [stocks]);

  const handIt = () => {
    if (phase !== "hold") return;
    showCheck({
      kind: "reward",
      amount: bonus,
      day,
      payee: "you, baron",
      memo: `re: ${best.sym} ${(best.pct * 100).toFixed(0)}% and climbing — back the best stock. — The Magnate`,
      onSign: () => {
        onReceive(bonus);
        setPhase("bye");
        window.setTimeout(onDone, 1750);
      },
    });
  };

  return (
    <div className={`${styles.wrap} ${styles[phase]}`} aria-hidden={phase !== "hold"}>
      <div className={styles.tag}>
        <span className={styles.tagTxt}>
          the Magnate · tap to take <b>{fmtMoney(bonus)}</b>
        </span>
        <button className={styles.later} onClick={onDone}>
          later
        </button>
      </div>
      <button className={styles.figure} onClick={handIt} aria-label="receive the Magnate's check">
        <svg viewBox="0 0 132 172" className={styles.svg}>
          <g className={styles.dude}>
            {/* head */}
            <circle cx="64" cy="24" r="11" />
            <circle cx="61" cy="22" r="1.1" className={styles.dot} />
            <circle cx="68" cy="22" r="1.1" className={styles.dot} />
            {/* body */}
            <line x1="64" y1="35" x2="64" y2="94" />
            {/* left arm */}
            <line x1="64" y1="50" x2="42" y2="72" />
            {/* right arm + check (the offer) */}
            <g className={styles.offer}>
              <line x1="64" y1="50" x2="92" y2="60" />
              <g className={styles.check}>
                <rect x="84" y="30" width="46" height="26" rx="2" />
                <line x1="88" y1="37" x2="112" y2="37" />
                <line x1="88" y1="42" x2="104" y2="42" />
                <text x="120" y="46" className={styles.amt}>$</text>
              </g>
            </g>
            {/* legs */}
            <g className={styles.legA}>
              <line x1="64" y1="94" x2="48" y2="142" />
            </g>
            <g className={styles.legB}>
              <line x1="64" y1="94" x2="80" y2="142" />
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}
