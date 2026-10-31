"use client";

import { fmtMoney } from "@/lib/game";
import type { Trade } from "@/lib/game";
import styles from "./Ledger.module.css";

/** zigzag top & bottom edges, like a real receipt */
function zigzagClip(): string {
  const N = 30;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= N; i++) {
    top.push(`${((i * 100) / N).toFixed(3)}% ${i % 2 === 0 ? "8px" : "0px"}`);
  }
  for (let i = N; i >= 0; i--) {
    bottom.push(`${((i * 100) / N).toFixed(3)}% ${i % 2 === 0 ? "calc(100% - 8px)" : "100%"}`);
  }
  return `polygon(${[...top, ...bottom].join(",")})`;
}

const CLIP = zigzagClip();

export default function Ledger({ trades }: { trades: Trade[] }) {
  return (
    <div className={styles.receiptWrap}>
      <div className={styles.receipt} style={{ clipPath: CLIP }}>
        <div className={styles.rHead}>✶ PAPER TRADER LEDGER ✶</div>
        <div className={styles.rSub}>fills at bid/ask, exactly as executed</div>

        {trades.length === 0 ? (
          <div className={styles.empty}>no trades yet —<br />the pen is waiting.</div>
        ) : (
          trades.slice(0, 9).map((t) => (
            <div key={t.id} className={styles.line}>
              <span className={styles.when}>
                D{t.day} {t.time}
              </span>
              <span className={styles.what}>
                {t.side === "BUY" ? "BOT" : t.side === "SELL" ? "SOLD" : t.side === "SHORT" ? "SHRT" : "COVR"}{" "}
                <b>{t.qty}×{t.sym}</b>
                <span className={styles.px}>@{t.price.toFixed(2)}</span>
              </span>
              <span className={t.side === "SELL" || t.side === "SHORT" ? styles.pos : styles.neg}>
                {t.side === "SELL" || t.side === "SHORT" ? "+" : "−"}
                {fmtMoney(t.total)}
              </span>
            </div>
          ))
        )}
        {trades.length > 9 && <div className={styles.more}>+ {trades.length - 9} older entries…</div>}

        <div className={styles.rFoot}>— thank you for crumpling with us —</div>
      </div>
    </div>
  );
}
