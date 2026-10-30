import type { CSSProperties } from "react";
import type { HealthBand } from "@/lib/health";
import styles from "./ui.module.css";

type Props = { score: number; band: HealthBand; size?: number; label?: string };

/** Circular 0-100 gauge drawn with SVG. It fills in with an animation when it appears. */
export function HealthGauge({ score, band, size = 96, label }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={styles.gauge}
      role="img"
      aria-label={label ?? `Health score ${score} out of 100`}
    >
      <circle cx="60" cy="60" r="50" strokeWidth="11" className={styles.gaugeTrack} />
      <circle
        cx="60"
        cy="60"
        r="50"
        strokeWidth="11"
        className={`${styles.gaugeValue} ${styles[`g_${band}`]}`}
        pathLength={100}
        style={{ "--score": Math.max(score, 1) } as CSSProperties}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontSize="38" className={styles.gaugeNumber}>
        {score}
      </text>
    </svg>
  );
}
