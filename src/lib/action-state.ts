export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** What the person typed (never passwords), so the form can keep it after an error. */
  values?: Record<string, string>;
  /** Changes on every submit result, so the form knows a new result arrived. */
  nonce?: number;
  /** Set on success to clear the form (e.g. after adding a member). */
  reset?: boolean;
};

export const initialActionState: ActionState = { ok: false };

/** What asking for a sign-up code reports back to the form. */
export type SendCodeState = {
  ok: boolean;
  /** Shown under the code field. */
  message?: string;
  /** Shown under the email field (invalid address, or an account already exists). */
  emailError?: string;
  /** The Resend button stays off for this long. */
  retryAfterSeconds?: number;
  /** Development only: no SMTP is set up, so the code was printed in the server terminal instead of emailed. */
  devNote?: boolean;
};
