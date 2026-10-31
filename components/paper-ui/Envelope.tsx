"use client";

import styles from "./Envelope.module.css";

/**
 * Envelope — special delivery from Moorthy's: a cream envelope with a
 * wax seal. Tap it to slice it open and sign the reward check inside.
 */
export default function Envelope({
  amount,
  onOpen,
}: {
  amount: number;
  onOpen: () => void;
}) {
  return (
    <button className={styles.env} onClick={onOpen} aria-label={`Open the reward check for $${amount}`}>
      <span className={styles.flap} aria-hidden />
      <span className={styles.seal} aria-hidden>
        M
      </span>
      <span className={styles.stamp} aria-hidden>
        paper 1¢
      </span>
      <span className={styles.addr} aria-hidden>
        TO: YOU — the desk
      </span>
      <span className={styles.cta}>
        special delivery — Moorthy&apos;s sent you <b>${amount}</b>. tap to open ✎
      </span>
    </button>
  );
}
