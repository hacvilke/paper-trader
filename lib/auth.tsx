"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import PressBadge from "@/components/paper-ui/PressBadge";

/**
 * Press badges — light accounts: name + 4-digit PIN. Your save is
 * filed under your badge, and the leaderboard reads the same cabinet.
 */
export type Auth = { user: string; token: string } | null;

type AuthCtx = {
  auth: Auth;
  ready: boolean;
  login: (user: string, pin: string) => Promise<string | null>;
  register: (user: string, pin: string) => Promise<string | null>;
  logout: () => void;
  openBadge: () => void;
};

const Ctx = createContext<AuthCtx>({
  auth: null,
  ready: false,
  login: async () => null,
  register: async () => null,
  logout: () => {},
  openBadge: () => {},
});

export const useAuth = () => useContext(Ctx);
const KEY = "pt-badge";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setAuth(JSON.parse(raw));
    } catch {
      /* no badge */
    }
    setReady(true);
  }, []);

  const call = useCallback(async (mode: "login" | "register", user: string, pin: string) => {
    try {
      const r = await window.fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, user, pin }),
      });
      const d = await r.json();
      if (!d.ok) return (d.error as string) ?? "the ink smudged. try again.";
      const a = { user: d.user as string, token: d.token as string };
      setAuth(a);
      window.localStorage.setItem(KEY, JSON.stringify(a));
      setOpen(false);
      return null;
    } catch {
      return "the wire to Moorthy's is down.";
    }
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    window.localStorage.removeItem(KEY);
    setOpen(false);
  }, []);

  return (
    <Ctx.Provider value={{ auth, ready, login: call.bind(null, "login"), register: call.bind(null, "register"), logout, openBadge: () => setOpen(true) }}>
      {children}
      {open && <PressBadge onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}
