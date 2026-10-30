"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { deleteProjectSchema, projectIdSchema, projectSchema } from "@/validation/schemas";
import { createProject, deleteProject, setProjectArchived, updateProject } from "../services/projects";
import { formToObject, fromZod, safely, withValues } from "./helpers";

export const createProjectAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => createProject(user.id, parsed.data));
  if (!result.ok) return result.state;
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${result.value.id}`);
});

export const updateProjectAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const raw = formToObject(formData);
  const ref = projectIdSchema.safeParse(raw);
  const parsed = projectSchema.safeParse(raw);
  if (!ref.success) return { ok: false, message: "Project not found." };
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => updateProject(user.id, ref.data.projectId, parsed.data));
  if (!result.ok) return result.state;
  revalidatePath(`/projects/${ref.data.projectId}`, "layout");
  revalidatePath("/projects");
  return { ok: true, message: "Project saved." };
});

async function archive(formData: FormData, archived: boolean): Promise<ActionState> {
  const user = await requireUser();
  const ref = projectIdSchema.safeParse(formToObject(formData));
  if (!ref.success) return { ok: false, message: "Project not found." };
  const result = await safely(() => setProjectArchived(user.id, ref.data.projectId, archived));
  if (!result.ok) return result.state;
  revalidatePath(`/projects/${ref.data.projectId}`, "layout");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true, message: archived ? "Project archived." : "Project restored." };
}

export const archiveProjectAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  return archive(formData, true);
});

export const restoreProjectAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  return archive(formData, false);
});

export const deleteProjectAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = deleteProjectSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await safely(() => deleteProject(user.id, parsed.data.projectId, parsed.data.confirmName));
  if (!result.ok) return result.state;
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
});
