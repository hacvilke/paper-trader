"use client";

import { useState } from "react";
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

const PRICE_CHIPS: Array<[string, number]> = [
  ["bargain 2.00", 2.0],
  ["fair 3.00", 3.0],
  ["premium 4.50", 4.5],
  ["greedy 6.50", 6.5],
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
  const wire = (text: string) => {
    if (!auth) return;
    void window
      .fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: auth.user, text }),
      })
      .catch(() => {});
  };
  const [amtRaw, setAmtRaw] = useState("50");

  const f = state.factory;
  const amt = Math.max(0, Math.round(Number(amtRaw) || 0));
  const mc = machineCost(f.machines);
  const staffing = Math.round(Math.min(1, f.workers / Math.max(1, f.machines * 2)) * 100);
  const madePerDay = Math.round(f.machines * 22 * (staffing / 100) * (0.6 + f.morale / 250) * (f.morale < 25 ? 0.5 : 1));
  const pf = Math.min(2.4, Math.max(0.12, Math.pow(FACT_FAIR_PRICE / f.price, 1.35)));
  const demandPerDay = Math.round((14 + f.rep * 0.45 + f.ads * 15) * pf);
  const duesPerDay = f.workers * 2 + f.machines * 3;
  const lifeNet = Math.round((f.revenue - f.costs) * 100) / 100;
  const fold7 = state.stocks.find((x) => x.sym === "FOLD7");
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
      memo: "owner's draw — Foldville Mills № 7",
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
      payee: "Foldville Mills № 7",
      memo: "capital injection — owner",
      onSign: () => {
        dispatch({ type: "FACT_INJECT", amt });
        toast(`${fmtMoney(amt)} wired into the company till.`, "good");
      },
    });
  }

  return (
    <Desk>
      <div className={styles.wrap}>
        <h1 className={styles.h1}>the factory</h1>
        <p className={styles.sub}>
          <b>Foldville Mills № 7</b> — repossessed by Moorthy&apos;s and handed to you. make paper,
          make money, pay yourself. one business day closes at every closing bell on the trading
          floor.
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
                  <b>{f.reams} reams</b>
                </div>
                <div className={styles.stat}>
                  <span>price / ream</span>
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
                  make <b>~{madePerDay}</b>/day
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
                — the market notices greedy tags.
              </p>
              <div className={styles.chipRow}>
                {PRICE_CHIPS.map(([label, p]) => (
                  <PaperButton
                    key={label}
                    small
                    tone={f.price === p ? "blue" : "pencil"}
                    onClick={() => dispatch({ type: "FACT_PRICE", price: p })}
                  >
                    {label}
                  </PaperButton>
                ))}
              </div>
            </PaperSheet>

            <PaperSheet tape="corners" rotation={-0.6} className={styles.panel}>
              <h2 className={styles.h2}>the floor</h2>
              <div className={styles.ops}>
                <PaperButton tone="green" title={`A new machine makes ~22 reams/day at full staff. Costs ${fmtMoney(mc)}`} onClick={() => {
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
                  the founder race <em className={styles.listed}>· your mill vs the house mill</em>
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
                  you hold <b>{f.founder} founder sh</b> of FOLD7. trade either mill on the floor —
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
                      wire("rang the bell — FOLD7 went public 🔔");
                      toast("🔔 FOLD7 lists on the board — founder shares are in your portfolio!", "good");
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
