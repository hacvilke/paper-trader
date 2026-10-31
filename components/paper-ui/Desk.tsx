import styles from "./Desk.module.css";

/** The wooden desk everything is scattered on. Pure decoration. */
export default function Desk({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.desk}>
      <div className={styles.stain1} aria-hidden />
      <div className={styles.stain2} aria-hidden />
      <div className={styles.scrap1} aria-hidden />
      <div className={styles.scrap2} aria-hidden />
      <svg className={styles.pencil} viewBox="0 0 260 30" aria-hidden>
        <g transform="rotate(2 130 15)">
          <rect x="10" y="8" width="200" height="14" rx="2" fill="#e8b23a" />
          <rect x="10" y="8" width="200" height="5" fill="#f3c95d" opacity="0.75" />
          <rect x="10" y="17" width="200" height="5" fill="#b8842c" opacity="0.6" />
          <rect x="0" y="8" width="12" height="14" rx="3" fill="#d4705f" />
          <path d="M210 8 L238 15 L210 22 Z" fill="#ecd8b0" />
          <path d="M230 12.6 L238 15 L230 17.4 Z" fill="#3a3a3a" />
        </g>
      </svg>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
