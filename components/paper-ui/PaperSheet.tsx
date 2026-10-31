import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PaperSheet.module.css";

type TapeKind = "top" | "corners" | "clip" | "pin" | "none";
type LinesKind = "plain" | "ruled" | "grid";

function Clip({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 52" aria-hidden>
      <path
        d="M9 14 v22 a5 5 0 0 0 10 0 V10 a7.5 7.5 0 0 0 -15 0 v26 a11 11 0 0 0 22 0 V13"
        fill="none"
        stroke="#8f979f"
        strokeWidth="2.7"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,.3))" }}
      />
    </svg>
  );
}

/**
 * Deterministic torn bottom edge — a jittered clip-path polygon.
 * (Seeded, so server & client render the exact same rip.)
 * Best paired with tape="none": the clip removes anything overhanging.
 */
function tornClipPath(seed: number): string {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 233280 + 8107) % 2147483647;
    return (s % 10000) / 10000;
  };
  const pts: string[] = ["0% 0%", "100% 0%", "100% 94%"];
  let x = 100;
  let guard = 0;
  while (x > 0 && guard++ < 60) {
    x -= 2 + rnd() * 5.5;
    if (x < 0) x = 0;
    const y = 88 + rnd() * 10;
    pts.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }
  pts.push("0% 92%");
  return `polygon(${pts.join(",")})`;
}

/**
 * PaperSheet — the base "sheet of paper" every panel is drawn on.
 * Fiber grain + mottling + aged edge burn, layered shadows, and
 * optional tape / clip / pin attachments, ruled or graph lines,
 * and a torn bottom edge (`torn` — like a page ripped from a pad).
 */
export default function PaperSheet({
  children,
  className = "",
  rotation = 0,
  tape = "none",
  lines = "plain",
  hover = false,
  drop = 0,
  torn = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  rotation?: number;
  tape?: TapeKind;
  lines?: LinesKind;
  hover?: boolean;
  drop?: number;
  torn?: boolean;
  style?: CSSProperties;
}) {
  const seed = useMemo(
    () => Math.round(Math.abs(rotation * 1000)) + tape.length + lines.length + drop,
    [rotation, tape, lines, drop]
  );
  const clip = useMemo(() => (torn ? tornClipPath(seed) : undefined), [torn, seed]);

  const cls = [styles.sheet, styles[lines], hover ? styles.hover : "", torn ? styles.torn : "", className]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <div
      className={cls}
      style={
        {
          ...(style ?? {}),
          ...(clip ? { clipPath: clip } : {}),
          "--rot": `${rotation}deg`,
          animationDelay: `${drop}ms`,
        } as CSSProperties
      }
    >
      {tape === "top" && <span className={`${styles.tape} ${styles.tapeTop}`} aria-hidden />}
      {tape === "corners" && (
        <>
          <span className={`${styles.tape} ${styles.tapeL}`} aria-hidden />
          <span className={`${styles.tape} ${styles.tapeR}`} aria-hidden />
        </>
      )}
      {tape === "clip" && <Clip className={styles.clip} />}
      {tape === "pin" && <span className={styles.pin} aria-hidden />}
      {lines === "ruled" && <span className={styles.holes} aria-hidden />}
      {children}
    </div>
  );

  // torn sheets: the drop-shadow lives on a wrapper so the shadow
  // follows the rip instead of being clipped away
  if (torn) {
    return <div className={styles.tornWrap}>{inner}</div>;
  }
  return inner;
}
