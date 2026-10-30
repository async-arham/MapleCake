"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import styles from "./dialog.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** Use for errors so screen readers announce it immediately. */
  alert?: boolean;
  autoCloseMs?: number;
  wide?: boolean;
};

/** A centred pop-up with a dimmed backdrop. Traps focus, closes on Escape or backdrop click, and animates in and out. */
export function Modal({ open, onClose, title, icon, children, actions, alert, autoCloseMs, wide }: Props) {
  const [render, setRender] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (open) {
      setRender(true);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const timer = setTimeout(() => {
      setRender(false);
      setLeaving(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !render) return;
    const previous = document.activeElement as HTMLElement | null;
    lockScroll();
    const dialog = dialogRef.current;
    (dialog?.querySelector<HTMLElement>("[data-autofocus]") ?? dialog)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab" && dialog) {
        const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([type="hidden"]), [tabindex="0"]'));
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      previous?.focus?.();
    };
  }, [open, render]);

  if (!render) return null;
  return createPortal(
    <div
      className={`${styles.backdrop} ${leaving ? styles.backdropOut : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={children ? bodyId : undefined}
        tabIndex={-1}
        className={`${styles.dialog} ${wide ? styles.wide : ""} ${leaving ? styles.dialogOut : ""}`}
      >
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          <i className="ri-close-line" aria-hidden="true" />
        </button>
        {icon && <div className={styles.iconRow}>{icon}</div>}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children && (
          <div id={bodyId} className={styles.body}>
            {children}
          </div>
        )}
        {actions && <div className={styles.actions}>{actions}</div>}
        {autoCloseMs && !leaving ? <span className={styles.timer} style={{ animationDuration: `${autoCloseMs}ms` }} /> : null}
      </div>
    </div>,
    document.body,
  );
}
