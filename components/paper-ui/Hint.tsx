"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./Hint.module.css";

/**
 * Hint — dotted-underline term that reveals a little sticky note on
 * hover (desktop) or tap (mobile). Tap again or tap elsewhere to close.
 */
export default function Hint({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`${styles.h} ${open ? styles.open : ""}`}
      tabIndex={0}
      role="button"
      aria-expanded={open}
      aria-label={text}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span className={styles.tip} role="tooltip">
        {text}
      </span>
    </span>
  );
}
