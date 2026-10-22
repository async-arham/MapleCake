import type { HealthBand } from "@/lib/health";
import styles from "./ui.module.css";

type Props = { score: number; band: HealthBand; size?: number; label?: string };

/** Circular 0-100 gauge drawn with SVG. The number is also readable by screen readers. */
export function HealthGauge({ score, band, size = 96, label }: Props) {
  const stroke = 10;
  const radius = 50;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={styles.gauge}
      role="img"
      aria-label={label ?? `Health score ${score} out of 100`}
    >
      <circle cx="60" cy="60" r={radius} strokeWidth={stroke} className={styles.gaugeTrack} />
      <circle
        cx="60"
        cy="60"
        r={radius}
        strokeWidth={stroke}
        className={`${styles.gaugeValue} ${styles[`g_${band}`]}`}
        pathLength={100}
        strokeDasharray={`${Math.max(score, 1)} 100`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontSize="36" className={styles.gaugeNumber}>
        {score}
      </text>
    </svg>
  );
}
