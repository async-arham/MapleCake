"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import styles from "./ui.module.css";

const FormStateContext = createContext<ActionState>(initialActionState);
export const useFormState = () => useContext(FormStateContext);

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  inline?: boolean;
  className?: string;
};

/** A form that runs a Server Action, keeps its inputs, and shows errors or success messages. */
export function ActionForm({ action, children, inline = false, className }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  return (
    <FormStateContext.Provider value={state}>
      <form action={formAction} className={className ?? (inline ? styles.inlineForm : styles.form)}>
        {children}
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`${styles.alert} ${state.ok ? styles.alertOk : styles.alertError}`}
          >
            {state.message}
          </p>
        )}
      </form>
    </FormStateContext.Provider>
  );
}
