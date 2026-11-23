import { useId, type CSSProperties } from "react";
import type { HealthBand } from "@/lib/health";
import styles from "./ui.module.css";

type Props = { score: number; band: HealthBand; size?: number; label?: string };

/**
 * Circular 0-100 gauge drawn with SVG. The arc sweeps in with a band-coloured gradient and a small
 * marker rides the tip of the arc while it fills. Pure CSS animation, so it needs no client JS.
 */
export function HealthGauge({ score, band, size = 96, label }: Props) {
  const gradientId = `gauge-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shown = Math.max(score, 1);
  const vars = { "--score": shown } as CSSProperties;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`${styles.gauge} ${styles[`g_${band}`]}`}
      role="img"
      aria-label={label ?? `Health score ${score} out of 100`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--g1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--g2)" }} />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="43" className={styles.gaugeDisc} />
      <circle cx="60" cy="60" r="52" strokeWidth="9" className={styles.gaugeTrack} />
      <g transform="rotate(-90 60 60)" style={vars}>
        <circle
          cx="60"
          cy="60"
          r="52"
          strokeWidth="9"
          stroke={`url(#${gradientId})`}
          className={styles.gaugeValue}
          pathLength={100}
        />
        <circle cx="112" cy="60" r="4.5" className={styles.gaugeDot} />
      </g>
      <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontSize="36" className={styles.gaugeNumber}>
        {score}
      </text>
    </svg>
  );
}
