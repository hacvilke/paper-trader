"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PaperButton.module.css";
import { crumple } from "@/lib/sound";

type Tone = "green" | "red" | "pencil" | "blue";
type Strike = { id: number; rot: number; dx: number };
type Mark = { id: number };

/**
 * PaperButton.
 *  fx="x"    → the red-pen X draws in, then tumbles off. ONLY for
 *              closing / tearing up / starting over — buttons that
 *              make a thing go away.
 *  fx="press"(default) → a quick press + a little pencil underline
 *              sweeps under the label. For every normal button.
 */
export default function PaperButton({
  children,
  onClick,
  tone = "pencil",
  small = false,
  disabled = false,
  title,
  type = "button",
  className = "",
  fx = "press",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  small?: boolean;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
  className?: string;
  fx?: "x" | "press";
}) {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const seq = useRef(0);

  const handle = useCallback(() => {
    if (disabled) return;
    const id = ++seq.current * 1000 + Math.floor(Math.random() * 999);
    if (fx === "x") {
      const strike: Strike = {
        id,
        rot: Math.random() * 50 - 25,
        dx: Math.random() * 36 - 18,
      };
      setStrikes((s) => [...s.slice(-2), strike]);
      window.setTimeout(() => setStrikes((s) => s.filter((x) => x.id !== id)), 900);
    } else {
      setMarks((m) => [...m.slice(-1), { id }]);
      window.setTimeout(() => setMarks((m) => m.filter((x) => x.id !== id)), 480);
    }
    crumple();
    onClick?.();
  }, [disabled, onClick, fx]);

  const cls = [styles.btn, styles[tone], small ? styles.small : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} title={title} disabled={disabled} onClick={handle} className={cls}>
      <span className={styles.label}>{children}</span>
      {fx === "x" &&
        strikes.map((s) => (
          <span
            key={s.id}
            className={styles.xFall}
            style={{ "--rot": `${s.rot}deg`, "--dx": `${s.dx}px` } as CSSProperties}
            aria-hidden
          >
            <svg viewBox="0 0 40 40">
              <path d="M7 7 L33 33" />
              <path d="M33 7 L7 33" />
            </svg>
          </span>
        ))}
      {fx === "press" && (
        <span className={styles.pressMark} aria-hidden>
          {marks.map((m) => (
            <svg key={m.id} viewBox="0 0 80 8" preserveAspectRatio="none">
              <path d="M2 5 C 14 2, 26 7, 40 4 C 54 1, 66 7, 78 4" />
            </svg>
          ))}
        </span>
      )}
    </button>
  );
}
