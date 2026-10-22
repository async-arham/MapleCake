import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ui.module.css";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  small?: boolean;
  disabled?: boolean;
};

export function LinkButton({ href, children, variant = "primary", small, disabled }: Props) {
  return (
    <Link
      href={href}
      aria-disabled={disabled || undefined}
      className={`${styles.btn} ${styles[variant]} ${small ? styles.sm : ""} ${disabled ? styles.disabledLink : ""}`}
    >
      {children}
    </Link>
  );
}
