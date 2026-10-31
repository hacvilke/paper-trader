"use client";

import Link from "next/link";
import Desk from "@/components/paper-ui/Desk";
import PaperSheet from "@/components/paper-ui/PaperSheet";
import StickyNote from "@/components/paper-ui/StickyNote";
import { STEPS } from "@/components/game/Guide";
import styles from "./page.module.css";

type Color = "yellow" | "pink" | "mint" | "blue";

const GLOSSARY: Array<[string, string, Color]> = [
  ["bid / ask", "bid = what buyers offer you; ask = what sellers demand. You sell at the bid, buy at the ask.", "yellow"],
  ["spread", "the gap between bid and ask. It's the toll booth of trading — you pay it on every round trip.", "pink"],
  ["paperwork fee", "$0.99 per order, like a real commission. Tiny trades pay proportionally more.", "mint"],
  ["market impact", "your own big orders shove the price against you. Whales make waves.", "blue"],
  ["volatility", "how violently a price swings: calm → steady → jumpy → wild. Wild pays double — both ways.", "yellow"],
  ["beta", "how strongly a stock follows the market's mood. Beta 1.4 = 40% extra swing with the tide.", "pink"],
  ["mood", "the market's weather. In panicky regimes almost everything falls together — that's correlation.", "mint"],
  ["circuit breaker", "a >8% single-tick move pauses that stock for a few ticks, so nobody faceplants mid-fall.", "blue"],
  ["PAPER 500", "all 8 stocks, equally weighted — the 'just hold everything' benchmark you're graded against.", "yellow"],
  ["realized vs unrealized", "realized = the ink is dry (you sold). unrealized = pencil (you could still lose it).", "pink"],
  ["diversification", "split cash across 3–4 companies so one faceplant doesn't sink the whole fleet.", "mint"],
  ["margin loan", "borrowing to buy more paper. Gains and losses both get bigger, and interest accrues daily.", "blue"],
  ["short selling", "borrow shares, sell them now, hope to buy them back cheaper. Profit = entry − cover price. The moose frowns when you abuse it.", "yellow"],
  ["margin call", "if a short grows past half your assets, the bank force-buys it back (dusting your holdings to pay if needed). Nobody warns you twice.", "pink"],
  ["reward checks", "some mornings Moorthy's mails a paper dividend to your desk. Sign it with your mouse-pencil to bank it.", "mint"],
  ["IPO", "initial public offering — sell 40 shares of your factory to the crowd at a fair price, keep 60 founder shares. Run the mill well and the stock follows.", "blue"],
];

export default function LearnPage() {
  return (
    <Desk>
      <div className={styles.wrap}>
        <h1 className={styles.h1}>school desk</h1>
        <p className={styles.sub}>
          everything you need to go from paper-folder to paper-baron. no jargon left unexplained.
        </p>

        <PaperSheet tape="top" rotation={-0.3} className={styles.stepsSheet}>
          <h2 className={styles.h2}>how 2 trade — the six rules</h2>
          <ol className={styles.steps}>
            {STEPS.map(([n, t]) => (
              <li key={n}>
                <b className={styles.n}>{n}</b> {t}
              </li>
            ))}
          </ol>
        </PaperSheet>

        <h2 className={styles.wall}>the glossary wall</h2>
        <div className={styles.gloss}>
          {GLOSSARY.map(([term, def, color], i) => (
            <StickyNote key={term} color={color} rotation={((i * 13) % 7) - 3}>
              <b className={styles.term}>{term}</b>
              <span className={styles.def}>{def}</span>
            </StickyNote>
          ))}
        </div>

        <div className={styles.rulesCols}>
          <PaperSheet tape="none" torn rotation={-0.8} lines="ruled" className={styles.rules}>
            <h2 className={styles.doH}>do ✓</h2>
            <ul>
              <li>spread across a few names — diversification</li>
              <li>read the order preview before you commit</li>
              <li>take some profits sometimes; realized beats imagined</li>
              <li>check the volatility word before sizing up</li>
              <li>grade yourself against the PAPER 500, not vibes</li>
              <li>short euphoric moods if you like — bubbles pop eventually</li>
            </ul>
          </PaperSheet>
          <PaperSheet tape="none" torn rotation={1.1} lines="ruled" className={styles.rules}>
            <h2 className={styles.dontH}>don&apos;t ✗</h2>
            <ul>
              <li>don&apos;t go max-size on a &lsquo;wild&rsquo; stock (hi, Cringold)</li>
              <li>don&apos;t buy 3 shares — the $0.99 fee will eat you</li>
              <li>don&apos;t panic-sell every red tick; check the mood first</li>
              <li>don&apos;t borrow until the basics feel boring</li>
              <li>don&apos;t mistake a bull mood for being a genius</li>
              <li>don&apos;t short a &lsquo;wild&rsquo; stock big — profits cap at zero, losses don&apos;t</li>
            </ul>
          </PaperSheet>
        </div>

        <div className={styles.back}>
          <Link href="/">← back to the trading floor</Link>
        </div>
      </div>
    </Desk>
  );
}
