"use client";

import styles from "./state.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.state} role="alert">
      <h1 className={styles.heading}>Something went wrong</h1>
      <p className={styles.text}>
        The page could not be loaded. Try again, and if it keeps happening, contact support
        {error.digest ? ` with reference ${error.digest}` : ""}.
      </p>
      <button type="button" className={styles.action} onClick={reset}>
        Try again
      </button>
    </main>
  );
}
