"use client";

import { createContext, useContext } from "react";
import { useGame } from "./useGame";
import { useAuth } from "./auth";

/**
 * MarketProvider — one shared game state for the whole app. The save
 * slot follows your press badge: guests file under "main", badged
 * traders under their own name. Switching badges swaps the cabinet.
 */
type MarketCtx = ReturnType<typeof useGame>;

const Ctx = createContext<MarketCtx | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  const slot = auth?.user ?? "main";
  const token = auth?.token ?? "";
  const game = useGame(slot, token);
  return <Ctx.Provider value={game}>{children}</Ctx.Provider>;
}

export function useMarket() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarket must be used inside <MarketProvider>");
  return v;
}
