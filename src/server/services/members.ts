import "server-only";
import { db } from "@/lib/db";
import { ROLE_LABEL, type ProjectRole } from "@/lib/constants";
import { canAssignRole, canManageMember, roleRank } from "@/lib/permissions";
import { requireMembership } from "../access";
import { logActivity, notify } from "../activity";
import { AppError } from "../errors";

/**
 * Adds someone to a project immediately, with no consent step. The app never calls this from a button:
 * people are added through invitations (see services/invites.ts). It stays for tests and internal tools.
 */
export async function addMember(actorId: string, projectId: string, email: string, role: ProjectRole) {
  const { project, role: actorRole } = await requireMembership(actorId, projectId, "member:manage");
  if (!canAssignRole(actorRole, role)) {
    throw new AppError("FORBIDDEN", "You can only give roles lower than your own.");
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) {
    throw new AppError("VALIDATION", "No Maplecake account uses that email. Ask them to register first.");
  }
  const existing = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { id: true },
  });
  if (existing) throw new AppError("CONFLICT", `${user.name} is already a member of this project.`);

  await db.$transaction(async (tx) => {
    await tx.projectMember.create({ data: { projectId, userId: user.id, role } });
    await logActivity(tx, {
      projectId,
      actorId,
      action: "MEMBER_ADDED",
      message: `added ${user.name} as ${ROLE_LABEL[role]}`,
    });
    await notify(tx, {
      userId: user.id,
      projectId,
      type: "ADDED_TO_PROJECT",
      message: `You were added to “${project.name}” as ${ROLE_LABEL[role]}.`,
    });
  });
}

export async function changeMemberRole(actorId: string, projectId: string, memberId: string, role: ProjectRole) {
  const { project, role: actorRole } = await requireMembership(actorId, projectId, "member:manage");
  const target = await db.projectMember.findFirst({
    where: { id: memberId, projectId },
    include: { user: { select: { name: true } } },
  });
  if (!target) throw new AppError("NOT_FOUND", "Member not found.");
  if (target.userId === actorId) throw new AppError("FORBIDDEN", "You cannot change your own role.");
  if (!canManageMember(actorRole, target.role, role)) {
    throw new AppError("FORBIDDEN", "You can only manage people with a lower role than yours.");
  }
  await db.$transaction(async (tx) => {
    await tx.projectMember.update({ where: { id: memberId }, data: { role } });
    await logActivity(tx, {
      projectId,
      actorId,
      action: "MEMBER_ROLE_CHANGED",
      message: `changed ${target.user.name} to ${ROLE_LABEL[role]}`,
    });
    await notify(tx, {
      userId: target.userId,
      projectId,
      type: "ROLE_CHANGED",
      message: `Your role in “${project.name}” is now ${ROLE_LABEL[role]}.`,
    });
  });
}

/** Admins can remove people below them. Anyone except the owner can remove themselves (leave). */
export async function removeMember(actorId: string, projectId: string, memberId: string) {
  const { project, role: actorRole } = await requireMembership(actorId, projectId, "member:view");
  const target = await db.projectMember.findFirst({
    where: { id: memberId, projectId },
    include: { user: { select: { name: true } } },
  });
  if (!target) throw new AppError("NOT_FOUND", "Member not found.");
  if (target.role === "OWNER") throw new AppError("FORBIDDEN", "The project owner cannot be removed.");

  const isSelf = target.userId === actorId;
  if (!isSelf && !(roleRank(actorRole) > roleRank(target.role) && canManageMember(actorRole, target.role))) {
    throw new AppError("FORBIDDEN", "You can only remove people with a lower role than yours.");
  }

  await db.$transaction(async (tx) => {
    await tx.task.updateMany({ where: { projectId, assigneeId: target.userId }, data: { assigneeId: null } });
    await tx.projectMember.delete({ where: { id: memberId } });
    await logActivity(tx, {
      projectId,
      actorId,
      action: "MEMBER_REMOVED",
      message: isSelf ? `${target.user.name} left the project` : `removed ${target.user.name}`,
    });
    if (!isSelf) {
      await notify(tx, {
        userId: target.userId,
        type: "REMOVED_FROM_PROJECT",
        message: `You were removed from “${project.name}”.`,
      });
    }
  });
  return { left: isSelf };
}
