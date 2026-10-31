import { fmtMoney } from "@/lib/game";
import styles from "./TickerTape.module.css";

export type TapeItem = { sym: string; price: number; pct: number };

/** TickerTape — an actual strip of paper tape, scrolling stock quotes. */
export default function TickerTape({ items }: { items: TapeItem[] }) {
  const Row = ({ dup }: { dup: string }) => (
    <div className={styles.row} aria-hidden={dup === "b"}>
      {items.map((it) => {
        const up = it.pct >= 0;
        return (
          <span key={it.sym + dup} className={styles.item}>
            <b className={styles.sym}>{it.sym}</b>
            <span className={styles.money}>{fmtMoney(it.price)}</span>
            <span className={up ? styles.up : styles.down}>
              {up ? "▲" : "▼"} {Math.abs(it.pct).toFixed(1)}%
            </span>
            <span className={styles.sep}>✦</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <Row dup="a" />
        <Row dup="b" />
      </div>
    </div>
  );
}
