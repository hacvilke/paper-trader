import styles from "./PaperChart.module.css";

/**
 * PaperChart — an ink line drawn on graph paper.
 * `spark` = tiny borderless sparkline. Pass `overlay` (e.g. the index
 * series) to draw a dashed pencil comparison line on the same axes —
 * both series are shown as % change from their own start.
 */
export default function PaperChart({
  data,
  overlay,
  height = 110,
  spark = false,
  className = "",
}: {
  data: number[];
  overlay?: number[];
  height?: number;
  spark?: boolean;
  className?: string;
}) {
  if (!data || data.length < 2) {
    return (
      <div className={styles.empty} style={{ height }}>
        waiting for the pen…
      </div>
    );
  }

  const W = 300;
  const H = 110;
  const pad = spark ? 3 : 10;

  const pctSeries = (arr: number[]) => {
    const base = arr[0] || 1;
    return arr.map((v) => (v / base - 1) * 100);
  };

  const main = pctSeries(data);
  const over = overlay && overlay.length > 1 ? pctSeries(overlay) : null;

  const all = over ? [...main, ...over] : main;
  // STABLE BOUNDS: snap min/max to a "nice" 1-2-5 step so ordinary
  // ticks don't redraw the whole sheet — the line only re-scales when
  // it actually crosses a gridline. (No more button-dodge on phones.)
  let min = Math.min(...all);
  let max = Math.max(...all);
  const rawStep = (max - min) / 4 || Math.abs(max) * 0.02 || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  if (max - min < 1e-9) {
    max += step;
    min -= step;
  }
  const span = max - min;

  const toPts = (arr: number[]) =>
    arr.map((v, i) => {
      const x = pad + (W - 2 * pad) * (i / (arr.length - 1));
      const y = pad + (H - 2 * pad) * (1 - (v - min) / span);
      return [x, y] as const;
    });

  const pts = toPts(main);
  const d = "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  const last = pts[pts.length - 1];
  const area = `${d} L ${last[0].toFixed(1)} ${H - pad} L ${pts[0][0].toFixed(1)} ${H - pad} Z`;
  const up = main[main.length - 1] >= 0;
  const col = up ? "var(--ink-green)" : "var(--ink-red)";

  let overPath = "";
  if (over) {
    const op = toPts(over);
    overPath = "M" + op.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  }

  const cls = [styles.wrap, spark ? "" : styles.frame, className].filter(Boolean).join(" ");

  return (
    <div className={cls} style={{ height }}>
      {!spark && <div className={styles.gridBg} aria-hidden />}
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <path d={area} fill={col} opacity={0.1} stroke="none" />
        {over && (
          <path
            d={overPath}
            fill="none"
            stroke="var(--pencil)"
            strokeWidth={1.8}
            strokeDasharray="6 5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.85}
          />
        )}
        <path
          d={d}
          fill="none"
          stroke={col}
          strokeWidth={spark ? 2.2 : 2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter="url(#rough-line)"
        />
        <circle cx={last[0]} cy={last[1]} r={spark ? 3 : 4} fill={col} filter="url(#rough-line)" />
      </svg>
      {!spark && (
        <>
          <span className={`${styles.y} ${styles.yMax}`}>{max.toFixed(1)}%</span>
          <span className={`${styles.y} ${styles.yMin}`}>{min.toFixed(1)}%</span>
        </>
      )}
    </div>
  );
}
