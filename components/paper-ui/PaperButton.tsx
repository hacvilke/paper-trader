"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PaperButton.module.css";
import { crumple } from "@/lib/sound";

type Tone = "green" | "red" | "pencil" | "blue";
type Strike = { id: number; rot: number; dx: number };

/**
 * PaperButton — a paper chip. Click it and a red pen crosses it out:
 * the X strokes draw in, then the whole X tumbles off and falls away.
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
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  small?: boolean;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
  className?: string;
}) {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const seq = useRef(0);

  const handle = useCallback(() => {
    if (disabled) return;
    const id = ++seq.current * 1000 + Math.floor(Math.random() * 999);
    const strike: Strike = {
      id,
      rot: Math.random() * 50 - 25,
      dx: Math.random() * 36 - 18,
    };
    setStrikes((s) => [...s.slice(-2), strike]);
    window.setTimeout(() => setStrikes((s) => s.filter((x) => x.id !== id)), 900);
    crumple();
    onClick?.();
  }, [disabled, onClick]);

  const cls = [styles.btn, styles[tone], small ? styles.small : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} title={title} disabled={disabled} onClick={handle} className={cls}>
      <span className={styles.label}>{children}</span>
      {strikes.map((s) => (
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
    </button>
  );
}
