"use client";

import PaperSheet from "@/components/paper-ui/PaperSheet";
import PaperButton from "@/components/paper-ui/PaperButton";
import styles from "./Guide.module.css";

export const STEPS: Array<[string, string]> = [
  ["1.", "Pick a company card on the board. The ink line is its price, drawn live."],
  [
    "2.",
    "Buying fills you at the ask (slightly higher). Selling fills at the bid (slightly lower). That gap is the spread — the cost of trading right now.",
  ],
  ["3.", "Every order pays a $0.99 paperwork fee. Tiny trades get eaten by fees — size matters."],
  ["4.", "Big orders push prices. Try buying max shares of Cringold and watch your own footprint."],
  ["5.", "Sticky notes are news — gossip shocks prices. The market mood sways all eight stocks at once."],
  [
    "6.",
    "Your report card is the pencil line in the Portfolio: beat the PAPER 500 and you're officially good at paper.",
  ],
  [
    "7.",
    "Betting against: SHORT borrows shares and sells them — you profit if the price falls. Buy them back (COVER) to win or admit defeat. Losses on shorts have no floor, so the cap is 25% of your assets.",
  ],
];

/** Guide — the "read me first" sheet. Dismissing it crosses out the X. */
export default function Guide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <PaperSheet tape="top" rotation={-0.3} lines="ruled" className={styles.sheet}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <h2 className={styles.h}>read me first ✎ how 2 trade</h2>
          <ol className={styles.list}>
            {STEPS.map(([n, t]) => (
              <li key={n}>
                <b className={styles.n}>{n}</b> {t}
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.side}>
          <div className={styles.doodle} aria-hidden>
            <svg viewBox="0 0 120 120">
              <path
                d="M14 96 C 30 88, 34 70, 38 52 C 42 36, 52 26, 66 22 M66 22 C 58 26, 52 30, 46 32 M66 22 C 64 32, 66 40, 70 48"
                fill="none"
                stroke="var(--ink-blue)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#rough-line)"
              />
              <path
                d="M78 100 h30 M93 85 v30"
                stroke="var(--ink-red)"
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#rough-line)"
              />
            </svg>
          </div>
          <div className={styles.tip}>hover any dotted word — little notes explain the jargon.</div>
          <PaperButton tone="green" onClick={onDismiss}>
            got it, let&apos;s trade
          </PaperButton>
        </div>
      </div>
    </PaperSheet>
  );
}
