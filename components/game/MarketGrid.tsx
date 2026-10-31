"use client";

import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperChart from "@/components/paper-ui/PaperChart";
import ScribblePrice from "@/components/paper-ui/ScribblePrice";
import Stamp from "@/components/paper-ui/Stamp";
import Hint from "@/components/paper-ui/Hint";
import { ArrowDown, ArrowUp } from "@/components/paper-ui/doodles";
import { fmtK, volWord } from "@/lib/game";
import type { Stock } from "@/lib/game";
import styles from "./MarketGrid.module.css";

const ROTS = [-1.3, 1.1, -0.7, 1.5, -1, 0.8, -1.4, 1.2];

export default function MarketGrid({
  stocks,
  selected,
  onSelect,
}: {
  stocks: Stock[];
  selected: string;
  onSelect: (sym: string) => void;
}) {
  return (
    <div className={styles.grid}>
      {stocks.map((s, i) => {
        const pct = ((s.price - s.dayOpen) / s.dayOpen) * 100;
        const up = pct >= 0;
        const isSel = s.sym === selected;
        const halted = s.haltSteps > 0;
        return (
          <PaperSheet
            key={s.sym}
            rotation={isSel ? 0 : ROTS[i % ROTS.length]}
            tape={i % 2 ? "pin" : "corners"}
            hover
            drop={i * 70}
            className={`${styles.card} ${isSel ? styles.selCard : ""}`}
          >
            <button
              className={`${styles.hit} ${halted ? styles.dimmed : ""}`}
              onClick={() => onSelect(s.sym)}
              aria-label={`Open ${s.name}`}
            >
              <span className={styles.symWrap}>
                <span className={styles.sym}>{s.sym}</span>
              </span>
              <span className={styles.name}>{s.name}</span>
              <span className={styles.priceRow}>
                <ScribblePrice value={s.price} className={styles.price} />
                <span className={`${styles.pct} ${up ? styles.up : styles.down}`}>
                  {up ? <ArrowUp /> : <ArrowDown />} {Math.abs(pct).toFixed(1)}%
                </span>
              </span>
              <PaperChart data={s.hist} spark height={44} />
              <span className={styles.meta}>
                vol {fmtK(s.sessionVol)} ·{" "}
                <Hint text="How much the price is swinging right now. 'wild' = big moves both ways — bigger risk, bigger chance.">
                  {volWord(s)}
                </Hint>
              </span>
            </button>
            {halted && (
              <div className={styles.haltOverlay}>
                <Stamp text="HALTED" tone="red" />
              </div>
            )}
          </PaperSheet>
        );
      })}
    </div>
  );
}
