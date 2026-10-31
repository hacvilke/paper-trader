"use client";

import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperChart from "@/components/paper-ui/PaperChart";
import Hint from "@/components/paper-ui/Hint";
import { fmtMoney } from "@/lib/game";
import type { GameState } from "@/lib/game";
import styles from "./Portfolio.module.css";

export default function Portfolio({
  state,
  onSelect,
}: {
  state: GameState;
  onSelect: (sym: string) => void;
}) {
  const rows = Object.entries(state.holdings)
    .map(([sym, h]) => {
      const st = state.stocks.find((x) => x.sym === sym)!;
      return { sym, qty: h.qty, avg: h.avg, price: st.price, value: h.qty * st.price, pl: (st.price - h.avg) * h.qty };
    })
    .sort((a, b) => b.value - a.value);

  const totalValue = rows.reduce((a, r) => a + r.value, 0);
  const totalPL = rows.reduce((a, r) => a + r.pl, 0);

  // you vs the index, since you started
  const nw = state.cash + totalValue;
  const nw0 = state.netWorthHist[0] || nw;
  const idx0 = state.indexHist[0] || 1;
  const youPct = (nw / nw0 - 1) * 100;
  const idxPct = (state.indexHist[state.indexHist.length - 1] / idx0 - 1) * 100;
  const edge = youPct - idxPct;

  return (
    <PaperSheet tape="pin" rotation={0.5} lines="grid" className={styles.sheet}>
      <div className={styles.titleRow}>
        <h3>Portfolio</h3>
        <span className={styles.worth}>
          net worth <b>{fmtMoney(nw)}</b>
        </span>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          Nothing yet. Go buy some paper. ✎
          <span className={styles.emptyTip}>
            <Hint text="Beginner move: split your cash across 3–4 companies instead of one. When one tank, the others soften the blow. That's diversification.">
              psst — first timer?
            </Hint>
          </span>
        </div>
      ) : (
        <table className={styles.tbl}>
          <thead>
            <tr>
              <th className={styles.th}>sym</th>
              <th className={`${styles.th} ${styles.num}`}>sh</th>
              <th className={`${styles.th} ${styles.num}`}>avg</th>
              <th className={`${styles.th} ${styles.num}`}>last</th>
              <th className={`${styles.th} ${styles.num}`}>value</th>
              <th className={`${styles.th} ${styles.num}`}>P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.sym}
                className={styles.row}
                onClick={() => onSelect(r.sym)}
                title={`open ${r.sym} on the trading desk`}
              >
                <td className={`${styles.td} ${styles.symTd}`}>{r.sym}</td>
                <td className={`${styles.td} ${styles.num}`}>{r.qty}</td>
                <td className={`${styles.td} ${styles.num}`}>{r.avg.toFixed(2)}</td>
                <td className={`${styles.td} ${styles.num}`}>{r.price.toFixed(2)}</td>
                <td className={`${styles.td} ${styles.num}`}>{fmtMoney(r.value)}</td>
                <td className={`${styles.td} ${styles.num} ${r.pl >= 0 ? styles.pos : styles.neg}`}>
                  {fmtMoney(r.pl)}
                </td>
              </tr>
            ))}
            <tr className={styles.footRow}>
              <td className={styles.td} colSpan={4}>
                total
              </td>
              <td className={`${styles.td} ${styles.num}`}>
                <b>{fmtMoney(totalValue)}</b>
              </td>
              <td className={`${styles.td} ${styles.num} ${totalPL >= 0 ? styles.pos : styles.neg}`}>
                <b>{fmtMoney(totalPL)}</b>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {Object.keys(state.shorts).length > 0 && (
        <>
          <div className={styles.sparkLbl} style={{ marginTop: 14 }}>
            <Hint text="Short positions: shares you borrowed and sold, and must buy back. P/L is inverted — you profit when the price drops.">
              shorts — paper you owe
            </Hint>
          </div>
          <table className={styles.tbl}>
            <tbody>
              {Object.entries(state.shorts).map(([sym, sh]) => {
                const st = state.stocks.find((x) => x.sym === sym)!;
                const pl = (sh.avg - st.price) * sh.qty;
                return (
                  <tr key={sym} className={styles.row} onClick={() => onSelect(sym)} title={`open ${sym} on the trading desk`}>
                    <td className={`${styles.td} ${styles.shortTd}`}>↯ {sym}</td>
                    <td className={`${styles.td} ${styles.num}`}>owe {sh.qty}</td>
                    <td className={`${styles.td} ${styles.num}`}>@{sh.avg.toFixed(2)}</td>
                    <td className={`${styles.td} ${styles.num}`}>now {st.price.toFixed(2)}</td>
                    <td className={`${styles.td} ${styles.num} ${pl >= 0 ? styles.pos : styles.neg}`}>
                      {fmtMoney(pl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <div className={styles.sparkLbl}>
        <Hint text="Solid ink = your net worth. Dashed pencil = the PAPER 500 (all 8 stocks, equally weighted). Above the pencil line means your picks beat simply holding the market.">
          you vs the paper 500
        </Hint>
      </div>
      <PaperChart data={state.netWorthHist} overlay={state.indexHist} spark height={56} />
      <div className={styles.legend}>
        <span className={styles.you}>— you</span>
        <span className={styles.idx}>-- PAPER 500</span>
        <span className={`${styles.edge} ${edge >= 0 ? styles.pos : styles.neg}`}>
          edge {edge >= 0 ? "+" : ""}
          {edge.toFixed(1)}%
        </span>
      </div>
    </PaperSheet>
  );
}
