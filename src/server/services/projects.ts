import "server-only";
import { db } from "@/lib/db";
import type { ProjectInput } from "@/validation/schemas";
import { requireMembership } from "../access";
import { logActivity } from "../activity";
import { AppError } from "../errors";

export async function createProject(userId: string, input: ProjectInput) {
  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    await logActivity(tx, {
      projectId: project.id,
      actorId: userId,
      action: "PROJECT_CREATED",
      message: `created the project “${project.name}”`,
    });
    return project;
  });
}

export async function updateProject(userId: string, projectId: string, input: ProjectInput) {
  await requireMembership(userId, projectId, "project:edit");
  return db.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: { name: input.name, description: input.description },
    });
    await logActivity(tx, {
      projectId,
      actorId: userId,
      action: "PROJECT_UPDATED",
      message: "updated the project details",
    });
    return project;
  });
}

export async function setProjectArchived(userId: string, projectId: string, archived: boolean) {
  const { project } = await requireMembership(userId, projectId, "project:archive");
  if ((project.status === "ARCHIVED") === archived) return project;
  return db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: { status: archived ? "ARCHIVED" : "ACTIVE", archivedAt: archived ? new Date() : null },
    });
    await logActivity(tx, {
      projectId,
      actorId: userId,
      action: archived ? "PROJECT_ARCHIVED" : "PROJECT_RESTORED",
      message: archived ? "archived the project" : "restored the project",
    });
    return updated;
  });
}

export async function deleteProject(userId: string, projectId: string, confirmName: string) {
  const { project } = await requireMembership(userId, projectId, "project:delete");
  if (confirmName.trim() !== project.name) {
    throw new AppError("VALIDATION", "The name you typed does not match the project name.");
  }
  await db.project.delete({ where: { id: projectId } });
}
