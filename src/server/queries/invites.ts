import "server-only";
import { db } from "@/lib/db";

/** An invitation can be accepted for this many days, then it expires. */
export const INVITE_VALID_DAYS = 14;
export const MAX_PENDING_INVITES = 25;
const DAY_MS = 86_400_000;

export function inviteCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - INVITE_VALID_DAYS * DAY_MS);
}

const stillValid = (userField: { inviteeId: string } | { projectId: string }) => ({
  ...userField,
  status: "PENDING" as const,
  createdAt: { gte: inviteCutoff() },
});

/** Pending invitations waiting for this person. */
export function listMyInvites(userId: string) {
  return db.projectInvite.findMany({
    where: stillValid({ inviteeId: userId }),
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true, description: true } }, inviter: { select: { name: true } } },
  });
}

export function countMyInvites(userId: string) {
  return db.projectInvite.count({ where: stillValid({ inviteeId: userId }) });
}

/** Invitations a project has sent that nobody has answered yet. */
export function listProjectInvites(projectId: string) {
  return db.projectInvite.findMany({
    where: stillValid({ projectId }),
    orderBy: { createdAt: "desc" },
    include: { invitee: { select: { name: true, email: true } } },
  });
}
