import type { ReactNode } from "react";
import { DuoIcon } from "./DuoIcon";
import styles from "./ui.module.css";

/** `icon` accepts "ri-rocket-2-line" style names (or just "rocket-2"). */
export function EmptyState({ title, children, action, icon = "sparkling-2" }: { title: string; children?: ReactNode; action?: ReactNode; icon?: string }) {
  const name = icon.replace(/^ri-/, "").replace(/-(line|fill)$/, "");
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <DuoIcon name={name} size="1em" />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
