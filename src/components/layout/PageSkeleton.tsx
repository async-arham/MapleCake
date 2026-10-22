import styles from "./skeleton.module.css";

/** Placeholder shown while a page loads its data. */
export function PageSkeleton({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      <div className={`${styles.bar} ${styles.title}`} />
      <div className={styles.grid}>
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
      </div>
    </div>
  );
}
