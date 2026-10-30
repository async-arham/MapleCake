import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";

/** Notifications disappear from the list by themselves after this many days. */
export const VISIBLE_DAYS = 14;
const DAY_MS = 86_400_000;

/** Which notifications a person can see: not dismissed, and not older than 14 days. */
export function visibleNotifications(userId: string, now: Date = new Date()): Prisma.NotificationWhereInput {
  return { userId, dismissedAt: null, createdAt: { gte: new Date(now.getTime() - VISIBLE_DAYS * DAY_MS) } };
}

export function countUnread(userId: string) {
  return db.notification.count({ where: { ...visibleNotifications(userId), readAt: null } });
}

export async function listNotifications(userId: string, requested: number) {
  const where = visibleNotifications(userId);
  const count = await db.notification.count({ where });
  const page = Math.min(requested, Math.max(1, Math.ceil(count / (PAGE_SIZE * 2))));
  const [total, items] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE * 2,
      take: PAGE_SIZE * 2,
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);
  return { page, items, total, totalPages: Math.max(1, Math.ceil(total / (PAGE_SIZE * 2))) };
}
