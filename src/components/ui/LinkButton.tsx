import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ui.module.css";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "dark";
  small?: boolean;
  large?: boolean;
  disabled?: boolean;
  /** Remix icon class shown before the label, e.g. "ri-add-line". */
  icon?: string;
  /** Remix icon class shown after the label, e.g. "ri-arrow-right-line". */
  iconAfter?: string;
};

export function LinkButton({ href, children, variant = "primary", small, large, disabled, icon, iconAfter }: Props) {
  return (
    <Link
      href={href}
      aria-disabled={disabled || undefined}
      className={`${styles.btn} ${styles[variant]} ${small ? styles.sm : ""} ${large ? styles.lg : ""} ${disabled ? styles.disabledLink : ""}`}
    >
      {icon && <i className={icon} aria-hidden="true" />}
      {children}
      {iconAfter && <i className={iconAfter} aria-hidden="true" />}
    </Link>
  );
}
