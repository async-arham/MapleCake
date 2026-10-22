"use client";

import { useId } from "react";
import { useFormState } from "./ActionForm";
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
};

export function Field({ name, label, type = "text", defaultValue, options, required, hint, autoComplete, disabled, maxLength, placeholder }: Props) {
  const id = useId();
  const error = useFormState().fieldErrors?.[name];
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const shared = {
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
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {type === "textarea" ? (
        <textarea {...shared} defaultValue={defaultValue} maxLength={maxLength} placeholder={placeholder} />
      ) : type === "select" ? (
        <select {...shared} defaultValue={defaultValue}>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...shared} type={type} defaultValue={defaultValue} autoComplete={autoComplete} maxLength={maxLength} placeholder={placeholder} />
      )}
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}
