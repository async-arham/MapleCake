"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { changeRoleSchema, removeMemberSchema } from "@/validation/schemas";
import { changeMemberRole, removeMember } from "../services/members";
import { formToObject, fromZod, safely, withValues } from "./helpers";

export const changeRoleAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = changeRoleSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => changeMemberRole(user.id, parsed.data.projectId, parsed.data.memberId, parsed.data.role));
  if (!result.ok) return result.state;
  revalidatePath(`/projects/${parsed.data.projectId}`, "layout");
  return { ok: true, message: "Role updated." };
});

export const removeMemberAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = removeMemberSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: "Member not found." };
  const result = await safely(() => removeMember(user.id, parsed.data.projectId, parsed.data.memberId));
  if (!result.ok) return result.state;
  revalidatePath(`/projects/${parsed.data.projectId}`, "layout");
  revalidatePath("/projects");
  if (result.value.left) redirect("/projects");
  return { ok: true, message: "Member removed." };
});
