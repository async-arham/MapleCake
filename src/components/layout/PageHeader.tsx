import type { ReactNode } from "react";
import styles from "./shell.module.css";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
