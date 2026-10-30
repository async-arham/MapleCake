"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { ActionForm } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  email: string;
  /** Number of projects that will be deleted together with the account. */
  soloProjects: number;
};

/** The Delete button stays off until the account email has been typed, and still asks for the password. */
export function DeleteAccountForm({ action, email, soloProjects }: Props) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  return (
    <ActionForm action={action}>
      <Field name="password" label="Current password" type="password" autoComplete="current-password" required />
      <Field name="confirmEmail" label={`Type ${email} to confirm`} type="text" autoComplete="off" required onValueChange={setTyped} />
      <div>
        <SubmitButton
          variant="danger"
          icon="ri-delete-bin-6-line"
          pendingLabel="Deleting..."
          disabled={!matches}
          confirm={{
            title: "Delete your account for good?",
            message: `This cannot be undone. Your account${soloProjects > 0 ? ` and ${soloProjects} project${soloProjects === 1 ? "" : "s"} only you belong to` : ""} will be permanently deleted.`,
            confirmLabel: "Delete my account",
          }}
        >
          Delete my account
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
