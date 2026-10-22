import type { ReactNode } from "react";
import styles from "./ui.module.css";

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const toneClass = tone === "error" ? styles.alertError : tone === "ok" ? styles.alertOk : styles.alertInfo;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`${styles.alert} ${toneClass}`}>
      {children}
    </p>
  );
}
