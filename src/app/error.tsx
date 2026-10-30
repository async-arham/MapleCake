"use client";

import { DuoIcon } from "@/components/ui/DuoIcon";
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
      <span className={styles.icon} aria-hidden="true">
        <DuoIcon name="error-warning" tone="red" size="1em" />
      </span>
      <h1 className={styles.heading}>Something went wrong</h1>
      <p className={styles.text}>
        The page could not be loaded. Try again, and if it keeps happening, contact support
        {error.digest ? ` with reference ${error.digest}` : ""}.
      </p>
      <button type="button" className={styles.action} onClick={reset}>
        <i className="ri-refresh-line" aria-hidden="true" /> Try again
      </button>
    </main>
  );
}
