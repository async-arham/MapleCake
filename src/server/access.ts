import "server-only";
import { db } from "@/lib/db";
import { can, type Ability } from "@/lib/permissions";
import { AppError } from "./errors";

/**
 * The single gate for project data. A person who is not a member gets NOT_FOUND (not FORBIDDEN),
 * so the existence of other people's private projects is never revealed.
 */
export async function requireMembership(userId: string, projectId: string, ability: Ability) {
  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true },
  });
  if (!membership) throw new AppError("NOT_FOUND", "Project not found.");
  if (!can(membership.role, ability)) {
    throw new AppError("FORBIDDEN", "You do not have permission to do that in this project.");
  }
  return { project: membership.project, role: membership.role };
}

export function assertActive(project: { status: string }) {
  if (project.status === "ARCHIVED") {
    throw new AppError("CONFLICT", "This project is archived. Restore it before making changes.");
  }
}
