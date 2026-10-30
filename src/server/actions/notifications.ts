"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { dismissNotification, dismissNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notifications";
import { safely, withValues } from "./helpers";

export const markReadAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const id = String(formData.get("notificationId") ?? "");
  if (!id) return { ok: false, message: "Notification not found." };
  const result = await safely(() => markNotificationRead(user.id, id));
  if (!result.ok) return result.state;
  revalidatePath("/", "layout");
  return { ok: true };
});

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
}

export const dismissNotificationAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const id = String(formData.get("notificationId") ?? "");
  if (!id) return { ok: false, message: "Notification not found." };
  const result = await safely(() => dismissNotification(user.id, id));
  if (!result.ok) return result.state;
  revalidatePath("/", "layout");
  return { ok: true };
});

export const clearNotificationsAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const scope = formData.get("scope") === "all" ? "all" : "read";
  const result = await safely(() => dismissNotifications(user.id, scope));
  if (!result.ok) return result.state;
  revalidatePath("/", "layout");
  return { ok: true, message: result.value === 0 ? "There was nothing to clear." : `Cleared ${result.value} notification${result.value === 1 ? "" : "s"}.` };
});
