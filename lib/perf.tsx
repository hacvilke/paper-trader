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
  }, []);
  return null;
}
