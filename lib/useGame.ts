"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { GAME_VERSION, initialGame, reducer } from "./game";
import type { Action, GameState } from "./game";

const KEY = `paper-trader-save-v${GAME_VERSION}`;

export type SaveStatus = "idle" | "loading" | "saved" | "saving" | "offline";

function plausiblyValid(p: unknown): p is GameState {
  const s = p as GameState;
  return (
    !!s &&
    typeof s === "object" &&
    s.v === GAME_VERSION &&
    typeof s.tick === "number" &&
    Array.isArray(s.stocks) &&
    s.stocks.length >= 8
  );
}

/**
 * useGame — runs the market clock and persists progress to the server
 * file cabinet (guest slot, or a per-badge slot when wearing a press
 * badge) + localStorage as a fast local copy. Writes every few seconds
 * and on page hide, so nothing is ever lost.
 */
export function useGame(slot: string, token: string): {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  saveStatus: SaveStatus;
} {
  const [state, dispatch] = useReducer(reducer, undefined, initialGame);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const readyRef = useRef(false); // don't write before we've tried loading
  const stateRef = useRef(state);
  const slotRef = useRef({ slot, token });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    slotRef.current = { slot, token };
  }, [slot, token]);

  const target = (t?: { slot: string; token: string }) =>
    t && t.slot !== "main"
      ? `/api/save?as=${encodeURIComponent(t.slot)}&t=${encodeURIComponent(t.token)}`
      : "/api/save?slot=main";

  // ---- load: localStorage immediately, then the cabinet if newer ----
  useEffect(() => {
    setSaveStatus("loading");
    let localTick = -1;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (plausiblyValid(parsed)) {
          localTick = parsed.tick;
          dispatch({ type: "HYDRATE", state: parsed });
        }
      }
    } catch {
      /* it's paper, it happens */
    }

    (async () => {
      try {
        const r = await window.fetch(target({ slot, token }), { cache: "no-store" });
        if (r.ok) {
          const parsed = await r.json();
          if (plausiblyValid(parsed) && parsed.tick > localTick) {
            dispatch({ type: "HYDRATE", state: parsed });
          }
        }
      } catch {
        /* offline — the local copy carries */
      }
      readyRef.current = true;
      setSaveStatus("idle");
    })();
  }, [slot, token]);

  // ---- archive loop: flush every few seconds once loaded ----
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!readyRef.current) return;
      const s = stateRef.current;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* ignore */
      }
      setSaveStatus("saving");
      window
        .fetch(target(slotRef.current), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...s, savedAt: Date.now() }),
        })
        .then((r) => setSaveStatus(r.ok ? "saved" : "offline"))
        .catch(() => setSaveStatus("offline"));
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  // ---- last-ink flush when the tab goes away ----
  useEffect(() => {
    const flush = () => {
      if (!readyRef.current) return;
      const s = { ...stateRef.current, savedAt: Date.now() };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* ignore */
      }
      try {
        navigator.sendBeacon(target(slotRef.current), new Blob([JSON.stringify(s)], { type: "application/json" }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  // ---- market clock ----
  useEffect(() => {
    if (state.speed === 0) return;
    const ms = 1250 / state.speed;
    const id = window.setInterval(() => dispatch({ type: "TICK" }), ms);
    return () => window.clearInterval(id);
  }, [state.speed]);

  return { state, dispatch, saveStatus };
}
