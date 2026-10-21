import styles from "./state.module.css";

export default function Loading() {
  return (
    <main className={styles.state} aria-busy="true">
      <p className={styles.text} role="status">
        Loading...
      </p>
    </main>
  );
}
