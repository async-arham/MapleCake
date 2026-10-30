import type { ReactNode } from "react";
import styles from "./ui.module.css";

const ICON = { info: "ri-information-fill", error: "ri-error-warning-fill", ok: "ri-checkbox-circle-fill" } as const;

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const toneClass = tone === "error" ? styles.alertError : tone === "ok" ? styles.alertOk : styles.alertInfo;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`${styles.alert} ${toneClass}`}>
      <i className={ICON[tone]} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
