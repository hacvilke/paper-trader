"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import styles from "./Nav.module.css";

const TABS: Array<[string, string, string]> = [
  ["/", "trading floor", "floor"],
  ["/exchange", "the tape", "tape"],
  ["/factory", "the factory", "mill"],
  ["/ledger", "open ledger", "ledger"],
  ["/learn", "school desk", "school"],
];

/** Nav — manila folder tabs (desktop) / bottom bar (mobile) + your press badge. */
export default function Nav() {
  const pathname = usePathname();
  const { auth, openBadge } = useAuth();

  return (
    <>
      <nav className={styles.nav} aria-label="pages">
        {TABS.map(([href, label, short], i) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.tab} ${i % 2 ? styles.tiltR : styles.tiltL} ${active ? styles.active : ""}`}
            >
              <span className={styles.long}>{label}</span>
              <span className={styles.short}>{short}</span>
            </Link>
          );
        })}
        <span className={styles.bar} aria-hidden />
        <button
          className={`${styles.badge} ${auth ? styles.badged : ""}`}
          onClick={openBadge}
          title="your trader badge — saves & leaderboard"
        >
          {auth ? `▣ ${auth.user}` : "▣ sign in"}
        </button>
      </nav>
      <div className={styles.spacer} aria-hidden />
    </>
  );
}
