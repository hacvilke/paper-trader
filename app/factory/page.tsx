"use client";

import { useEffect, useState } from "react";
import Desk from "@/components/paper-ui/Desk";
import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperChart from "@/components/paper-ui/PaperChart";
import PaperButton from "@/components/paper-ui/PaperButton";
import Hint from "@/components/paper-ui/Hint";
import StickyNote from "@/components/paper-ui/StickyNote";
import { useToast } from "@/lib/toast";
import { useChecks } from "@/lib/checks";
import { useMarket } from "@/lib/market";
import { useAuth } from "@/lib/auth";
import { INDUSTRIES, MANAGERS, industryOf, symFromName } from "@/lib/game";
import {
  FACT_ADVERT_COST,
  FACT_BONUS_PER_WORKER,
  FACT_FAIR_PRICE,
  FACT_FIRE_FEE,
  FACT_HIRE_FEE,
  FOUNDER_SHARES,
  IPO_DAY,
  IPO_PROFIT,
  factAvgNet,
  fairSharePrice,
  fmtMoney,
  ipoReady,
  machineCost,
  priceWord,
} from "@/lib/game";
import styles from "./page.module.css";

const priceChips = (fair: number): Array<[string, number]> => [
  ["bargain", Math.round(fair * 0.66 * 100) / 100],
  ["fair", fair],
  ["premium", Math.round(fair * 1.5 * 100) / 100],
  ["greedy", Math.round(fair * 2.2 * 100) / 100],
];

function Gauge({
  label,
  value,
  cls,
  hint,
}: {
  label: string;
  value: number;
  cls: string;
  hint: string;
}) {
  return (
    <div className={styles.gauge}>
      <span className={styles.gaugeLbl}>
        <Hint text={hint}>{label}</Hint>
      </span>
      <span className={styles.gaugeBar}>
        <span className={`${styles.gaugeFill} ${cls}`} style={{ width: `${Math.round(value)}%` }} />
      </span>
      <b className={styles.gaugeVal}>{Math.round(value)}</b>
    </div>
  );
}

export default function FactoryPage() {
  const { state, dispatch } = useMarket();
  const toast = useToast();
  const showCheck = useChecks();
  const { auth } = useAuth();
  const [floatHeld, setFloatHeld] = useState(0);
  useEffect(() => {
    if (!state.factory?.listed) return;
    let stop = false;
    const load = () =>
      document.hidden
        ? Promise.resolve()
        : window
        .fetch(`/api/owners?sym=${state.factory.sym}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!stop)
            setFloatHeld(
              (d.rows ?? [])
                .filter((r: { user: string }) => r.user !== auth?.user)
                .reduce((a: number, r: { qty: number }) => a + r.qty, 0)
            );
        })
        .catch(() => {});
    load();
    const iv = window.setInterval(load, 10000);
    return () => {
      stop = true;
      window.clearInterval(iv);
    };
  }, [state.factory?.listed, state.factory?.sym, auth?.user]);
  const wire = (text: string) => {
    if (!auth) return;
    void window
      .fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: auth.user, text, token: auth.token }),
      })
      .catch(() => {});
  };
  const [amtRaw, setAmtRaw] = useState("50");
  const [bizName, setBizName] = useState("");
  const [bizErr, setBizErr] = useState<string | null>(null);
  const [founding, setFounding] = useState(false);
  const [indPick, setIndPick] = useState<string>("paper");
  const [offers] = useState<string[]>(() => {
    const ids = INDUSTRIES.map((i) => i.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, 3);
  });

  const f = state.factory;
  const proposedSym = bizName.trim().length >= 3 ? symFromName(bizName) : "";
  const amt = Math.max(0, Math.round(Number(amtRaw) || 0));
  const mc = machineCost(f);
  const ind = industryOf(f);
  const staffing = Math.round(Math.min(1, f.workers / Math.max(1, f.machines * 2)) * 100);
  const madePerDay = Math.round(f.machines * 22 * (staffing / 100) * (0.6 + f.morale / 250) * (f.morale < 25 ? 0.5 : 1));
  const pf = Math.min(2.4, Math.max(0.12, Math.pow(FACT_FAIR_PRICE / f.price, 1.35)));
  const demandPerDay = Math.round((14 + f.rep * 0.45 + f.ads * 15) * pf);
  const duesPerDay = f.workers * 2 + f.machines * 3;
  const lifeNet = Math.round((f.revenue - f.costs) * 100) / 100;
  const fold7 = state.stocks.find((x) => x.sym === f.sym);
  const smud = state.stocks.find((x) => x.sym === "SMUD");
  const ipoPx = f.ipoPrice || (fold7?.price ?? 1);
  const youPct = fold7 ? (fold7.price / ipoPx - 1) * 100 : 0;
  const smudPct = smud ? (smud.price / ipoPx - 1) * 100 : 0;
  const edge = youPct - smudPct;
  const netPerDay = Math.min(f.reams + madePerDay, demandPerDay) * f.price - duesPerDay;

  function payMe() {
    if (amt < 1) return toast("Write an amount first.", "info");
    if (amt > f.cash) return toast(`The till only has ${fmtMoney(f.cash)}.`, "bad");
    showCheck({
      kind: "reward",
      amount: amt,
      day: f.day,
      payee: "You — the desk",
      memo: `owner's draw — ${f.name}`,
      onSign: () => {
        dispatch({ type: "FACT_PAY_ME", amt });
        toast(`${fmtMoney(amt)} moved from the till to your desk.`, "good");
      },
    });
  }

  function inject() {
    if (amt < 1) return toast("Write an amount first.", "info");
    if (amt > state.cash) return toast(`Your desk only has ${fmtMoney(state.cash)}.`, "bad");
    showCheck({
      kind: "pay",
      amount: amt,
      day: f.day,
      payee: f.name,
      memo: "capital injection — owner",
      onSign: () => {
        dispatch({ type: "FACT_INJECT", amt });
        toast(`${fmtMoney(amt)} wired into the company till.`, "good");
      },
    });
  }

  async function foundCompany() {
    const name = bizName.trim();
    if (name.length < 3) return setBizErr("give it a real name (3+ letters).");
    if (!proposedSym) return setBizErr("ticker could not be derived.");
    setFounding(true);
    setBizErr(null);
    let taken = false;
    try {
      const chk = await window.fetch(`/api/biz?sym=${proposedSym}`).then((r) => r.json());
      taken = !!chk.taken;
    } catch {
      /* offline: register best-effort below */
    }
    if (!taken && auth) {
      try {
        const r = await window.fetch("/api/biz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sym: proposedSym, user: auth.user, name }),
        });
        if (!r.ok) taken = true;
      } catch {
        /* offline — local world still gets the name */
      }
    }
    setFounding(false);
    if (taken) {
      setBizErr(`ticker ${proposedSym} is already listed — tweak the name.`);
      return;
    }
    dispatch({ type: "FOUND_BIZ", name, sym: proposedSym, ind: indPick });
    toast("\U0001F3ED " + name + " (" + proposedSym + ") founded. The moose stamps the papers.", "good");
  }

  const suggested = ["Smudge & Sons", "Quillhammer Pulp", "Fiberville Works", "Paper Palace Ltd", "Crisp Ream Co"];

  if (!f.founded) {
    return (
      <Desk>
        <div className={styles.wrap}>
          <h1 className={styles.h1}>the factory</h1>
          <p className={styles.sub}>
            Moorthy&apos;s has an empty mill hall with your name on the lease — literally: write
            your company into existence. every trader founds their own; tickers are reserved
            globally, so no two barons share a listing.
          </p>
          <PaperSheet tape="top" rotation={-0.4} className={styles.panel} lines="ruled">
            <h2 className={styles.h2}>certificate of incorporation ✎</h2>
            <label className={styles.foundLbl}>
              company name
              <input
                className={styles.foundIn}
                value={bizName}
                onChange={(e) => {
                  setBizName(e.target.value.slice(0, 32));
                  setBizErr(null);
                }}
                placeholder="Quillhammer Pulp"
                maxLength={32}
              />
            </label>
            <div className={styles.symPreview}>
              {proposedSym ? (
                <>
                  ticker on the board: <b>{proposedSym}</b>
                </>
              ) : (
                <span className={styles.dim}>type a name to see your ticker…</span>
              )}
            </div>
            <div className={styles.indLabel}>pick your trade — three offers, one desk:</div>
            <div className={styles.indRow}>
              {offers.map((id) => {
                const it = INDUSTRIES.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    className={`${styles.indCard} ${indPick === id ? styles.indOn : ""}`}
                    onClick={() => setIndPick(id)}
                  >
                    <b>{it.label}</b>
                    <span className={styles.indBlurb}>{it.blurb}</span>
                    <span className={styles.indNums}>
                      ${it.fair.toFixed(2)}/{it.unit.slice(0, 4)} · wage ${it.wage.toFixed(2)} · {it.out}/day
                    </span>
                  </button>
                );
              })}
            </div>
            {bizErr && <div className={styles.warn}>✗ {bizErr}</div>}
            <div className={styles.btnsRow}>
              <PaperButton tone="green" disabled={founding} onClick={foundCompany}>
                found the company
              </PaperButton>
              <PaperButton
                small
                tone="pencil"
                onClick={() => setBizName(suggested[Math.floor(Math.random() * suggested.length)])}
              >
                suggest a name
              </PaperButton>
            </div>
            <div className={styles.lifetime}>
              founding kit: $150 cash · 40 reams · 1 machine · 2 workers · Moorthy&apos;s keeps the
              deed until you IPO.
            </div>
          </PaperSheet>
        </div>
      </Desk>
    );
  }

  return (
    <Desk>
      <div className={styles.wrap}>
        <h1 className={styles.h1}>the factory</h1>
        <p className={styles.sub}>
          <b>{f.name}</b> ({f.sym}) — founded by you, deeded by Moorthy&apos;s. make paper, make
          money, pay yourself. one business day closes at every closing bell on the trading floor.
        </p>

        <div className={styles.cols}>
          <div className={styles.leftCol}>
            <PaperSheet tape="clip" rotation={-0.3} lines="grid" className={styles.panel}>
              <div className={styles.statRow}>
                <div className={styles.stat}>
                  <span>till</span>
                  <b>{fmtMoney(f.cash)}</b>
                </div>
                <div className={styles.stat}>
                  <span>
                    <Hint text="Finished reams waiting to be sold. Making more than you sell piles this up — cash tied in cardboard.">
                      inventory
                    </Hint>
                  </span>
                  <b>{f.reams} {ind.unit}</b>
                </div>
                <div className={styles.stat}>
                  <span>price / {ind.unit.replace(/s$/, "")}</span>
                  <b>
                    ${f.price.toFixed(2)}{" "}
                    <em className={`${styles.pw} ${styles["pw" + priceWord(f.price)]}`}>{priceWord(f.price)}</em>
                  </b>
                </div>
                <div className={styles.stat}>
                  <span>business day</span>
                  <b>{f.day}</b>
                </div>
              </div>

              <div className={styles.gauges}>
                <Gauge
                  label="morale"
                  value={f.morale}
                  cls={f.morale >= 55 ? styles.gGood : f.morale >= 25 ? styles.gMid : styles.gBad}
                  hint="Happy workers make more paper. Below 25 they strike (half speed). Pay bonuses, avoid missed payroll."
                />
                <Gauge
                  label="reputation"
                  value={f.rep}
                  cls={f.rep >= 55 ? styles.gGood : f.rep >= 25 ? styles.gMid : styles.gBad}
                  hint="Rep drives demand. Sellouts raise it, greedy prices and missed payroll lower it."
                />
              </div>

              <div className={styles.flowRow}>
                <span>
                  make <b>~{madePerDay}</b> {ind.unit}/day
                </span>
                <span>
                  demand <b>~{demandPerDay}</b>/day {f.ads > 0 && <em className={styles.adsOn}>· ads {f.ads}d</em>}
                </span>
                <span>
                  staffing <b>{staffing}%</b>
                </span>
                <span>
                  bills <b>{fmtMoney(duesPerDay)}</b>/day
                </span>
                <span className={netPerDay >= 0 ? styles.pos : styles.neg}>
                  ≈ <b>{fmtMoney(netPerDay)}</b>/day
                </span>
              </div>
            </PaperSheet>

            <PaperSheet tape="pin" rotation={0.4} className={styles.panel}>
              <h2 className={styles.h2}>price tag</h2>
              <p className={styles.noteText}>
                <Hint text="Around $3.00 is what a ream fairly goes for. Underprice and you sell out but earn peanuts. Overprice and reams gather dust — and your reputation slides.">
                  paper is a commodity
                </Hint>{" "}
                — the market notices greedy tags (fair here ≈ ${ind.fair.toFixed(2)}).
              </p>
              <div className={styles.chipRow}>
                {priceChips(ind.fair).map(([label, p]) => (
                  <PaperButton
                    key={label}
                    small
                    tone={f.price === p ? "blue" : "pencil"}
                    onClick={() => dispatch({ type: "FACT_PRICE", price: p })}
                  >
                    {label} {p.toFixed(2)}
                  </PaperButton>
                ))}
              </div>
            </PaperSheet>

            <PaperSheet tape="corners" rotation={-0.6} className={styles.panel}>
              <h2 className={styles.h2}>the floor</h2>
              <div className={styles.ops}>
                <PaperButton tone="green" title={`A new machine makes ~${ind.out} ${ind.unit}/day at full staff. Costs ${fmtMoney(mc)}`} onClick={() => {
                  if (f.cash < mc) return toast(`A machine costs ${fmtMoney(mc)} — the till has ${fmtMoney(f.cash)}.`, "bad");
                  dispatch({ type: "FACT_MACHINE" });
                  toast(`Machine № ${f.machines + 1} installed. It hums.`, "good");
                }}>
                  + machine ({fmtMoney(mc)})
                </PaperButton>
                <PaperButton small tone="pencil" title="wages $2/day each" onClick={() => {
                  if (f.cash < FACT_HIRE_FEE) return toast(`Hiring desk fee is ${fmtMoney(FACT_HIRE_FEE)}.`, "bad");
                  if (f.workers >= f.machines * 4 + 2) return toast("Not enough machines for more hands.", "info");
                  dispatch({ type: "FACT_HIRE" });
                  toast("New hire signed the paper (obviously).", "good");
                }}>
                  + hire ({f.workers})
                </PaperButton>
                <PaperButton small tone="pencil" title={`Severance ${fmtMoney(FACT_FIRE_FEE)}, morale −8`} onClick={() => {
                  if (f.workers < 1) return toast("Nobody left to let go.", "info");
                  dispatch({ type: "FACT_FIRE" });
                  toast("The desk is quieter. Everyone noticed.", "info");
                }}>
                  − let go
                </PaperButton>
                <PaperButton small tone="blue" title={`$${FACT_BONUS_PER_WORKER} per worker, morale +12`} onClick={() => {
                  const c = f.workers * FACT_BONUS_PER_WORKER;
                  if (f.workers < 1) return toast("Hire someone first.", "info");
                  if (f.cash < c) return toast(`A bonus for ${f.workers} workers costs ${fmtMoney(c)}.`, "bad");
                  dispatch({ type: "FACT_BONUS" });
                  toast("Bonuses handed out in crisp envelopes. Morale up.", "good");
                }}>
                  bonus ({fmtMoney(f.workers * 4)})
                </PaperButton>
                <PaperButton small tone="blue" title={`${fmtMoney(FACT_ADVERT_COST)} → +15 demand/day for 3 days`} onClick={() => {
                  if (f.cash < FACT_ADVERT_COST) return toast(`Sticky-note ads cost ${fmtMoney(FACT_ADVERT_COST)}.`, "bad");
                  dispatch({ type: "FACT_ADVERT" });
                  toast("Sticky-note campaign plastered around town.", "good");
                }}>
                  sticky-note ads
                </PaperButton>
              </div>
              {f.morale < 25 && (
                <div className={styles.warn}>⚠ the floor is on strike — production halved until morale recovers</div>
              )}
            </PaperSheet>
          </div>

          <div className={styles.rightCol}>
            <PaperSheet tape="top" rotation={0.5} className={styles.panel}>
              <h2 className={styles.h2}>owner&apos;s desk</h2>
              <p className={styles.noteText}>
                the till and your trading desk are separate wallets — money only moves when you
                sign the paperwork.
              </p>
              <label className={styles.amtLbl}>
                $
                <input
                  className={styles.amt}
                  type="number"
                  min={0}
                  value={amtRaw}
                  onChange={(e) => setAmtRaw(e.target.value)}
                  aria-label="amount"
                />
              </label>
              <div className={styles.btnsRow}>
                <PaperButton tone="green" onClick={payMe} title="sign a check from the company to yourself">
                  pay me ✍
                </PaperButton>
                <PaperButton tone="red" onClick={inject} title="write a check from your desk to the company">
                  inject capital
                </PaperButton>
              </div>
              <div className={styles.lifetime}>
                <span>
                  lifetime revenue <b>{fmtMoney(f.revenue)}</b>
                </span>
                <span>
                  lifetime costs <b>{fmtMoney(f.costs)}</b>
                </span>
                <span>
                  reams sold <b>{f.reamsSold}</b>
                </span>
                <span>
                  mercy overdrafts <b>{f.emergencies}</b>
                </span>
              </div>
            </PaperSheet>

            <PaperSheet tape="none" torn rotation={-0.7} lines="ruled" className={styles.panel}>
              <h2 className={styles.h2}>daily profit</h2>
              <PaperChart data={f.history.length > 1 ? f.history : [0, 0]} height={92} />
              <div className={styles.legend}>
                {f.history.length > 1 ? (
                  <>
                    <span>last {f.history.length} days · ink up = profit</span>
                    <span className={(f.history[f.history.length - 1] ?? 0) >= 0 ? styles.pos : styles.neg}>
                      today {fmtMoney(f.history[f.history.length - 1] ?? 0)}
                    </span>
                  </>
                ) : (
                  <span>the first books close at the next closing bell…</span>
                )}
              </div>
            </PaperSheet>

            {f.listed && fold7 ? (
              <PaperSheet tape="top" rotation={0.6} lines="grid" className={styles.panel}>
                <h2 className={styles.h2}>
                  the founder race <em className={styles.listed}>· {f.sym} vs the house mill</em>
                </h2>
                <div className={styles.statRow}>
                  <div className={styles.stat}>
                    <span>FOLD7 you</span>
                    <b>${fold7.price.toFixed(2)} <em className={`${styles.pw} ${youPct >= smudPct ? styles.pwfair : styles.pwgreedy}`}>{youPct >= 0 ? "+" : ""}{youPct.toFixed(1)}%</em></b>
                  </div>
                  <div className={styles.stat}>
                    <span>
                      <Hint text="Smudgegate Pulp Co. — Moorthy's own mill. It listed the same morning at the same price and grinds out a steady ~0.8% a day. Beat it to prove management matters.">
                        SMUD rival
                      </Hint>
                    </span>
                    <b>${(smud?.price ?? ipoPx).toFixed(2)} <em className={`${styles.pw} ${smudPct > youPct ? styles.pwfair : styles.pwgreedy}`}>{smudPct >= 0 ? "+" : ""}{smudPct.toFixed(1)}%</em></b>
                  </div>
                  <div className={styles.stat}>
                    <span>your stake</span>
                    <b>{fmtMoney(f.founder * fold7.price)}</b>
                  </div>
                </div>
                <PaperChart data={fold7.hist} overlay={smud?.hist} height={96} />
                <div className={styles.ownership}>
                  <Hint text="Who holds your company: your founder shares vs the public float other traders bought (live from the shared cabinet). Hold more than half of all shares and you control the company — simple as that, no boardroom required.">
                    ownership
                  </Hint>
                  : you <b>60%</b> · investors hold <b>{floatHeld}</b> of 40 float sh
                </div>
                <div className={styles.verdict}>
                  {edge >= 0.5 ? (
                    <span className={styles.verdictGood}>🏆 your mill leads by {edge.toFixed(1)}% — the moose is speechless</span>
                  ) : edge <= -0.5 ? (
                    <span className={styles.verdictBad}>smudgegate leads by {(-edge).toFixed(1)}% — run the mill better, or buy their paper out of spite</span>
                  ) : (
                    <span>dead heat — {edge >= 0 ? "+" : ""}{edge.toFixed(1)}% — and the moose pretends it expected this</span>
                  )}
                </div>
                <p className={styles.noteText}>
                  you hold <b>{f.founder} founder sh</b> of {f.sym}. trade either mill on the floor —
                  and remember: fair value follows the books. profit is the engine of this race.
                </p>
              </PaperSheet>
            ) : (
              <PaperSheet tape="pin" rotation={-0.4} className={styles.panel}>
                <h2 className={styles.h2}>the big deal</h2>
                <p className={styles.noteText}>
                  Moorthy&apos;s will underwrite an <Hint text="IPO — initial public offering. You sell 40 shares of the mill to the public at a fair price (Moorthy's keeps 3% for the confetti), the till gets the cash, and you keep 60 founder shares that trade on the market board.">IPO</Hint>{" "}
                  once this place proves itself.
                </p>
                <div className={styles.check}>
                  <span>business days</span>
                  <span className={styles.checkBar}>
                    <span
                      className={`${styles.checkFill} ${f.day >= IPO_DAY ? styles.gGood : styles.gMid}`}
                      style={{ width: `${Math.min(100, (f.day / IPO_DAY) * 100)}%` }}
                    />
                  </span>
                  <b>
                    {Math.min(f.day, IPO_DAY)}/{IPO_DAY}
                  </b>
                </div>
                <div className={styles.check}>
                  <span>lifetime profit</span>
                  <span className={styles.checkBar}>
                    <span
                      className={`${styles.checkFill} ${lifeNet >= IPO_PROFIT ? styles.gGood : styles.gMid}`}
                      style={{ width: `${Math.max(0, Math.min(100, (lifeNet / IPO_PROFIT) * 100))}%` }}
                    />
                  </span>
                  <b>
                    {fmtMoney(Math.max(0, lifeNet))}/${IPO_PROFIT}
                  </b>
                </div>
                <div className={styles.btnsRow}>
                  <PaperButton
                    tone="green"
                    disabled={!ipoReady(f)}
                    title={ipoReady(f) ? "list Foldville Mills on the exchange" : "keep building — the bell rings when the books are ready"}
                    onClick={() => {
                      dispatch({ type: "FACT_IPO" });
                      wire(`rang the bell — ${f.sym} went public 🔔`);
                      // publish to the shared listing window: every trader's
                      // world lists this company on their next day roll
                      if (auth) {
                        void window
                          .fetch("/api/biz", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              sym: f.sym,
                              user: auth.user,
                              name: f.name,
                              px: fairSharePrice(f),
                              token: auth.token,
                            }),
                          })
                          .catch(() => {});
                      }
                      toast(`🔔 ${f.sym} lists on the board — founder shares are in your portfolio!`, "good");
                    }}
                  >
                    go public — ring the bell
                  </PaperButton>
                </div>
                <div className={styles.lifetime}>
                  <span>fair price today: <b>${fairSharePrice(f).toFixed(2)}/sh × 40 public sh</b> → till gets the proceeds</span>
                </div>
              </PaperSheet>
            )}

            <PaperSheet tape="pin" rotation={0.5} className={styles.mgrSheet}>
              <h2 className={styles.h2}>
                <Hint text="A manager runs the floor with you: a steady perk, a daily wage, a one-time signing bonus. One desk — one boss at a time. Boris keeps the floor running while you're away.">
                  the manager&apos;s desk
                </Hint>
              </h2>
              {(() => {
                const cur = MANAGERS.find((m) => m.id === f.mgr);
                if (cur)
                  return (
                    <div className={styles.mgrRow}>
                      <span className={styles.mgrWho}>
                        <b>{cur.name}</b> — {cur.role} · ${cur.wage}/day
                        <div className={styles.mgrBlurb}>{cur.blurb}</div>
                      </span>
                      <PaperButton
                        small
                        tone="red"
                        fx="x"
                        title={`severance $${cur.wage * 3}`}
                        onClick={() => {
                          dispatch({ type: "FIRE_MGR" });
                          wire(`${cur.name} cleared their desk at ${f.name}`);
                          toast(`${cur.name} is out. Severance paid.`, "info");
                        }}
                      >
                        fire
                      </PaperButton>
                    </div>
                  );
                return (
                  <div className={styles.mgrList}>
                    {MANAGERS.map((m) => (
                      <div key={m.id} className={styles.mgrRow}>
                        <span className={styles.mgrWho}>
                          <b>{m.name}</b> — {m.role} · ${m.wage}/day + ${m.wage * 5} signing
                          <div className={styles.mgrBlurb}>{m.blurb}</div>
                        </span>
                        <PaperButton
                          small
                          tone="green"
                          title={
                            f.cash >= m.wage * 5
                              ? "sign the contract"
                              : `the till needs $${m.wage * 5} for signing`
                          }
                          onClick={() => {
                            if (f.cash < m.wage * 5)
                              return toast(`Signing costs $${m.wage * 5} — the till is short.`, "bad");
                            dispatch({ type: "HIRE_MGR", id: m.id });
                            wire(`hired ${m.name} as ${m.role} of ${f.name}`);
                            toast(`${m.name} takes the ${m.role} desk. Welcome aboard.`, "good");
                          }}
                        >
                          hire
                        </PaperButton>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </PaperSheet>

            <div className={styles.gossip}>
              {f.news.slice(0, 3).map((n, i) => (
                <StickyNote
                  key={n.id}
                  color={n.tone === "good" ? "mint" : n.tone === "bad" ? "pink" : "blue"}
                  rotation={((i * 17) % 7) - 3}
                >
                  <span className={styles.gossipDay}>day {n.day}</span> {n.text}
                </StickyNote>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Desk>
  );
}
