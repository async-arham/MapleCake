"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { addMemberSchema, cancelInviteSchema, respondInviteSchema } from "@/validation/schemas";
import { cancelInvite, respondToInvite, sendInvite } from "../services/invites";
import { formToObject, fromZod, safely, withValues } from "./helpers";

export const sendInviteAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = addMemberSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => sendInvite(user.id, parsed.data.projectId, parsed.data.email, parsed.data.role));
  if (!result.ok) return result.state;
  revalidatePath(`/projects/${parsed.data.projectId}`, "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: `Invitation sent to ${result.value.inviteeName}. Nothing changes until they accept it.`, reset: true };
});

export const cancelInviteAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = cancelInviteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: "Invitation not found." };
  const result = await safely(() => cancelInvite(user.id, parsed.data.projectId, parsed.data.inviteId));
  if (!result.ok) return result.state;
  revalidatePath(`/projects/${parsed.data.projectId}`, "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: "Invitation cancelled." };
});

export const respondInviteAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = respondInviteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: "Invitation not found." };
  const result = await safely(() => respondToInvite(user.id, parsed.data.inviteId, parsed.data.decision === "accept"));
  if (!result.ok) return result.state;
  revalidatePath("/", "layout");
  if (result.value.accepted) redirect(`/projects/${result.value.projectId}`);
  return { ok: true, message: `You declined the invitation to “${result.value.projectName}”.` };
});
