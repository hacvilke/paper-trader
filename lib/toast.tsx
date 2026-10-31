"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./toast.module.css";

type Tone = "info" | "good" | "bad";
type Item = { id: number; msg: string; tone: Tone; leaving: boolean };

const Ctx = createContext<(msg: string, tone?: Tone) => void>(() => {});

/** useToast() — tosses a little sticky note onto the desk corner. */
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const push = useCallback((msg: string, tone: Tone = "info") => {
    const id = Math.random();
    setItems((xs) => [...xs.slice(-2), { id, msg, tone, leaving: false }]);
    window.setTimeout(
      () => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x))),
      2700
    );
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3250);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className={styles.host} aria-live="polite">
        {items.map((t, i) => (
          <div
            key={t.id}
            className={[styles.note, styles[t.tone], t.leaving ? styles.leave : ""]
              .filter(Boolean)
              .join(" ")}
            style={{ "--rot": `${((i * 7) % 7) - 3}deg` } as CSSProperties}
          >
            <span className={styles.mark}>
              {t.tone === "good" ? "✓" : t.tone === "bad" ? "✗" : "✎"}
            </span>{" "}
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
