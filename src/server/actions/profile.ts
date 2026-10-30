"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { destroySession, requireUser } from "@/lib/auth/session";
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from "@/validation/schemas";
import { changePassword, deleteAccount, updateProfileName } from "../services/profile";
import { formToObject, fromZod, safely, withValues } from "./helpers";

const FIX_FIELDS = "Please fix the highlighted fields.";

export const updateProfileAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  if (parsed.data.name === user.name) return { ok: true, message: "Nothing to change." };
  const result = await safely(() => updateProfileName(user.id, parsed.data.name));
  if (!result.ok) return result.state;
  revalidatePath("/", "layout"); // the name appears in the top bar menu
  return { ok: true, message: "Profile saved." };
});

export const changePasswordAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword));
  if (!result.ok) return result.state;
  if (result.value.status === "wrong_password") {
    return { ok: false, message: FIX_FIELDS, fieldErrors: { currentPassword: "That is not your current password" } };
  }
  return { ok: true, message: "Your password was changed. Use the new one the next time you sign in.", reset: true };
});

export const deleteAccountAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => deleteAccount(user.id, parsed.data.password, parsed.data.confirmEmail));
  if (!result.ok) return result.state;
  if (result.value.status === "wrong_email") {
    return { ok: false, message: FIX_FIELDS, fieldErrors: { confirmEmail: "That is not the email on this account" } };
  }
  if (result.value.status === "wrong_password") {
    return { ok: false, message: FIX_FIELDS, fieldErrors: { password: "Incorrect password" } };
  }
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
});
