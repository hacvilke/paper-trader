"use client";

import { useEffect, useState } from "react";
import type { Dispatch } from "react";
import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperChart from "@/components/paper-ui/PaperChart";
import PaperButton from "@/components/paper-ui/PaperButton";
import ScribblePrice from "@/components/paper-ui/ScribblePrice";
import Stamp from "@/components/paper-ui/Stamp";
import Hint from "@/components/paper-ui/Hint";
import PaperConfetti from "@/components/paper-ui/PaperConfetti";
import { ArrowDown, ArrowUp } from "@/components/paper-ui/doodles";
import { useToast } from "@/lib/toast";
import { askOf, bidOf, FEE, fmtK, fmtMoney, maxShortQty, volWord } from "@/lib/game";
import type { Action, Holding, ShortPos, Slip, Stock } from "@/lib/game";
import { coinSound, sadSound, stampSound } from "@/lib/sound";
import { useAuth } from "@/lib/auth";
import styles from "./StockDetail.module.css";

export default function StockDetail({
  stock,
  holding,
  short,
  cash,
  holdVal,
  slips,
  dispatch,
}: {
  stock: Stock;
  holding?: Holding;
  short?: ShortPos;
  cash: number;
  holdVal: number;
  slips: Slip[];
  dispatch: Dispatch<Action>;
}) {
  const toast = useToast();
  const { auth } = useAuth();
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
  const [qtyRaw, setQtyRaw] = useState("10");
  const [stamp, setStamp] = useState<{ side: "BUY" | "SELL"; k: number } | null>(null);
  const [burst, setBurst] = useState(0);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipSide, setSlipSide] = useState<"BUY" | "SELL">("BUY");
  const [slipPrice, setSlipPrice] = useState("");

  const qty = Math.max(0, Math.floor(Number(qtyRaw) || 0));
  const bid = bidOf(stock);
  const ask = askOf(stock);
  const maxBuy = Math.max(0, Math.floor((cash - FEE) / ask));
  const held = holding?.qty ?? 0;
  const avg = holding?.avg ?? 0;
  const unreal = held > 0 ? (bid - avg) * held : 0;
  const halted = stock.haltSteps > 0;
  const shQty = short?.qty ?? 0;
  const shAvg = short?.avg ?? 0;
  const maxShort = maxShortQty(cash, holdVal, bid);

  // order preview
  const buyCost = qty > 0 ? qty * ask + FEE : 0;
  const sellGet = qty > 0 ? qty * bid - FEE : 0;
  const sellPnl = qty > 0 && held > 0 ? (bid - avg) * Math.min(qty, held) : 0;
  const shortGet = qty > 0 ? qty * bid - FEE : 0;
  const coverCost = qty > 0 ? qty * ask + FEE : 0;
  const coverPnl = qty > 0 && shQty > 0 ? (shAvg - ask) * Math.min(qty, shQty) : 0;

  useEffect(() => {
    if (!stamp) return;
    const t = window.setTimeout(() => setStamp(null), 1500);
    return () => window.clearTimeout(t);
  }, [stamp]);

  function doBuy() {
    if (halted) return toast("Trading is halted on this one. Breathe.", "bad");
    if (qty < 1) return toast("Write how many shares first.", "info");
    if (buyCost > cash) return toast("Not enough cash — paper isn't free.", "bad");
    dispatch({ type: "BUY", sym: stock.sym, qty });
    stampSound();
    setStamp({ side: "BUY", k: Date.now() });
    wire(`BOT ${stock.sym} ×${qty} @ ${ask.toFixed(2)}`);
    toast(`Bought ${stock.sym} ×${qty} @ ${fmtMoney(ask)} (ask)`, "good");
  }

  function doSell(n: number) {
    if (halted) return toast("Trading is halted on this one. Breathe.", "bad");
    if (n < 1) return toast("Write how many shares first.", "info");
    if (n > held) return toast("You can't sell paper you don't own.", "bad");
    const pnl = Math.round((bid - avg) * n * 100) / 100;
    dispatch({ type: "SELL", sym: stock.sym, qty: n });
    stampSound();
    setStamp({ side: "SELL", k: Date.now() });
    wire(`SOLD ${stock.sym} ×${n} @ ${bid.toFixed(2)}`);
    if (pnl > 0) {
      coinSound();
      setBurst((b) => b + 1);
      toast(`Sold ${stock.sym} ×${n} @ ${fmtMoney(bid)} — profit ${fmtMoney(pnl)}`, "good");
    } else if (pnl < 0) {
      sadSound();
      toast(`Sold ${stock.sym} ×${n} @ ${fmtMoney(bid)} — loss ${fmtMoney(-pnl)}`, "bad");
    } else {
      toast(`Sold ${stock.sym} ×${n} — exactly even. Suspicious.`, "info");
    }
  }

  function doShort() {
    if (halted) return toast("Trading is halted on this one. Breathe.", "bad");
    if (qty < 1) return toast("Write how many shares to short first.", "info");
    if (qty > maxShort)
      return toast(`Short limit is ${maxShort} sh — 25% of your assets, to keep this learnable.`, "bad");
    dispatch({ type: "SHORT", sym: stock.sym, qty });
    stampSound();
    setStamp({ side: "SELL", k: Date.now() });
    wire(`SHORTED ${stock.sym} ×${qty} @ ${bid.toFixed(2)} ↯`);
    toast(`Shorted ${stock.sym} ×${qty} @ ${fmtMoney(bid)} — you win if it drops.`, "good");
  }

  function doCover(n: number) {
    if (halted) return toast("Trading is halted on this one. Breathe.", "bad");
    if (n < 1) return toast("Write how many shares to cover first.", "info");
    if (n > shQty) return toast(`You only owe ${shQty} shares.`, "bad");
    const cost = n * ask + FEE;
    if (cost > cash)
      return toast(`Covering costs ${fmtMoney(cost)} — you're short ${fmtMoney(cost - cash)} on cash.`, "bad");
    const pnl = Math.round((shAvg - ask) * n * 100) / 100;
    dispatch({ type: "COVER", sym: stock.sym, qty: n });
    stampSound();
    setStamp({ side: "BUY", k: Date.now() });
    wire(`COVERED ${stock.sym} ×${n} @ ${ask.toFixed(2)}`);
    if (pnl > 0) {
      coinSound();
      setBurst((b) => b + 1);
      toast(`Covered ${stock.sym} ×${n} @ ${fmtMoney(ask)} — profit ${fmtMoney(pnl)}`, "good");
    } else if (pnl < 0) {
      sadSound();
      toast(`Covered ${stock.sym} ×${n} @ ${fmtMoney(ask)} — loss ${fmtMoney(-pnl)}`, "bad");
    } else {
      toast(`Covered ${stock.sym} ×${n} — exactly even. The moose blinks.`, "info");
    }
  }

  function placeSlip() {
    if (halted) return toast("Trading is halted on this one. Breathe.", "bad");
    const p = Math.round(Number(slipPrice) * 100) / 100;
    if (!(p > 0)) return toast("Write the trigger price on the slip first.", "info");
    if (qty < 1) return toast("Write how many shares first.", "info");
    if (slipSide === "BUY" && p >= ask)
      return toast(`A limit buy waits BELOW the tape — under ${fmtMoney(ask)}.`, "bad");
    if (slipSide === "SELL" && p > bid)
      return toast(`A stop-loss waits BELOW the bid — ${fmtMoney(bid)} or lower.`, "bad");
    if (slips.some((s) => s.side === slipSide))
      return toast(`You already have a ${slipSide === "BUY" ? "limit buy" : "stop"} slip on ${stock.sym}.`, "bad");
    dispatch({ type: "PLACE_SLIP", sym: stock.sym, side: slipSide, qty, price: p });
    stampSound();
    wire(`LEFT A SLIP: ${slipSide === "BUY" ? "buy" : "sell"} ${stock.sym} ×${qty} if it hits ${p.toFixed(2)}`);
    toast(
      slipSide === "BUY"
        ? `Slip pinned: buy ${qty} if the ask dips to ${fmtMoney(p)}. The clerk watches the tape.`
        : `Slip pinned: sell ${qty} if the bid sinks to ${fmtMoney(p)}. Your stop is set.`,
      "good"
    );
    setSlipOpen(false);
    setSlipPrice("");
  }

  const up = stock.price >= stock.prev;

  return (
    <PaperSheet tape="top" rotation={0.25} className={styles.sheet}>
      {stamp && (
        <div key={stamp.k} className={styles.stampWrap}>
          <Stamp text={stamp.side === "BUY" ? "BOUGHT" : "SOLD"} tone={stamp.side === "BUY" ? "green" : "red"} />
        </div>
      )}
      {halted && (
        <div className={styles.haltWrap}>
          <Stamp text="HALTED" tone="red" />
          <div className={styles.haltNote}>circuit breaker — resumes in a tick</div>
        </div>
      )}

      <div className={styles.head}>
        <span className={styles.sym}>{stock.sym}</span>
        <span className={styles.name}>{stock.name}</span>
        <span className={styles.blurb}>“{stock.blurb}”</span>
      </div>

      <div className={styles.quoteRow}>
        <ScribblePrice value={stock.price} className={styles.mid} />
        <span className={`${styles.tickArrow} ${up ? styles.good : styles.bad}`}>
          {up ? <ArrowUp /> : <ArrowDown />}
        </span>
        <span className={styles.ba}>
          <Hint text="The BID is the highest price a buyer will pay you right now. When you sell, you get the bid.">
            bid {bid.toFixed(2)}
          </Hint>
          {" · "}
          <Hint text="The ASK is the lowest price a seller will take right now. When you buy, you pay the ask. Bid < ask — that gap is the spread.">
            ask {ask.toFixed(2)}
          </Hint>
        </span>
        <span className={styles.volWord}>
          <Hint text="How much this stock is swinging at the moment. Wild stocks can make you (or lose) a lot fast.">
            {volWord(stock)}
          </Hint>
        </span>
      </div>

      <PaperChart data={stock.hist} height={160} />

      <div className={styles.ohlc}>
        <Hint text="Where the price opened when the bell rang today. The day % on the cards compares to this.">
          O {stock.dayOpen.toFixed(2)}
        </Hint>
        <span className={styles.ohHi}>H {stock.high.toFixed(2)}</span>
        <span className={styles.ohLo}>L {stock.low.toFixed(2)}</span>
        <span>
          <Hint text="Shares traded today (yours, in this game). Thin volume = your own orders move the price more.">
            vol {fmtK(stock.sessionVol)}
          </Hint>
        </span>
      </div>

      <div className={styles.posRow}>
        <div className={styles.pos}>
          <span>you own</span>
          <b>{held} sh</b>
        </div>
        <div className={styles.pos}>
          <span>
            <Hint text="The average price you actually paid (with the ask & fees baked into your cost basis).">
              avg cost
            </Hint>
          </span>
          <b>{held > 0 ? fmtMoney(avg) : "—"}</b>
        </div>
        <div className={styles.pos}>
          <span>value @ bid</span>
          <b>{fmtMoney(held * bid)}</b>
        </div>
        <div className={styles.pos}>
          <span>
            <Hint text="Profit/loss if you sold everything right now at the bid. It's only 'unrealized' until you sell — then the ink is dry.">
              unrealized
            </Hint>
          </span>
          <b className={held > 0 ? (unreal >= 0 ? styles.good : styles.bad) : undefined}>
            {held > 0 ? fmtMoney(unreal) : "—"}
          </b>
        </div>
      </div>

      <div className={styles.tradeRow}>
        <label className={styles.qtyLbl}>
          shares:
          <input
            className={styles.qty}
            type="number"
            min={0}
            max={999999}
            value={qtyRaw}
            onChange={(e) => setQtyRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doBuy();
            }}
            aria-label="number of shares"
          />
        </label>
        {[1, 10, 100].map((n) => (
          <PaperButton key={n} small tone="pencil" onClick={() => setQtyRaw(String(n))}>
            {n}
          </PaperButton>
        ))}
        <PaperButton small tone="pencil" onClick={() => setQtyRaw(String(Math.floor(maxBuy * 0.25)) || "0")}>
          25%
        </PaperButton>
        <PaperButton small tone="pencil" onClick={() => setQtyRaw(String(Math.floor(maxBuy * 0.5)) || "0")}>
          50%
        </PaperButton>
        <PaperButton small tone="pencil" title={`You can afford ${maxBuy} shares`} onClick={() => setQtyRaw(String(maxBuy))}>
          max ({maxBuy})
        </PaperButton>
      </div>

      <div className={styles.btnRow}>
        {shQty > 0 ? (
          <>
            <PaperButton tone="green" onClick={() => doCover(qty)} disabled={halted} title="buy back shares you owe">
              COVER
            </PaperButton>
            <PaperButton small tone="blue" title={`Buy back all ${shQty} shares at the ask`} onClick={() => doCover(shQty)} disabled={halted}>
              cover all ×{shQty}
            </PaperButton>
            <span className={styles.shortBadge}>
              short ×{shQty} @ {shAvg.toFixed(2)} ·{" "}
              <Hint text="You sold borrowed shares at this price. Buy them back cheaper and the difference is profit. If the price climbs instead, losses have no floor until you cover — or the bank margin-calls you.">
                P/L {fmtMoney((shAvg - stock.price) * shQty)}
              </Hint>
            </span>
          </>
        ) : (
          <>
            <PaperButton tone="green" onClick={doBuy} disabled={halted}>
              BUY
            </PaperButton>
            <PaperButton tone="red" onClick={() => doSell(qty)} disabled={halted}>
              SELL
            </PaperButton>
            {held > 0 && (
              <PaperButton small tone="blue" title={`Sell all ${held} shares at the bid`} onClick={() => doSell(held)} disabled={halted}>
                close all ×{held}
              </PaperButton>
            )}
            {held === 0 && (
              <PaperButton tone="blue" onClick={doShort} disabled={halted} title="borrow shares, sell them now, buy them back later — you profit when the price falls">
                SHORT ↯
              </PaperButton>
            )}
          </>
        )}
        <PaperButton
          small
          tone="pencil"
          title="leave a pencil order the clerk fills while you're busy: limit buy on a dip, or a stop-loss sell"
          onClick={() => {
            setSlipOpen((v) => {
              const opening = !v;
              if (opening) {
                setSlipSide(held > 0 ? "SELL" : "BUY");
                setSlipPrice((held > 0 ? bid * 0.95 : ask * 0.97).toFixed(2));
              }
              return opening;
            });
          }}
        >
          slip ✎
        </PaperButton>
      </div>

      {slipOpen && (
        <div className={styles.slipForm}>
          <div className={styles.slipHead}>
            order slip — the clerk fills it tick by tick (pocket holds 5)
          </div>
          <div className={styles.slipRow}>
            <PaperButton
              small
              tone={slipSide === "BUY" ? "green" : "pencil"}
              title={`limit buy: fills when the ask dips to your price (you pay your price or better). now ${ask.toFixed(2)}`}
              onClick={() => {
                setSlipSide("BUY");
                setSlipPrice((ask * 0.97).toFixed(2));
              }}
            >
              limit buy
            </PaperButton>
            <PaperButton
              small
              tone={slipSide === "SELL" ? "red" : "pencil"}
              title={`stop-loss: fills when the bid sinks to your price (protection while you're away). now ${bid.toFixed(2)}`}
              onClick={() => {
                setSlipSide("SELL");
                setSlipPrice((bid * 0.95).toFixed(2));
              }}
            >
              stop-loss
            </PaperButton>
            <label className={styles.qtyLbl}>
              if it hits
              <input
                className={styles.qty}
                type="number"
                min={0.01}
                step={0.01}
                value={slipPrice}
                onChange={(e) => setSlipPrice(e.target.value)}
                inputMode="decimal"
                aria-label="trigger price"
              />
            </label>
            <PaperButton small tone="green" onClick={placeSlip} disabled={halted}>
              pin ×{qty || "—"}
            </PaperButton>
          </div>
          <div className={styles.slipNote}>
            {slipSide === "BUY"
              ? `fills only when the ask reaches your price — you never overpay. fee $${FEE.toFixed(2)} at fill; needs the cash then.`
              : `fills when the bid falls to your price — your seatbelt while you're away. fee $${FEE.toFixed(2)} at fill.`}
          </div>
          {slips.length > 0 && (
            <div className={styles.slipList}>
              {slips.map((s) => (
                <span key={s.id} className={styles.slipLine}>
                  {s.side === "BUY" ? "buy" : "sell"} ×{s.qty} @ {s.price.toFixed(2)} · day {s.day}
                  <PaperButton
                    small
                    tone="red"
                    fx="x"
                    title="tear up this slip"
                    ariaLabel="tear up this slip"
                    onClick={() => {
                      dispatch({ type: "CANCEL_SLIP", id: s.id });
                      toast("Slip torn up.", "info");
                    }}
                  >
                    ✕
                  </PaperButton>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.preview}>
        {qty > 0 && !halted ? (
          shQty > 0 ? (
            qty <= shQty ? (
              <>
                cover → you&apos;d pay <b>{fmtMoney(coverCost)}</b> ({qty} × ask {ask.toFixed(2)} + $
                {FEE.toFixed(2)} fee) · cash after <b>{fmtMoney(cash - coverCost)}</b> ·{" "}
                <span className={coverPnl >= 0 ? styles.good : styles.bad}>P/L {fmtMoney(coverPnl)}</span>
              </>
            ) : (
              <span className={styles.dim}>you owe {shQty} sh — cover up to ×{shQty}</span>
            )
          ) : held > 0 && qty <= held ? (
            <>
              sell → you&apos;d get <b>{fmtMoney(sellGet)}</b> · cash after{" "}
              <b>{fmtMoney(cash + sellGet)}</b> ·{" "}
              <span className={sellPnl >= 0 ? styles.good : styles.bad}>
                P/L {fmtMoney(sellPnl)}
              </span>
            </>
          ) : held > 0 ? (
            <>
              buy → you&apos;d pay <b>{fmtMoney(buyCost)}</b> ({qty} × ask {ask.toFixed(2)} + $
              {FEE.toFixed(2)} fee) · cash after <b>{fmtMoney(cash - buyCost)}</b>
            </>
          ) : qty > maxShort ? (
            <span className={styles.dim}>
              short limit is {maxShort} sh (25% of your assets) — shorts pay out only if the price falls
            </span>
          ) : (
            <>
              short → you&apos;d receive <b>{fmtMoney(shortGet)}</b> now · you lose{" "}
              <b>${qty}</b> for every $1 the price climbs · buy-back ≈{" "}
              <b>{fmtMoney(qty * ask + FEE)}</b>
            </>
          )
        ) : (
          <span className={styles.dim}>order preview appears as you type… (Enter = buy)</span>
        )}
      </div>

      <PaperConfetti burst={burst} />
    </PaperSheet>
  );
}
