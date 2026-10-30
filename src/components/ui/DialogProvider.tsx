"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DuoIcon } from "./DuoIcon";
import { Modal } from "./Modal";
import ui from "./ui.module.css";

export type DialogTone = "error" | "success" | "warning" | "info";
export type DialogOptions = {
  tone?: DialogTone;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Makes the confirm button red (for deleting things). */
  danger?: boolean;
  /** Closes by itself after this many milliseconds (used for success messages). */
  autoCloseMs?: number;
};

type Item = { kind: "notify" | "confirm"; options: DialogOptions; resolve: (value: boolean) => void };
type Api = { notify: (options: DialogOptions) => Promise<void>; confirm: (options: DialogOptions) => Promise<boolean> };

const fallback: Api = {
  notify: async (o) => window.alert(`${o.title}\n${o.message ?? ""}`),
  confirm: async (o) => window.confirm(`${o.title}\n${o.message ?? ""}`),
};
const DialogContext = createContext<Api>(fallback);
export const useDialogs = () => useContext(DialogContext);

const ICON = {
  error: { name: "error-warning", tone: "red" },
  success: { name: "checkbox-circle", tone: "green" },
  warning: { name: "error-warning", tone: "yellow" },
  info: { name: "information", tone: "blue" },
} as const;

/** Shows every error, confirmation and "are you sure?" as one centred pop-up. Place once, near the root. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const handled = useRef<Item | null>(null);
  const current = queue[0];

  const push = useCallback(
    (kind: Item["kind"], options: DialogOptions) => new Promise<boolean>((resolve) => setQueue((q) => [...q, { kind, options, resolve }])),
    [],
  );
  const api = useMemo<Api>(() => ({ notify: async (o) => void (await push("notify", o)), confirm: (o) => push("confirm", o) }), [push]);

  useEffect(() => {
    if (current) setOpen(true);
  }, [current]);

  const finish = useCallback(
    (result: boolean) => {
      if (!current || handled.current === current) return;
      handled.current = current;
      setOpen(false);
      current.resolve(result);
      setTimeout(() => setQueue((q) => q.slice(1)), 230);
    },
    [current],
  );

  const autoClose = current?.options.autoCloseMs;
  useEffect(() => {
    if (!current || !open || !autoClose) return;
    const timer = setTimeout(() => finish(true), autoClose);
    return () => clearTimeout(timer);
  }, [current, open, autoClose, finish]);

  const o = current?.options;
  const tone: DialogTone = o?.tone ?? (current?.kind === "confirm" ? "warning" : "info");
  const icon = ICON[tone];

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        open={open && Boolean(current)}
        onClose={() => finish(false)}
        alert={tone === "error"}
        title={o?.title ?? ""}
        icon={current ? <DuoIcon name={icon.name} tone={icon.tone} size="3.8rem" /> : null}
        autoCloseMs={autoClose}
        actions={
          current &&
          (current.kind === "confirm" ? (
            <>
              <button type="button" data-autofocus className={`${ui.btn} ${o?.danger ? ui.danger : ui.dark}`} onClick={() => finish(true)}>
                {o?.confirmLabel ?? "Confirm"}
              </button>
              <button type="button" className={`${ui.btn} ${ui.secondary}`} onClick={() => finish(false)}>
                {o?.cancelLabel ?? "Cancel"}
              </button>
            </>
          ) : (
            <button type="button" data-autofocus className={`${ui.btn} ${ui.dark}`} onClick={() => finish(true)}>
              {o?.confirmLabel ?? "Got it"}
            </button>
          ))
        }
      >
        {o?.message}
      </Modal>
    </DialogContext.Provider>
  );
}
