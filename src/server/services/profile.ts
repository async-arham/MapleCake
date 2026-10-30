import "server-only";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { AppError } from "../errors";
import { getOwnedProjectBuckets } from "../queries/profile";

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

function throttle(key: string) {
  const limit = rateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.allowed) throw new AppError("RATE_LIMITED", `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`);
}

const GONE = "This account no longer exists. Please sign in again.";

export async function updateProfileName(userId: string, name: string) {
  const result = await db.user.updateMany({ where: { id: userId }, data: { name } });
  if (result.count === 0) throw new AppError("NOT_FOUND", GONE);
}

export type PasswordResult = { status: "changed" } | { status: "wrong_password" };

/** The current password must be right, and the change only applies if nobody else changed it in the meantime. */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<PasswordResult> {
  const key = `pwchange:${userId}`;
  throttle(key);

  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new AppError("NOT_FOUND", GONE);
  if (!(await verifyPassword(currentPassword, user.passwordHash))) return { status: "wrong_password" };

  const passwordHash = await hashPassword(newPassword);
  const updated = await db.user.updateMany({ where: { id: userId, passwordHash: user.passwordHash }, data: { passwordHash } });
  if (updated.count === 0) throw new AppError("CONFLICT", "Your password was just changed somewhere else. Please try again.");
  resetRateLimit(key);
  return { status: "changed" };
}

export type DeleteResult = { status: "deleted" } | { status: "wrong_password" } | { status: "wrong_email" };

function blockedMessage(names: string[]) {
  const shown = names.slice(0, 3).map((n) => `“${n}”`).join(", ");
  const more = names.length > 3 ? ` and ${names.length - 3} more` : "";
  return `You still own ${names.length === 1 ? "a project" : "projects"} shared with other people: ${shown}${more}. Delete ${names.length === 1 ? "it" : "them"} or remove the other members first, then try again.`;
}

/**
 * Permanently deletes the account.
 * - Projects you own alone are deleted with you. Projects you own with other people block the deletion.
 * - Tasks you created in other people's projects stay: they are handed to that project's owner,
 *   because a task must always have a creator.
 * - Tasks assigned to you become unassigned, and your activity stays with no name attached (database rules).
 * Everything happens in one transaction, so a failure leaves the account exactly as it was.
 */
export async function deleteAccount(userId: string, password: string, confirmEmail: string): Promise<DeleteResult> {
  throttle(`acctdelete:${userId}`);

  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, passwordHash: true } });
  if (!user) return { status: "deleted" }; // already gone (for example deleted from another tab)
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) return { status: "wrong_email" };
  if (!(await verifyPassword(password, user.passwordHash))) return { status: "wrong_password" };

  const before = await getOwnedProjectBuckets(userId);
  if (before.shared.length > 0) throw new AppError("CONFLICT", blockedMessage(before.shared.map((p) => p.name)));

  try {
    await db.$transaction(
      async (tx) => {
        // someone may have joined one of your projects since the check above
        const owned = await getOwnedProjectBuckets(userId, tx);
        if (owned.shared.length > 0) throw new AppError("CONFLICT", blockedMessage(owned.shared.map((p) => p.name)));

        await tx.project.deleteMany({ where: { ownerId: userId } }); // tasks, activity, invites and alerts go with them

        const authored = await tx.task.findMany({
          where: { creatorId: userId },
          distinct: ["projectId"],
          select: { projectId: true, project: { select: { ownerId: true } } },
        });
        for (const { projectId, project } of authored) {
          await tx.task.updateMany({ where: { projectId, creatorId: userId }, data: { creatorId: project.ownerId } });
        }

        const memberships = await tx.projectMember.findMany({ where: { userId }, select: { projectId: true } });
        if (memberships.length > 0) {
          await tx.activityLog.createMany({
            data: memberships.map((m) => ({
              projectId: m.projectId,
              actorId: null,
              action: "MEMBER_REMOVED" as const,
              message: `deleted their account (${user.name})`, // the feed shows "Someone" in front of this
            })),
          });
        }

        await tx.user.delete({ where: { id: userId } });
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2025") return { status: "deleted" }; // the account vanished mid-way: the goal is reached
    if (code === "P2003") throw new AppError("CONFLICT", "Something changed while your account was being deleted. Nothing was removed. Please try again.");
    throw error;
  }
  resetRateLimit(`acctdelete:${userId}`);
  return { status: "deleted" };
}
