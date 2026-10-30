import "server-only";
import { db } from "@/lib/db";
import { ROLE_LABEL, type ProjectRole } from "@/lib/constants";
import { canAssignRole } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { assertActive, requireMembership } from "../access";
import { logActivity, notify } from "../activity";
import { AppError } from "../errors";
import { MAX_PENDING_INVITES, inviteCutoff } from "../queries/invites";

const WORD = { ACCEPTED: "accepted", DECLINED: "declined", CANCELLED: "cancelled" } as const;

/**
 * Invite a registered person to a project. Nothing changes for them until they accept:
 * they get a notification and see the invitation on their Invitations page.
 */
export async function sendInvite(actorId: string, projectId: string, email: string, role: ProjectRole) {
  const { project, role: actorRole } = await requireMembership(actorId, projectId, "member:manage");
  assertActive(project);
  if (!canAssignRole(actorRole, role)) throw new AppError("FORBIDDEN", "You can only invite people with a role lower than your own.");

  const limit = rateLimit(`invite:${actorId}`, 20, 10 * 60_000);
  if (!limit.allowed) throw new AppError("RATE_LIMITED", `You are sending invitations too quickly. Try again in ${limit.retryAfterSeconds} seconds.`);

  const [invitee, actor] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true, name: true } }),
    db.user.findUniqueOrThrow({ where: { id: actorId }, select: { name: true } }),
  ]);
  if (!invitee) throw new AppError("VALIDATION", "No Maplecake account uses that email. Ask them to create an account first, then invite them.");
  if (invitee.id === actorId) throw new AppError("VALIDATION", "You are already part of this project.");

  const member = await db.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: invitee.id } }, select: { id: true } });
  if (member) throw new AppError("CONFLICT", `${invitee.name} is already a member of this project.`);

  const now = new Date();
  const existing = await db.projectInvite.findUnique({ where: { projectId_inviteeId: { projectId, inviteeId: invitee.id } } });
  if (existing?.status === "PENDING" && existing.createdAt >= inviteCutoff(now)) {
    throw new AppError("CONFLICT", `${invitee.name} already has a pending invitation. Cancel it first if you want to change the role.`);
  }
  const pending = await db.projectInvite.count({ where: { projectId, status: "PENDING", createdAt: { gte: inviteCutoff(now) } } });
  if (pending >= MAX_PENDING_INVITES) {
    throw new AppError("CONFLICT", `This project already has ${MAX_PENDING_INVITES} pending invitations. Cancel some before sending more.`);
  }

  await db.$transaction(async (tx) => {
    await tx.projectInvite.upsert({
      where: { projectId_inviteeId: { projectId, inviteeId: invitee.id } },
      create: { projectId, inviterId: actorId, inviteeId: invitee.id, role },
      update: { inviterId: actorId, role, status: "PENDING", createdAt: now, respondedAt: null },
    });
    await logActivity(tx, { projectId, actorId, action: "MEMBER_INVITED", message: `invited ${invitee.name} as ${ROLE_LABEL[role]}` });
    await notify(tx, {
      userId: invitee.id,
      projectId,
      type: "INVITE_RECEIVED",
      message: `${actor.name} invited you to “${project.name}” as ${ROLE_LABEL[role]}.`,
    });
  });
  return { inviteeName: invitee.name };
}

/** Take back an invitation that has not been answered yet. */
export async function cancelInvite(actorId: string, projectId: string, inviteId: string) {
  const { role: actorRole } = await requireMembership(actorId, projectId, "member:manage");
  const invite = await db.projectInvite.findFirst({ where: { id: inviteId, projectId }, include: { invitee: { select: { name: true } } } });
  if (!invite) throw new AppError("NOT_FOUND", "Invitation not found.");
  if (invite.status !== "PENDING") throw new AppError("CONFLICT", `This invitation was already ${WORD[invite.status as keyof typeof WORD] ?? "answered"}.`);
  if (!canAssignRole(actorRole, invite.role)) throw new AppError("FORBIDDEN", "You can only cancel invitations for roles lower than yours.");

  await db.$transaction(async (tx) => {
    const claimed = await tx.projectInvite.updateMany({ where: { id: inviteId, status: "PENDING" }, data: { status: "CANCELLED", respondedAt: new Date() } });
    if (claimed.count === 0) throw new AppError("CONFLICT", "This invitation was just answered.");
    await logActivity(tx, { projectId, actorId, action: "INVITE_CANCELLED", message: `cancelled the invitation for ${invite.invitee.name}` });
    // remove the now-useless alert from the invitee's list
    await tx.notification.updateMany({ where: { userId: invite.inviteeId, projectId, type: "INVITE_RECEIVED", dismissedAt: null }, data: { dismissedAt: new Date() } });
  });
}

/** The invited person says yes or no. Only they can answer, and only once. */
export async function respondToInvite(userId: string, inviteId: string, accept: boolean) {
  const invite = await db.projectInvite.findFirst({
    where: { id: inviteId, inviteeId: userId }, // scoped to the invitee: nobody else can answer
    include: { project: { select: { id: true, name: true } }, invitee: { select: { name: true } } },
  });
  if (!invite) throw new AppError("NOT_FOUND", "This invitation no longer exists. The project may have been deleted.");
  if (invite.status !== "PENDING") throw new AppError("CONFLICT", `This invitation was already ${WORD[invite.status as keyof typeof WORD] ?? "answered"}.`);
  if (invite.createdAt < inviteCutoff()) throw new AppError("CONFLICT", "This invitation has expired. Ask for a new one.");

  const { project } = invite;
  const now = new Date();
  const closeAlert = (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) =>
    tx.notification.updateMany({ where: { userId, projectId: project.id, type: "INVITE_RECEIVED", dismissedAt: null }, data: { dismissedAt: now } });

  if (!accept) {
    await db.$transaction(async (tx) => {
      const claimed = await tx.projectInvite.updateMany({ where: { id: inviteId, status: "PENDING" }, data: { status: "DECLINED", respondedAt: now } });
      if (claimed.count === 0) throw new AppError("CONFLICT", "This invitation was just answered.");
      await logActivity(tx, { projectId: project.id, actorId: userId, action: "INVITE_DECLINED", message: `${invite.invitee.name} declined the invitation` });
      if (invite.inviterId) {
        await notify(tx, { userId: invite.inviterId, projectId: project.id, type: "INVITE_DECLINED", message: `${invite.invitee.name} declined your invitation to “${project.name}”.` });
      }
      await closeAlert(tx);
    });
    return { accepted: false, projectId: project.id, projectName: project.name };
  }

  // The sender must still be allowed to hand out this role. If they were removed or demoted since, the invitation is void.
  const sender = invite.inviterId
    ? await db.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: invite.inviterId } }, select: { role: true } })
    : null;
  if (!sender || !canAssignRole(sender.role, invite.role)) {
    await db.projectInvite.updateMany({ where: { id: inviteId, status: "PENDING" }, data: { status: "CANCELLED", respondedAt: now } });
    throw new AppError("CONFLICT", "This invitation is no longer valid because the person who sent it can no longer add people at that level.");
  }

  await db.$transaction(async (tx) => {
    const claimed = await tx.projectInvite.updateMany({ where: { id: inviteId, status: "PENDING" }, data: { status: "ACCEPTED", respondedAt: now } });
    if (claimed.count === 0) throw new AppError("CONFLICT", "This invitation was just answered.");
    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId } },
      create: { projectId: project.id, userId, role: invite.role },
      update: {}, // already a member some other way: keep the role they have
    });
    await logActivity(tx, { projectId: project.id, actorId: userId, action: "MEMBER_ADDED", message: `${invite.invitee.name} joined as ${ROLE_LABEL[invite.role]}` });
    if (invite.inviterId) {
      await notify(tx, { userId: invite.inviterId, projectId: project.id, type: "INVITE_ACCEPTED", message: `${invite.invitee.name} accepted your invitation to “${project.name}”.` });
    }
    await closeAlert(tx);
  });
  return { accepted: true, projectId: project.id, projectName: project.name };
}
