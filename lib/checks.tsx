"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import CheckOverlay from "@/components/paper-ui/CheckOverlay";
import type { CheckData } from "@/components/paper-ui/CheckOverlay";
import { timeOf } from "./game";

/**
 * CheckProvider — ceremonies for money that moves on paper:
 * show() slides a real check onto the desk; signing it (pencil
 * cursor, ink strokes) fires the callback. Nothing moves until
 * there's ink on the line.
 */
type ShowOpts = Omit<CheckData, "dateLabel">;

const Ctx = createContext<(opts: ShowOpts) => void>(() => {});

export const useChecks = () => useContext(Ctx);

export function CheckProvider({ children }: { children: ReactNode }) {
  const [check, setCheck] = useState<CheckData | null>(null);

  const show = useCallback((opts: ShowOpts) => {
    setCheck({
      ...opts,
      dateLabel: timeOf(Math.floor(Date.now() / 1000) % 26),
    });
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {check && <CheckOverlay check={check} onClose={() => setCheck(null)} />}
    </Ctx.Provider>
  );
}
