/** handoff — tiny clipboard for jumping from the tape to the desk. */
const KEY = "pt-sel";

export function handOff(sym: string) {
  try {
    window.sessionStorage.setItem(KEY, sym);
  } catch {
    /* ignore */
  }
}

export function pickUpHandoff(): string | null {
  try {
    const v = window.sessionStorage.getItem(KEY);
    if (v) window.sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
