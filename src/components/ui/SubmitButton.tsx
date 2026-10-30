"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useFormMeta } from "./ActionForm";
import { useDialogs } from "./DialogProvider";
import styles from "./ui.module.css";

type Confirm = string | { title: string; message: string; confirmLabel?: string };

type Props = {
  children: ReactNode;
  /** Read out to screen readers while saving. The button itself keeps its size and shows a spinner. */
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "dark";
  small?: boolean;
  large?: boolean;
  /** Remix icon class shown before the label, e.g. "ri-save-3-line". */
  icon?: string;
  /** Ask "Are you sure?" in a centred pop-up before submitting. */
  confirm?: Confirm;
  /** Force the button off (for example until a confirmation is typed). */
  disabled?: boolean;
};

export function SubmitButton({ children, pendingLabel = "Saving", variant = "primary", small, large, icon, confirm, disabled }: Props) {
  const { pending } = useFormStatus();
  const { dirty, requireChange } = useFormMeta();
  const { confirm: askConfirm } = useDialogs();
  const unchanged = requireChange && !dirty;

  return (
    <button
      type="submit"
      disabled={pending || unchanged || disabled}
      aria-busy={pending}
      title={unchanged ? "No changes to save" : undefined}
      className={`${styles.btn} ${styles[variant]} ${small ? styles.sm : ""} ${large ? styles.lg : ""} ${pending ? styles.pending : ""}`}
      onClick={async (event) => {
        if (!confirm) return;
        event.preventDefault();
        const button = event.currentTarget;
        const form = button.form;
        const details = typeof confirm === "string" ? { title: "Are you sure?", message: confirm } : confirm;
        const ok = await askConfirm({ tone: "warning", danger: variant === "danger", confirmLabel: details.confirmLabel ?? "Yes, continue", ...details });
        if (ok && form) form.requestSubmit(button);
      }}
    >
      <span className={styles.btnLabel}>
        {icon && <i className={icon} aria-hidden="true" />}
        {children}
      </span>
      {pending && (
        <span className={styles.spinnerWrap} aria-hidden="true">
          <span className="sb-spinner" />
        </span>
      )}
      <span className="visually-hidden" aria-live="polite">
        {pending ? `${pendingLabel}...` : ""}
      </span>
    </button>
  );
}
