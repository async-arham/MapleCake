"use client";

import { useRouter } from "next/navigation";
import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { useDialogs } from "./DialogProvider";
import styles from "./ui.module.css";

type Meta = { state: ActionState; dirty: boolean; requireChange: boolean };
const FormMeta = createContext<Meta>({ state: initialActionState, dirty: true, requireChange: false });
export const useFormMeta = () => useContext(FormMeta);
export const useFormState = () => useContext(FormMeta).state;

/** A text version of everything typed in the form, used to detect "has anything changed?". */
function snapshot(form: HTMLFormElement): string {
  const parts: string[] = [];
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) parts.push(`${key}\u0000${value}`);
  }
  return parts.join("\u0001");
}

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  inline?: boolean;
  className?: string;
  /** Edit forms: keep the submit button disabled until something actually changes. */
  requireChange?: boolean;
};

/**
 * A form that runs a Server Action.
 * - Mistakes in a field show under that field; every other error and every confirmation shows in a centred pop-up.
 * - It keeps what you typed after an error and moves focus to the first problem.
 * - With `requireChange`, the submit button stays off until something actually changes.
 */
export function ActionForm({ action, children, inline = false, className, requireChange = false }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const { notify, confirm } = useDialogs();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef("");
  const [dirty, setDirty] = useState(false);

  const recompute = () => {
    if (formRef.current) setDirty(snapshot(formRef.current) !== baseline.current);
  };

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (state.nonce === undefined || state.ok) baseline.current = snapshot(form);
    setDirty(snapshot(form) !== baseline.current);
    if (state.nonce === undefined) return;

    const hasFieldErrors = Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0);
    if (!state.ok && hasFieldErrors) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    } else if (!state.ok && state.message) {
      void notify({ tone: "error", title: "That didn't work", message: state.message });
    } else if (state.ok && state.message) {
      void notify({ tone: "success", title: "All done", message: state.message, autoCloseMs: 2600 });
    }
  }, [state, notify]);

  // Unsaved edits: warn when closing the tab AND when clicking any link inside the app.
  useEffect(() => {
    if (!requireChange || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const onLinkClick = async (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      const leave = await confirm({ tone: "warning", danger: true, title: "Discard your changes?", message: "You have edits that are not saved yet. If you leave now they will be lost.", confirmLabel: "Discard changes", cancelLabel: "Keep editing" });
      if (leave) {
        setDirty(false);
        router.push(url.pathname + url.search + url.hash);
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", onLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", onLinkClick, true);
    };
  }, [requireChange, dirty, confirm, router]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (isPending) {
      event.preventDefault(); // a second Enter press or click while saving must not create a duplicate
      return;
    }
    if (!navigator.onLine) {
      event.preventDefault();
      void notify({ tone: "error", title: "You appear to be offline", message: "Check your internet connection and try again. Nothing was saved." });
    }
  };

  return (
    <FormMeta.Provider value={{ state, dirty, requireChange }}>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        onInput={recompute}
        onChange={recompute}
        className={className ?? (inline ? styles.inlineForm : styles.form)}
      >
        {children}
        {state.message && (
          <noscript>
            <p className={`${styles.alert} ${state.ok ? styles.alertOk : styles.alertError}`}>{state.message}</p>
          </noscript>
        )}
      </form>
    </FormMeta.Provider>
  );
}
