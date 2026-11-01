"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperButton from "@/components/paper-ui/PaperButton";
import PaperConfetti from "@/components/paper-ui/PaperConfetti";
import Stamp from "@/components/paper-ui/Stamp";
import ScribblePrice from "@/components/paper-ui/ScribblePrice";
import { dayOf, fmtMoney, netWorth, START_CASH, timeOf } from "@/lib/game";
import type { Action, GameState, Speed } from "@/lib/game";
import { MAGNATE_AT, MILESTONES } from "@/lib/game";
import Magnate from "@/components/paper-ui/Magnate";
import { coinSound, setMuted } from "@/lib/sound";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
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
  const toast = useToast();
  const { auth } = useAuth();
  const worth = netWorth(state);
  const [celebrate, setCelebrate] = useState<{ amt: number; k: number } | null>(null);
  const [magnate, setMagnate] = useState<number | null>(null);

  // milestone congratulations — fires once per threshold, ever
  useEffect(() => {
    const got = state.milestones ?? [];
    const hit = [...MILESTONES].reverse().find((m) => worth >= m && !got.includes(m));
    if (hit) {
      dispatch({ type: "MILESTONE", amt: hit });
      coinSound();
      toast(`🏆 milestone: net worth passed ${fmtMoney(hit)}!`, "good");
      if (MAGNATE_AT[hit]) {
        // the big five: he walks in himself, check in hand
        setMagnate(hit);
      } else {
        setCelebrate({ amt: hit, k: Date.now() });
        const t = window.setTimeout(() => setCelebrate(null), 2600);
        return () => window.clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worth]);
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
      // tear up the incorporation papers too: release the ticker so
      // another trader can found under that name
      if (state.factory?.founded && auth) {
        void window
          .fetch(
            `/api/biz?sym=${state.factory.sym}&user=${auth.user}&t=${auth.token}`,
            { method: "DELETE" }
          )
          .catch(() => {});
      }
      dispatch({ type: "RESET" });
      window.dispatchEvent(new Event("pt-flush")); // pin the fresh desk to the cabinet NOW
    } else {
      setConfirmReset(true);
      resetTimer.current = window.setTimeout(() => setConfirmReset(false), 2600);
    }
  }

  return (
    <PaperSheet tape="clip" rotation={-0.35} className={styles.sheet}>
      <PaperConfetti burst={celebrate ? 1 : 0} x="30%" y="30%" />
      {magnate !== null && (
        <Magnate
          bonus={MAGNATE_AT[magnate]}
          day={dayOf(state.tick)}
          stocks={state.stocks}
          onReceive={(b) => dispatch({ type: "GIFT", amt: b })}
          onDone={() => setMagnate(null)}
        />
      )}
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
          {celebrate && (
            <span key={celebrate.k} className={styles.congrats}>
              <Stamp text={`${fmtMoney(celebrate.amt)}!`} tone="green" />
            </span>
          )}
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
