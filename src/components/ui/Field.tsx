"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useFormMeta } from "./ActionForm";
import { DatePicker } from "./DatePicker";
import { Select } from "./Select";
import styles from "./ui.module.css";

type Option = { value: string; label: string };

type Props = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "date" | "textarea" | "select";
  defaultValue?: string;
  options?: Option[];
  required?: boolean;
  hint?: string;
  autoComplete?: string;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  /** Keep the label for screen readers only (for compact inline controls). */
  labelHidden?: boolean;
  /** Called with the new text whenever the person types. */
  onValueChange?: (value: string) => void;
};

export function Field({ name, label, type = "text", defaultValue, options, required, hint, autoComplete, disabled, maxLength, placeholder, autoFocus, labelHidden, onValueChange }: Props) {
  const id = useId();
  const { state } = useFormMeta();
  const [revealed, setRevealed] = useState(false);
  // autoFocus is ignored on touch screens: it would open the on-screen keyboard over half the page before anyone has read it.
  const focused = useRef(false);
  const focusOnce = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (!element || !autoFocus || focused.current) return;
      focused.current = true;
      if (!window.matchMedia("(pointer: coarse)").matches) element.focus();
    },
    [autoFocus],
  );
  const error = state.fieldErrors?.[name];
  // After a failed submit, show what the person typed instead of the original value.
  const value = state.values?.[name] ?? defaultValue;
  // New key after each result so the input picks up the new default value.
  const key = state.nonce ?? 0;
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name,
    required,
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${styles.input} ${error ? styles.invalid : ""}`,
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={labelHidden ? "visually-hidden" : styles.label}>
        {label}
        {required && !labelHidden ? <span aria-hidden="true"> *</span> : null}
      </label>
      {type === "textarea" ? (
        <textarea key={key} ref={focusOnce} {...common} defaultValue={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onValueChange?.(e.target.value)} />
      ) : type === "select" ? (
        <Select key={key} id={id} name={name} options={options ?? []} defaultValue={value} invalid={Boolean(error)} disabled={disabled} aria-describedby={describedBy} />
      ) : type === "date" ? (
        <DatePicker key={key} id={id} name={name} defaultValue={value} invalid={Boolean(error)} disabled={disabled} aria-describedby={describedBy} />
      ) : type === "password" ? (
        <div className={styles.passwordWrap}>
          <input key={key} {...common} type={revealed ? "text" : "password"} autoComplete={autoComplete} maxLength={maxLength} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <button type="button" className={styles.reveal} aria-pressed={revealed} onClick={() => setRevealed((v) => !v)}>
            <i className={revealed ? "ri-eye-off-line" : "ri-eye-line"} aria-hidden="true" />
            <span className="visually-hidden">{revealed ? "Hide password" : "Show password"}</span>
          </button>
        </div>
      ) : (
        <input key={key} ref={focusOnce} {...common} type={type} defaultValue={value} autoComplete={autoComplete} maxLength={maxLength} placeholder={placeholder} autoCapitalize={type === "email" ? "none" : undefined} autoCorrect={type === "email" ? "off" : undefined} spellCheck={type === "email" ? false : undefined} onChange={(e) => onValueChange?.(e.target.value)} />
      )}
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className={styles.fieldError}>
          <i className="ri-error-warning-line" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
