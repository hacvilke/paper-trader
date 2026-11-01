"use client";

import { useEffect } from "react";

/**
 * Eco-fx gate: low-end phones (coarse pointer + little RAM/cores) and
 * reduced-motion users get `html.lowfx` — hand-drawn filters off,
 * looping animations off, scroll jank gone. Everyone else keeps the
 * full paper theatre.
 */

export type FxPref = "auto" | "full" | "eco";
const KEY = "pt-fx";

export function getFxPref(): FxPref {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "full" || v === "eco" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setFxPref(p: FxPref) {
  try {
    window.localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
  applyFx();
}

function shouldLowFx(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse && weak;
}

export function applyFx() {
  const pref = getFxPref();
  const low = pref === "eco" || (pref === "auto" && shouldLowFx());
  document.documentElement.classList.toggle("lowfx", low);
}

/** Mount once in the root layout. */
export default function PerfGate() {
  useEffect(() => {
    applyFx();
    // ---- freeze watchdog ----
    // Even good phones can drown in hand-drawn SVG filters once the
    // board fills up. If frames stay slow for a while and the user
    // hasn't picked a mode on purpose, trim the fx automatically.
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    let badWindows = 0;
    let done = false;
    const loop = (t: number) => {
      const gap = t - last;
      last = t;
      if (gap < 1000) {
        acc += gap;
        frames += 1;
      }
      raf = requestAnimationFrame(loop);
    };
    const iv = window.setInterval(() => {
      if (done) return;
      const avg = frames > 30 ? acc / frames : 0;
      acc = 0;
      frames = 0;
      // a healthy interactive page frames at ~16ms; >40ms sustained = struggling
      if (avg > 40) badWindows += 1;
      else badWindows = 0;
      if (badWindows >= 2 && getFxPref() === "auto" && !document.documentElement.classList.contains("lowfx")) {
        document.documentElement.classList.add("lowfx");
        done = true;
        window.clearInterval(iv);
        window.cancelAnimationFrame(raf);
        // eslint-disable-next-line no-console
        console.info("paper fx trimmed automatically — pick a mode in your badge menu to override");
      }
    }, 4000);
    return () => {
      window.clearInterval(iv);
      window.cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
