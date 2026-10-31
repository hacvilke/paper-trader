"use client";

import { useState } from "react";
import Desk from "@/components/paper-ui/Desk";
import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperChart from "@/components/paper-ui/PaperChart";
import PaperButton from "@/components/paper-ui/PaperButton";
import Hint from "@/components/paper-ui/Hint";
import Stamp from "@/components/paper-ui/Stamp";
import { useToast } from "@/lib/toast";
import { useChecks } from "@/lib/checks";
import { useMarket } from "@/lib/market";
import { DAILY_LOAN_RATE, dayOf, fmtMoney, START_CASH } from "@/lib/game";
import styles from "./page.module.css";

const clsFor = (side: string) =>
  side === "BUY" ? "buy" : side === "SELL" ? "sell" : side === "SHORT" ? "short" : "cover";
const labelFor = (side: string) =>
  side === "BUY" ? "BUY" : side === "SELL" ? "SELL" : side === "SHORT" ? "SHORT" : "COVER";

export default function LedgerPage() {
  const { state, dispatch } = useMarket();
  const toast = useToast();
  const showCheck = useChecks();
  const [amtRaw, setAmtRaw] = useState("500");

  const holdingsV = state.stocks.reduce(
    (a, s) => a + (state.holdings[s.sym]?.qty ?? 0) * s.price,
    0
  );
  const nw = state.cash + holdingsV - state.debt;
  const unreal = Object.entries(state.holdings).reduce((a, [sym, h]) => {
    const st = state.stocks.find((x) => x.sym === sym);
    return a + (st ? (st.price - h.avg) * h.qty : 0);
  }, 0);
  const cap = Math.max(0, Math.round(0.5 * (state.cash + holdingsV) * 100) / 100);
  const room = Math.max(0, Math.round((cap - state.debt) * 100) / 100);
  const amt = Math.max(0, Math.floor(Number(amtRaw) || 0));

  // the audit: the ledger must explain every cent of cash on hand
  const expectedCash =
    Math.round(
      (START_CASH +
        state.receivedTotal +
        (state.shortProceedsTotal ?? 0) +
        (state.bonusesTotal ?? 0) +
        state.borrowedTotal -
        state.spentTotal -
        (state.coverCostTotal ?? 0) -
        state.repaidTotal -
        (state.shortFeesPaid ?? 0)) *
        100
    ) / 100;
  const audited = state.trades.length > 0 && Math.abs(expectedCash - state.cash) < 0.02;

  function doBorrow() {
    if (amt < 1) return toast("Write an amount first.", "info");
    if (amt > room) return toast(`Credit limit is ${fmtMoney(room)} — 50% of your assets.`, "bad");
    dispatch({ type: "BORROW", amt });
    toast(`Borrowed ${fmtMoney(amt)} — interest at every closing bell.`, "info");
  }

  function doRepay() {
    const a = Math.min(amt, state.debt, state.cash);
    if (a < 0.01) {
      return toast(state.debt > 0 ? "No spare cash to repay with (yet)." : "You have no loan.", "bad");
    }
    showCheck({
      kind: "pay",
      amount: a,
      day: dayOf(state.tick),
      onSign: () => {
        dispatch({ type: "REPAY", amt: a });
        toast(`Check cleared — repaid ${fmtMoney(a)}.`, "good");
      },
    });
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      ledger: "paper-trader open ledger",
      cash: state.cash,
      debt: state.debt,
      totals: {
        startingCash: START_CASH,
        spentOnBuys: state.spentTotal,
        receivedFromSells: state.receivedTotal,
        feesPaid: state.feesPaid,
        borrowedLifetime: state.borrowedTotal,
        repaidLifetime: state.repaidTotal,
        interestPaid: state.interestPaid,
        realizedPL: state.realized,
      },
      holdings: state.holdings,
      trades: state.trades,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paper-trader-open-ledger.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Ledger exported — fully open, fully yours.", "good");
  }

  const row = (
    label: React.ReactNode,
    value: string,
    tone?: "pos" | "neg",
    hint?: string
  ) => (
    <div className={styles.srow} key={typeof label === "string" ? label : undefined}>
      <span className={styles.slbl}>
        {hint ? <Hint text={hint}>{label}</Hint> : label}
      </span>
      <span className={styles.dots} aria-hidden />
      <b className={tone ? styles[tone] : undefined}>{value}</b>
    </div>
  );

  return (
    <Desk>
      <div className={styles.wrap}>
        <h1 className={styles.h1}>the open ledger</h1>
        <p className={styles.sub}>
          everything accounted for — what you spent, made, lost, and borrowed. the books always
          balance, because every number is summed straight from the trade log.
        </p>

        <div className={styles.cols}>
          <PaperSheet tape="corners" rotation={-0.4} className={styles.statement}>
            <div className={styles.sheetHead}>
              <h2>account statement</h2>
              {audited && <Stamp text="AUDITED ✓" tone="green" />}
            </div>

            {row("starting paper", fmtMoney(START_CASH), undefined, "Your starting stack of imaginary money.")}
            {row("spent on buys", "−" + fmtMoney(state.spentTotal), "neg", "Every buy order you've filled, fees included.")}
            {row("received from sells", "+" + fmtMoney(state.receivedTotal), "pos", "Every sell order you've filled, fees included.")}
            {row("paperwork fees", "−" + fmtMoney(state.feesPaid), "neg", `${state.trades.length} orders × $0.99. Fees are forever.`)}
            {row(
              "realized P/L",
              fmtMoney(state.realized),
              state.realized >= 0 ? "pos" : "neg",
              "Profit/loss already locked in from positions you closed. The ink is dry."
            )}
            {row(
              "unrealized P/L",
              fmtMoney(unreal),
              unreal >= 0 ? "pos" : "neg",
              "Profit/loss on shares you still hold, at the last price. Not yours until you sell."
            )}
            {row("borrowed (lifetime)", "+" + fmtMoney(state.borrowedTotal), undefined, "Total ever taken from the credit desk.")}
            {row("repaid (lifetime)", "−" + fmtMoney(state.repaidTotal), "neg")}
            {row(
              "interest paid",
              "−" + fmtMoney(state.interestPaid),
              "neg",
              "Loan interest charged at every closing bell. The price of leverage."
            )}
            {row(
              "short proceeds (lifetime)",
              "+" + fmtMoney(state.shortProceedsTotal ?? 0),
              undefined,
              "Cash received from selling borrowed shares — bets that prices would fall."
            )}
            {row(
              "paid to cover shorts",
              "−" + fmtMoney(state.coverCostTotal ?? 0),
              "neg",
              "What it cost to buy back the shares you owed."
            )}
            {row(
              "short borrow fees",
              "−" + fmtMoney(state.shortFeesPaid ?? 0),
              "neg",
              "0.2% per day on what you owe. Shorts cost money the longer you hold them."
            )}
            {row(
              "moorthy's dividends",
              "+" + fmtMoney(state.bonusesTotal ?? 0),
              "pos",
              "Reward checks from the bank. Sign for them on the trading floor."
            )}

            <div className={styles.totalRow}>
              <span>net worth</span>
              <span className={styles.dots} aria-hidden />
              <b>{fmtMoney(nw)}</b>
            </div>

            <div className={styles.audit}>
              check: {fmtMoney(START_CASH)} + sells + shorts + dividends + loans − buys − covers −
              repayments − borrow fees = <b>{fmtMoney(expectedCash)}</b> · cash on hand{" "}
              <b>{fmtMoney(state.cash)}</b> {audited ? "✓ balances" : "· (make a trade to audit)"}
            </div>

            <PaperButton small tone="blue" onClick={exportJson}>
              ⬇ export as json
            </PaperButton>
          </PaperSheet>

          <div className={styles.rightCol}>
            <PaperSheet tape="pin" rotation={0.6} className={styles.loan}>
              <h2>credit desk</h2>
              <p className={styles.loanNote}>
                borrow against your paper at <b>{(DAILY_LOAN_RATE * 100).toFixed(1)}% per day</b>,
                charged at each closing bell. limit: 50% of your assets. no margin calls here —
                this is a school, not a shark tank.
              </p>
              <div className={styles.loanRow}>
                <span>
                  owe: <b className={state.debt > 0 ? styles.neg : undefined}>{fmtMoney(state.debt)}</b>
                </span>
                <span>
                  credit room: <b>{fmtMoney(room)}</b>
                </span>
              </div>
              <label className={styles.amtLbl}>
                $
                <input
                  className={styles.amt}
                  type="number"
                  min={0}
                  value={amtRaw}
                  onChange={(e) => setAmtRaw(e.target.value)}
                  aria-label="amount"
                />
              </label>
              <div className={styles.loanBtns}>
                <PaperButton tone="green" onClick={doBorrow}>
                  BORROW
                </PaperButton>
                <PaperButton small tone="pencil" title="borrow up to the limit" onClick={() => setAmtRaw(String(Math.floor(room)))}>
                  room
                </PaperButton>
                <PaperButton tone="red" onClick={doRepay}>
                  REPAY
                </PaperButton>
                <PaperButton
                  small
                  tone="pencil"
                  title="repay as much as possible"
                  onClick={() => setAmtRaw(Math.min(state.debt, state.cash).toFixed(2))}
                >
                  all
                </PaperButton>
              </div>
              {state.debt > 0 && (
                <div className={styles.warn}>⚠ leverage juices gains AND losses. the paper cutter cuts both ways.</div>
              )}
            </PaperSheet>

            <PaperSheet tape="top" rotation={-0.5} lines="grid" className={styles.equity}>
              <h2>net worth vs paper 500</h2>
              <PaperChart data={state.netWorthHist} overlay={state.indexHist} height={128} />
              <div className={styles.legend}>
                <span>— you (net of loans)</span>
                <span>-- PAPER 500</span>
              </div>
            </PaperSheet>
          </div>
        </div>

        <PaperSheet tape="clip" rotation={0.2} className={styles.history}>
          <h2>
            full trade history <span className={styles.count}>{state.trades.length} entries</span>
          </h2>
          {state.trades.length === 0 ? (
            <div className={styles.empty}>nothing booked yet. the ledger paper is pristine. for now.</div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th>when</th>
                    <th>action</th>
                    <th className={styles.num}>shares</th>
                    <th>sym</th>
                    <th className={styles.num}>price</th>
                    <th className={styles.num}>total</th>
                  </tr>
                </thead>
                <tbody>
                  {state.trades.map((t) => (
                    <tr key={t.id}>
                      <td>
                        D{t.day} {t.time}
                      </td>
                      <td className={styles[clsFor(t.side)]}>{labelFor(t.side)}</td>
                      <td className={styles.num}>{t.qty}</td>
                      <td className={styles.sym}>{t.sym}</td>
                      <td className={styles.num}>{t.price.toFixed(2)}</td>
                      <td className={styles.num}>{fmtMoney(t.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={styles.foot}>the book keeps the last 50 orders — export above for a full copy.</div>
        </PaperSheet>
      </div>
    </Desk>
  );
}
