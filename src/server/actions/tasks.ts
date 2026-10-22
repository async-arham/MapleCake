"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { moveTaskSchema, projectIdSchema, taskRefSchema, taskSchema } from "@/validation/schemas";
import { createTask, deleteTask, moveTask, updateTask } from "../services/tasks";
import { formToObject, fromZod, safely } from "./helpers";

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function createTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const raw = formToObject(formData);
  const ref = projectIdSchema.safeParse(raw);
  const parsed = taskSchema.safeParse(raw);
  if (!ref.success) return { ok: false, message: "Project not found." };
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => createTask(user.id, ref.data.projectId, parsed.data));
  if (!result.ok) return result.state;
  refresh(ref.data.projectId);
  redirect(`/projects/${ref.data.projectId}/tasks`);
}

export async function updateTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const raw = formToObject(formData);
  const ref = taskRefSchema.safeParse(raw);
  const parsed = taskSchema.safeParse(raw);
  if (!ref.success) return { ok: false, message: "Task not found." };
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => updateTask(user.id, ref.data.projectId, ref.data.taskId, parsed.data));
  if (!result.ok) return result.state;
  refresh(ref.data.projectId);
  return { ok: true, message: "Task saved." };
}

/** Used by the Kanban board (drag and drop and the "Move to" menu). */
export async function moveTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = moveTaskSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: "That move is not valid." };
  const { projectId, taskId, status } = parsed.data;
  const result = await safely(() => moveTask(user.id, projectId, taskId, status));
  if (!result.ok) return result.state;
  refresh(projectId);
  return { ok: true };
}

export async function deleteTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const ref = taskRefSchema.safeParse(formToObject(formData));
  if (!ref.success) return { ok: false, message: "Task not found." };
  const result = await safely(() => deleteTask(user.id, ref.data.projectId, ref.data.taskId));
  if (!result.ok) return result.state;
  refresh(ref.data.projectId);
  redirect(`/projects/${ref.data.projectId}/tasks`);
}
