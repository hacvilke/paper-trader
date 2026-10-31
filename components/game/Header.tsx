"use client";

import { useRef, useState } from "react";
import type { Dispatch } from "react";
import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperButton from "@/components/paper-ui/PaperButton";
import ScribblePrice from "@/components/paper-ui/ScribblePrice";
import { dayOf, fmtMoney, netWorth, START_CASH, timeOf } from "@/lib/game";
import type { Action, GameState, Speed } from "@/lib/game";
import { setMuted } from "@/lib/sound";
import styles from "./Header.module.css";

const SPEEDS: Array<[string, Speed]> = [
  ["❚❚", 0],
  ["▶", 1],
  ["▶▶", 2],
  ["▶▶▶", 4],
];

export default function Header({
  state,
  dispatch,
  saveStatus,
}: {
  state: GameState;
  dispatch: Dispatch<Action>;
  saveStatus?: "idle" | "loading" | "saved" | "saving" | "offline";
}) {
  const worth = netWorth(state);
  const hist = state.netWorthHist;
  const ref = hist[Math.max(0, hist.length - 1 - 26)] ?? worth;
  const dayPnl = worth - ref;

  const [muted, setM] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<number | null>(null);

  function doReset() {
    if (confirmReset) {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      setConfirmReset(false);
      dispatch({ type: "RESET" });
    } else {
      setConfirmReset(true);
      resetTimer.current = window.setTimeout(() => setConfirmReset(false), 2600);
    }
  }

  return (
    <PaperSheet tape="clip" rotation={-0.35} className={styles.sheet}>
      <div className={styles.head}>
        <div className={styles.title}>
          <h1>Paper Trader</h1>
          <div className={styles.sub}>the paper-trading game — no real money, just ink ✎</div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.lbl}>cash</span>
            <span className={styles.val}>
              <ScribblePrice value={state.cash} />
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.lbl}>net worth</span>
            <span className={styles.val}>
              <ScribblePrice value={worth} />
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.lbl}>today</span>
            <span className={`${styles.val} ${dayPnl >= 0 ? styles.good : styles.bad}`}>
              {fmtMoney(dayPnl)}
            </span>
          </div>
          {state.debt > 0 && (
            <span className={styles.debtChip} title="outstanding loan — interest at each closing bell">
              owe {fmtMoney(state.debt)}
            </span>
          )}
          <span className={styles.chip}>
            <span className={`${styles.dot} ${state.speed === 0 ? styles.paused : ""}`} aria-hidden />
            day {dayOf(state.tick)} · {timeOf(state.tick)}
          </span>
        </div>

        <div className={styles.controls}>
          {SPEEDS.map(([lbl, v]) => (
            <PaperButton
              key={v}
              small
              tone="pencil"
              title={`speed ${v === 0 ? "paused" : "×" + v}`}
              onClick={() => dispatch({ type: "SPEED", speed: v })}
            >
              <span className={state.speed === v ? styles.active : undefined}>{lbl}</span>
            </PaperButton>
          ))}
          <PaperButton small tone="blue" title="how to play" onClick={() => dispatch({ type: "TUT_ON" })}>
            ?
          </PaperButton>
          <PaperButton
            small
            tone={muted ? "red" : "blue"}
            title="toggle sound"
            onClick={() => {
              setMuted(!muted);
              setM(!muted);
            }}
          >
            {muted ? "sound ✗" : "sound ♫"}
          </PaperButton>
          <PaperButton small tone="red" fx="x" title="start over" onClick={doReset}>
            {confirmReset ? "sure??" : "reset"}
          </PaperButton>
          {saveStatus && saveStatus !== "idle" && saveStatus !== "loading" && (
            <span
              className={styles.archive}
              title="your game is archived to the file cabinet every few seconds — it survives refreshes and crashes"
            >
              {saveStatus === "saving" ? "🗃 archiving…" : saveStatus === "saved" ? "🗃 archived ✓" : "🗃 local only"}
            </span>
          )}
        </div>
      </div>
      <div className={styles.footnote}>
        started with {fmtMoney(START_CASH)} of perfectly imaginary money
      </div>
    </PaperSheet>
);
}
