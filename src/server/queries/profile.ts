import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient;

/**
 * The projects this person owns, split by whether anyone else is in them.
 * A project nobody else belongs to can be deleted along with the account. A shared one cannot:
 * there is no way to hand a project over yet, so the owner has to delete it or remove the others first.
 */
export async function getOwnedProjectBuckets(userId: string, client: Client = db) {
  const owned = await client.project.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { members: true } } },
  });
  return {
    solo: owned.filter((p) => p._count.members <= 1).map((p) => ({ id: p.id, name: p.name })),
    shared: owned.filter((p) => p._count.members > 1).map((p) => ({ id: p.id, name: p.name })),
  };
}

/** Everything the profile page shows next to the forms. Null if the account no longer exists. */
export async function getAccountOverview(userId: string) {
  const [user, projectCount, openAssigned, owned] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    db.projectMember.count({ where: { userId } }),
    db.task.count({ where: { assigneeId: userId, status: { not: "DONE" }, project: { status: "ACTIVE" } } }),
    getOwnedProjectBuckets(userId),
  ]);
  if (!user) return null;
  return { createdAt: user.createdAt, projectCount, openAssigned, ...owned };
}
