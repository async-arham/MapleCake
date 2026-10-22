"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import styles from "./ui.module.css";

type Props = {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  small?: boolean;
  /** Ask "Are you sure?" in the browser before submitting. */
  confirm?: string;
};

export function SubmitButton({ children, pendingLabel = "Saving...", variant = "primary", small, confirm }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${styles.btn} ${styles[variant]} ${small ? styles.sm : ""}`}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
