import styles from "./Stamp.module.css";

type Tone = "green" | "red" | "blue";

/** Stamp — an ink rubber stamp (BOUGHT / SOLD / anything). Thunks in, wobbly edges. */
export default function Stamp({
  text,
  tone = "red",
  className = "",
}: {
  text: string;
  tone?: Tone;
  className?: string;
}) {
  const cls = [styles.stamp, styles[tone], className].filter(Boolean).join(" ");
  return <span className={cls}>{text}</span>;
}
