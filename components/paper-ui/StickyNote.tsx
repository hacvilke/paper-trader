import type { ReactNode } from "react";
import styles from "./StickyNote.module.css";

type Color = "yellow" | "pink" | "mint" | "blue";

/** StickyNote — a self-sticking square of paper with a folded corner. */
export default function StickyNote({
  children,
  color = "yellow",
  rotation = -1.5,
  className = "",
}: {
  children: ReactNode;
  color?: Color;
  rotation?: number;
  className?: string;
}) {
  const cls = [styles.note, styles[color], className].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{ "--rot": `${rotation}deg` } as React.CSSProperties}>
      {children}
    </div>
  );
}
