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
