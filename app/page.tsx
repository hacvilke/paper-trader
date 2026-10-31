"use client";

import { useEffect, useState } from "react";
import Desk from "@/components/paper-ui/Desk";
import TickerTape from "@/components/paper-ui/TickerTape";
import Hint from "@/components/paper-ui/Hint";
import Envelope from "@/components/paper-ui/Envelope";
import Header from "@/components/game/Header";
import MarketGrid from "@/components/game/MarketGrid";
import StockDetail from "@/components/game/StockDetail";
import Portfolio from "@/components/game/Portfolio";
import NewsFeed from "@/components/game/NewsFeed";
import Ledger from "@/components/game/Ledger";
import Guide from "@/components/game/Guide";
import { moodWord, holdingsValue } from "@/lib/game";
import { useChecks } from "@/lib/checks";
import { useMarket } from "@/lib/market";
import { pickUpHandoff } from "@/lib/handoff";
import styles from "./page.module.css";

export default function Page() {
  const { state, dispatch, saveStatus } = useMarket();
  const showCheck = useChecks();
  const [selected, setSelected] = useState(state.stocks[0].sym);

  // arriving from the tape with a stock in hand?
  useEffect(() => {
    const sym = pickUpHandoff();
    if (sym && state.stocks.some((s) => s.sym === sym)) setSelected(sym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stock = state.stocks.find((s) => s.sym === selected) ?? state.stocks[0];
  const holding = state.holdings[stock.sym];

  const tapeItems = state.stocks.map((s) => ({
    sym: s.sym,
    price: s.price,
    pct: ((s.price - s.dayOpen) / s.dayOpen) * 100,
  }));

  const mood = moodWord(state.moodDrift);
  const moodCls =
    mood === "euphoric" || mood === "upbeat"
      ? styles.moodGood
      : mood === "panicky" || mood === "nervous"
        ? styles.moodBad
        : styles.moodFlat;

  return (
    <Desk>
      <div className={styles.wrap}>
        <Header state={state} dispatch={dispatch} saveStatus={saveStatus} />
        <TickerTape items={tapeItems} />

        {state.pendingCheck && (
          <Envelope
            amount={state.pendingCheck.amount}
            onOpen={() =>
              showCheck({
                kind: "reward",
                amount: state.pendingCheck!.amount,
                day: state.pendingCheck!.day,
                onSign: () => dispatch({ type: "CLAIM_CHECK" }),
              })
            }
          />
        )}

        <div className={styles.main}>
          <div className={styles.left}>
            <div className={styles.sectionRow}>
              <span className={styles.tag}>the market</span>
              <span className={`${styles.mood} ${moodCls}`}>
                <Hint text="The mood drifts in and out like weather. It nudges ALL stocks up or down at once — high-beta names (look at you knowing what beta is) move most.">
                  mood: {mood}
                </Hint>
              </span>
            </div>

            {state.tut && <Guide onDismiss={() => dispatch({ type: "TUT_OFF" })} />}

            <MarketGrid stocks={state.stocks} selected={selected} onSelect={setSelected} />

            <div className={styles.sectionRow}>
              <span className={styles.tag}>trading desk</span>
            </div>
            <StockDetail
              stock={stock}
              holding={holding}
              short={state.shorts[stock.sym]}
              cash={state.cash}
              holdVal={holdingsValue(state)}
              dispatch={dispatch}
            />
          </div>

          <div className={styles.right}>
            <Portfolio state={state} onSelect={setSelected} />
            <NewsFeed news={state.news} />
            <Ledger trades={state.trades} />
          </div>
        </div>

        <footer className={styles.footer}>
          <b>Paper Trader</b> — not financial advice. it&apos;s literally paper. · spreads are small,
          fees are $0.99, and the moose is always right.
        </footer>
      </div>
    </Desk>
  );
}
