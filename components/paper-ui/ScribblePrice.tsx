"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScribblePrice.module.css";

/**
 * ScribblePrice — the signature paper move: when a number changes,
 * the old value is scribbled out in red pen and the new one is
 * hand-written next to it.
 */
export default function ScribblePrice({
  value,
  className = "",
  dollars = true,
}: {
  value: number;
  className?: string;
  dollars?: boolean;
}) {
  const [display, setDisplay] = useState<{ prev: number | null; curr: number; k: number }>({
    prev: null,
    curr: value,
    k: 0,
  });
  const last = useRef(value);

  useEffect(() => {
    if (value !== last.current) {
      const k = display.k + 1;
      setDisplay({ prev: last.current, curr: value, k });
      last.current = value;
      const t = window.setTimeout(() => {
        setDisplay((d) => (d.k === k ? { ...d, prev: null } : d));
      }, 850);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const f = (n: number) => (dollars ? "$" : "") + n.toFixed(2);

  return (
    <span className={`${styles.sp} ${className}`}>
      {display.prev !== null && (
        <span key={`p${display.k}`} className={styles.prev}>
          {f(display.prev)}
          <svg viewBox="0 0 64 18" preserveAspectRatio="none" aria-hidden>
            <path d="M2 9 C 9 3, 15 14, 23 8 C 30 3, 36 13, 43 8 C 50 3, 57 13, 62 7" />
          </svg>
        </span>
      )}
      <span key={`c${display.k}`} className={styles.curr}>
        {f(display.curr)}
      </span>
    </span>
  );
}
