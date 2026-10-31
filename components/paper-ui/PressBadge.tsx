"use client";

import { useEffect, useState } from "react";
import PaperSheet from "./PaperSheet";
import PaperButton from "./PaperButton";
import { useAuth } from "@/lib/auth";
import { getFxPref, setFxPref } from "@/lib/perf";
import type { FxPref } from "@/lib/perf";
import styles from "./PressBadge.module.css";

/**
 * PressBadge — the laminated press badge you sign to trade under your
 * own name. One badge per trader: brother gets his, friend gets hers,
 * nobody overwrites anybody's paper empire.
 */
export default function PressBadge({ onClose }: { onClose: () => void }) {
  const { auth, login, register, logout } = useAuth();
  const [user, setUser] = useState(auth?.user ?? "");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fx, setFx] = useState<FxPref>("auto");

  useEffect(() => {
    setFx(getFxPref());
  }, []);

  async function go(mode: "login" | "register") {
    setBusy(true);
    const e = await (mode === "login" ? login(user, pin) : register(user, pin));
    setBusy(false);
    setErr(e);
  }

  return (
    <div className={styles.veil} role="dialog" aria-modal aria-label="trader badge">
      <div className={styles.badgeWrap}>
        <PaperSheet tape="clip" rotation={-1} className={styles.badge}>
          <div className={styles.strip} aria-hidden />
          <h2 className={styles.h}>press badge</h2>
          <p className={styles.note}>
            your save files under this badge — switch traders without losing a sheet of paper.
            the leaderboard reads the same cabinet.
          </p>

          {auth ? (
            <>
              <div className={styles.holder}>
                <span className={styles.holderLbl}>badged trader</span>
                <b className={styles.holderName}>{auth.user}</b>
              </div>
              <div className={styles.row}>
                <PaperButton tone="red" fx="x" onClick={logout}>
                  take badge off
                </PaperButton>
                <PaperButton tone="green" onClick={onClose}>
                  back to work
                </PaperButton>
              </div>
              <div className={styles.hint}>taking the badge off files future work under “guest”.</div>
            </>
          ) : (
            <>
              <label className={styles.lbl}>
                trader name
                <input
                  className={styles.in}
                  value={user}
                  onChange={(e) => setUser(e.target.value.toLowerCase())}
                  placeholder="paperbaron"
                  autoComplete="off"
                  maxLength={14}
                />
              </label>
              <label className={styles.lbl}>
                secret PIN (digits)
                <input
                  className={`${styles.in} ${styles.pin}`}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••"
                  inputMode="numeric"
                  autoComplete="off"
                  type="password"
                />
              </label>
              {err && <div className={styles.err}>✗ {err}</div>}
              <div className={styles.row}>
                <PaperButton tone="green" disabled={busy} onClick={() => go("register")}>
                  new badge
                </PaperButton>
                <PaperButton tone="blue" disabled={busy} onClick={() => go("login")}>
                  sign in
                </PaperButton>
              </div>
              <div className={styles.hint}>
                “new badge” = register · “sign in” = continue an existing trader&apos;s paper
              </div>
              <div className={styles.fxRow}>
                <span className={styles.fxLbl}>paper fx</span>
                {(["full", "auto", "eco"] as FxPref[]).map((p) => (
                  <PaperButton
                    key={p}
                    small
                    tone={fx === p ? "blue" : "pencil"}
                    onClick={() => {
                      setFxPref(p);
                      setFx(p);
                    }}
                    title={
                      p === "eco"
                        ? "eco: no fancy filters, no looping animations — smoothest on cheap phones"
                        : p === "full"
                          ? "full: all the hand-drawn theatre"
                          : "auto: decide by device"
                    }
                  >
                    {p}
                  </PaperButton>
                ))}
              </div>
            </>
          )}
        </PaperSheet>
      </div>
    </div>
  );
}
