"use client";

import { useId, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";
import styles from "./ui.module.css";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  projectId: string;
  projectName: string;
};

/** The Delete button stays off until the exact project name has been typed. */
export function DeleteProjectForm({ action, projectId, projectName }: Props) {
  const id = useId();
  const [typed, setTyped] = useState("");
  return (
    <ActionForm action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          Type “{projectName}” to confirm
        </label>
        <input id={id} name="confirmName" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={styles.input} />
      </div>
      <div>
        <SubmitButton variant="danger" pendingLabel="Deleting..." disabled={typed.trim() !== projectName}>
          Delete project
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
