"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Desk from "@/components/paper-ui/Desk";
import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperChart from "@/components/paper-ui/PaperChart";
import StickyNote from "@/components/paper-ui/StickyNote";
import Hint from "@/components/paper-ui/Hint";
import { ArrowDown, ArrowUp } from "@/components/paper-ui/doodles";
import { useMarket } from "@/lib/market";
import { useAuth } from "@/lib/auth";
import { handOff } from "@/lib/handoff";
import { fmtMoney, volWord } from "@/lib/game";
import styles from "./page.module.css";

type Filter = "all" | "risers" | "fallers" | "mine";
type LbRow = { user: string; worth: number; day: number };
type FeedRow = { user: string; text: string; ts: number };

const ago = (ts: number) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
};

export default function ExchangePage() {
  const { state } = useMarket();
  const { auth } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [lb, setLb] = useState<LbRow[]>([]);
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [live, setLive] = useState(false);
  const prevWorth = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, 1 | -1 | 0>>({});

  // ---- live poll: leaderboard + wire, every 4s ----
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const [lbR, feedR] = await Promise.all([
          window.fetch("/api/leaderboard", { cache: "no-store" }).then((r) => r.json()),
          window.fetch("/api/feed", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (stop) return;
        const rows: LbRow[] = lbR.rows ?? [];
        const d: Record<string, 1 | -1 | 0> = {};
        for (const r of rows) {
          const prev = prevWorth.current[r.user];
          d[r.user] = prev === undefined || prev === r.worth ? 0 : r.worth > prev ? 1 : -1;
        }
        prevWorth.current = Object.fromEntries(rows.map((r) => [r.user, r.worth]));
        setLb(rows);
        setDeltas(d);
        setFeed(feedR.rows ?? []);
        setLive(true);
      } catch {
        if (!stop) setLive(false);
      }
    };
    load();
    const id = window.setInterval(load, 4000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const rows = useMemo(() => {
    const list = state.stocks.map((s) => {
      const mine =
        (state.holdings[s.sym]?.qty ?? 0) > 0 || (state.shorts[s.sym]?.qty ?? 0) > 0;
      return { s, pct: ((s.price - s.dayOpen) / s.dayOpen) * 100, mine };
    });
    switch (filter) {
      case "risers":
        return list.filter((r) => r.pct >= 0).sort((a, b) => b.pct - a.pct);
      case "fallers":
        return list.filter((r) => r.pct < 0).sort((a, b) => a.pct - b.pct);
      case "mine":
        return list.filter((r) => r.mine);
      default:
        return list.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    }
  }, [state.stocks, state.holdings, state.shorts, filter]);

  const graveyard = state.news.filter((n) => /BANKRUPTCY/.test(n.text)).slice(0, 3);
  const listings = state.stocks.length;
  const procs = state.stocks.filter((s) => s.proc).length;

  return (
    <Desk>
      <div className={styles.wrap}>
        <h1 className={styles.h1}>the tape</h1>
        <p className={styles.sub}>
          every listing on Moorthy&apos;s side window — <b>{listings} names</b> ({procs} new this
          week). some thrive, some file for bankruptcy. pick your poison.
        </p>

        <PaperSheet tape="corners" rotation={0.15} lines="grid" className={styles.board}>
          <div className={styles.filters}>
            {(["all", "risers", "fallers", "mine"] as Filter[]).map((f) => (
              <button
                key={f}
                className={`${styles.chip} ${filter === f ? styles.chipOn : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
            <span className={styles.count}>
              <span className={`${styles.liveDot} ${live ? styles.on : ""}`} aria-hidden />
              {live ? "live" : "…"}
            </span>
          </div>

          <div className={styles.thead} aria-hidden>
            <span>tape</span>
            <span>last</span>
            <span>day</span>
            <span>sketch</span>
          </div>

          <div className={styles.rows}>
            {rows.map(({ s, pct, mine }) => (
              <button
                key={s.sym}
                className={`${styles.row} ${s.haltSteps > 0 ? styles.halted : ""}`}
                onClick={() => {
                  handOff(s.sym);
                  router.push("/");
                }}
                aria-label={`trade ${s.sym} on the floor`}
              >
                <span className={styles.idBox}>
                  <b className={styles.sym}>{s.sym}</b>
                  <span className={styles.name}>{s.name}</span>
                  <span className={styles.subLine}>
                    {mine ? <em className={styles.own}>· yours</em> : null}
                    {s.proc ? <em className={styles.procTag}>· new listing</em> : null}
                    <em className={styles.volWord}>{volWord(s)}</em>
                  </span>
                </span>
                <span className={styles.price}>${s.price.toFixed(2)}</span>
                <span className={`${styles.pct} ${pct >= 0 ? styles.up : styles.down}`}>
                  {pct >= 0 ? <ArrowUp /> : <ArrowDown />} {Math.abs(pct).toFixed(1)}%
                </span>
                <span className={styles.spark}>
                  <PaperChart data={s.hist} spark height={30} />
                </span>
              </button>
            ))}
            {rows.length === 0 && (
              <div className={styles.empty}>nothing matches that filter — the tape is quiet.</div>
            )}
          </div>
          <div className={styles.foot}>
            tap any name → it lands on the trading desk · HALTED = circuit breaker or bankruptcy
            freeze · “new listing” names can bankrupt: shares get voided
          </div>
        </PaperSheet>

        <div className={styles.two}>
          <PaperSheet tape="pin" rotation={-0.5} className={styles.lb}>
            <h2 className={styles.h2}>
              <span className={`${styles.liveDot} ${live ? styles.on : ""}`} aria-hidden /> leaderboard{" "}
              <Hint text="Live net worth of every badged trader, straight from the server cabinet — refreshed every few seconds. What your brother does on his phone shows up here on yours.">
                top paper barons
              </Hint>
            </h2>
            {lb.length === 0 ? (
              <div className={styles.quiet}>
                no badges filed yet — put yours on (top corner) to appear.
              </div>
            ) : (
              <ol className={styles.lbList}>
                {lb.map((r, i) => (
                  <li key={r.user} className={r.user === auth?.user ? styles.me : undefined}>
                    <b className={styles.rank}>#{i + 1}</b>
                    <span className={styles.lbName}>{r.user}</span>
                    <span className={`${styles.delta} ${deltas[r.user] === 1 ? styles.up : deltas[r.user] === -1 ? styles.down : ""}`}>
                      {deltas[r.user] === 1 ? "▲" : deltas[r.user] === -1 ? "▼" : "—"}
                    </span>
                    <span className={styles.lbWorth}>{fmtMoney(r.worth)}</span>
                    <span className={styles.lbDay}>day {r.day}</span>
                  </li>
                ))}
              </ol>
            )}

            <h2 className={`${styles.h2} ${styles.wireH}`}>the wire</h2>
            <div className={styles.wire}>
              {feed.length === 0 ? (
                <div className={styles.quiet}>no moves yet — be the first to make noise.</div>
              ) : (
                feed.slice(0, 7).map((f, i) => (
                  <div key={`${f.ts}-${i}`} className={styles.wireRow}>
                    <b className={styles.wireUser}>{f.user}</b>
                    <span className={styles.wireText}>{f.text}</span>
                    <span className={styles.wireAge}>{ago(f.ts)}</span>
                  </div>
                ))
              )}
            </div>
          </PaperSheet>

          <div className={styles.graveCol}>
            <h2 className={styles.h2}>the shredder</h2>
            {graveyard.length === 0 ? (
              <div className={styles.quiet}>no bankruptcies yet. the shredder is hungry, though.</div>
            ) : (
              graveyard.map((n) => (
                <StickyNote key={n.id} color="pink" rotation={(n.id % 5) - 2}>
                  {n.text}
                </StickyNote>
              ))
            )}
          </div>
        </div>
      </div>
    </Desk>
  );
}
