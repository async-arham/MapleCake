import styles from "./ui.module.css";

type Tone = "yellow" | "red" | "green" | "blue" | "purple" | "grey";

/**
 * A two-tone icon: the filled Remix icon in colour, with the outline version on top in ink.
 * `name` is the icon name without "ri-" and without "-line"/"-fill", e.g. "lock" or "shopping-bag-3".
 */
export function DuoIcon({ name, size = "1.5rem", tone = "yellow", className = "" }: { name: string; size?: string; tone?: Tone; className?: string }) {
  return (
    <span className={`${styles.duo} ${styles[`duo_${tone}`]} ${className}`} style={{ fontSize: size }} aria-hidden="true">
      <i className={`ri-${name}-fill ${styles.duoFill}`} />
      <i className={`ri-${name}-line ${styles.duoLine}`} />
    </span>
  );
}
