"use client";

import { useCallback, useRef, useState } from "react";
import PaperButton from "./PaperButton";
import { amtWords } from "@/lib/game";
import { coinSound, crumple, signSound, stampSound } from "@/lib/sound";
import styles from "./CheckOverlay.module.css";

export type CheckData = {
  kind: "reward" | "pay";
  amount: number;
  day: number;
  dateLabel: string;
  payee?: string; // override who the check is for
  memo?: string; // override the memo line
  onSign: () => void;
};

/**
 * CheckOverlay — a paper check you fill by hand: the mouse becomes a
 * pencil, you scribble your signature in the box, and only then does
 * the money move. Sign & deposit (reward) or sign & send (repay the
 * bank). Tearing up a payment cancels it.
 */
export default function CheckOverlay({ check, onClose }: { check: CheckData; onClose: () => void }) {
  const [hasInk, setHasInk] = useState(false);
  const [leaving, setLeaving] = useState<"sent" | "torn" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const scratchAt = useRef(0);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const start = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }, []);

  const move = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = "rgba(36, 65, 140, 0.92)";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.quadraticCurveTo(last.current!.x, last.current!.y, (last.current!.x + p.x) / 2, (last.current!.y + p.y) / 2);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
    const now = Date.now();
    if (now - scratchAt.current > 90) {
      scratchAt.current = now;
      signSound();
    }
  }, []);

  const end = useCallback(() => {
    drawing.current = false;
    last.current = null;
  }, []);

  function clearSig() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    crumple();
  }

  function signIt() {
    if (!hasInk || leaving) return;
    stampSound();
    if (check.kind === "reward") coinSound();
    setLeaving("sent");
    check.onSign();
    window.setTimeout(onClose, 480);
  }

  function tearIt() {
    if (leaving) return;
    crumple();
    setLeaving("torn");
    window.setTimeout(onClose, 380);
  }

  const payee = check.payee ?? (check.kind === "reward" ? "You — the desk" : "Moorthy's Paper Bank");
  const memo = check.memo ?? (check.kind === "reward" ? "paper dividend — keep trading" : "loan repayment");

  return (
    <div className={styles.veil} role="dialog" aria-modal aria-label="sign a check">
      <div className={`${styles.checkWrap} ${leaving ? (leaving === "sent" ? styles.out : styles.torn) : ""}`}>
        <div className={styles.check}>
          <div className={styles.band} aria-hidden />
          <div className={styles.head}>
            <span className={styles.bank}>MOORTHY&apos;S PAPER BANK</span>
            <span className={styles.bankNote}>est. 1951 · “we keep it together”</span>
            <span className={styles.checkNo}>№ 00{1 + (check.day % 998)}</span>
          </div>

          <div className={styles.dateRow}>
            <span className={styles.lbl}>date</span>
            <span className={styles.date}>day {check.day} · {check.dateLabel}</span>
            <span className={styles.lbl}>memo</span>
            <span className={styles.memo}>{memo}</span>
          </div>

          <div className={styles.payRow}>
            <span className={styles.lbl}>pay to the order of</span>
            <span className={styles.payee}>{payee}</span>
            <span className={styles.amountBox}>
              <em>$</em>
              {check.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className={styles.words}>{amtWords(check.amount)} — not a counterfex, promise.</div>

          <div className={styles.sigRow}>
            <div className={styles.sigBox}>
              <canvas
                ref={canvasRef}
                width={460}
                height={120}
                className={styles.canvas}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
              />
              <span className={styles.sigLbl}>{hasInk ? "signed ✓" : "✍ sign here (drag your pencil)"}</span>
            </div>
            <div className={styles.micr} aria-hidden>
              ⑆88⑆ 24/261 ⑈000421⑈
            </div>
          </div>

          <div className={styles.btns}>
            <PaperButton tone="green" onClick={signIt} disabled={!hasInk}>
              {check.kind === "reward" ? "sign & deposit" : "sign & send"}
            </PaperButton>
            <PaperButton small tone="pencil" onClick={clearSig} disabled={!hasInk}>
              clear
            </PaperButton>
            {check.kind === "pay" && (
              <PaperButton small tone="red" fx="x" onClick={tearIt}>
                tear it up
              </PaperButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
