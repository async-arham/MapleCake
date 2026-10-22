"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { markAllNotificationsRead, markNotificationRead } from "../services/notifications";
import { safely } from "./helpers";

export async function markReadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("notificationId") ?? "");
  if (!id) return { ok: false, message: "Notification not found." };
  const result = await safely(() => markNotificationRead(user.id, id));
  if (!result.ok) return result.state;
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
}
