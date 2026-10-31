"use client";

import StickyNote from "@/components/paper-ui/StickyNote";
import type { NewsItem } from "@/lib/game";
import styles from "./NewsFeed.module.css";

const rot = (id: number) => ((id * 53) % 7) - 3;

export default function NewsFeed({ news }: { news: NewsItem[] }) {
  return (
    <div className={styles.col}>
      <h2 className={styles.h}>wall st. gossip</h2>
      <div className={styles.notes}>
        {news.slice(0, 4).map((n) => (
          <StickyNote key={`${n.id}-${n.day}-${n.time}`} color={n.tone === "good" ? "mint" : "pink"} rotation={rot(n.id)}>
            {n.text}
            <span className={styles.meta}>
              day {n.day} · {n.time} · {n.sym}
            </span>
          </StickyNote>
        ))}
        {news.length === 0 && (
          <div className={styles.quiet}>*crickets* — no gossip yet. give it a second…</div>
        )}
      </div>
    </div>
  );
}
