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

  // ---- load: localStorage immediately, then the cabinet if NEWER ----
  // "newer" is decided by savedAt (wall clock at write), NOT tick —
  // otherwise a reset (tick back to ~0) loses to the stale pre-reset
  // save and the old empire resurrects. Most-recent ink wins, period.
  useEffect(() => {
    setSaveStatus("loading");
    let localAt = -1;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (plausiblyValid(parsed)) {
          localAt = Number((parsed as { savedAt?: number }).savedAt ?? 0);
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
          if (
            plausiblyValid(parsed) &&
            Number((parsed as { savedAt?: number }).savedAt ?? 0) >= localAt
          ) {
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

  // ---- instant flush on demand (RESET fires this so a quick app-kill
  //      can't resurrect the old desk) ----
  useEffect(() => {
    const flushNow = () => {
      if (!readyRef.current) return;
      const s = { ...stateRef.current, savedAt: Date.now() };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* ignore */
      }
      window
        .fetch(target(slotRef.current), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
          keepalive: true,
        })
        .catch(() => {});
    };
    window.addEventListener("pt-flush", flushNow);
    return () => window.removeEventListener("pt-flush", flushNow);
  }, []);

  // ---- archive loop: flush every few seconds once loaded
  //      (skipped while hidden — the pagehide beacon covers exits;
  //       writing a big blob every 4s in a background tab is waste) ----
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!readyRef.current || document.hidden) return;
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

  // ---- the shared listing window: player IPOs reach every world ----
  useEffect(() => {
    if (!token || !state.tick) return;
    const dayRolled = state.tick > 0 && state.tick % 26 === 0;
    const caught = state.ipoCursor === undefined && state.tick % 5 === 0; // occasional catch-up
    if (!dayRolled && !caught) return;
    let stop = false;
    window
      .fetch(`/api/ipos?after=${state.ipoCursor ?? 0}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!stop && d.ok && (d.rows ?? []).length > 0) {
          dispatch({
            type: "LIST_FOREIGN",
            listings: d.rows.map((r: { sym: string; uname: string; name: string; px: number; at: number }) => r),
          });
        }
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tick, token]);

  // ---- market clock: self-scheduling, burst-proof ----
  // setInterval queues ticks when the tab stalls (throttling, GC, a
  // slow render) and they all fire at once — the "game froze" feel.
  // A setTimeout chain fires at most one tick at a time, skips ahead
  // when we fall behind, and never catches up after returning from
  // another tab. Missed time stays missed, like a real market.
  useEffect(() => {
    if (state.speed === 0) return;
    let stop = false;
    let id = 0;
    const ms = 1250 / state.speed;
    const arm = () => {
      id = window.setTimeout(() => {
        if (stop) return;
        if (!document.hidden) dispatch({ type: "TICK" });
        arm();
      }, document.hidden ? Math.max(ms, 1000) : ms);
    };
    arm();
    return () => {
      stop = true;
      window.clearTimeout(id);
    };
  }, [state.speed]);

  return { state, dispatch, saveStatus };
}
