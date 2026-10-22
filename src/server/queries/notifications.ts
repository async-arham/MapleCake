import "server-only";
import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";

export function countUnread(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string, page: number) {
  const [total, items] = await Promise.all([
    db.notification.count({ where: { userId } }),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE * 2,
      take: PAGE_SIZE * 2,
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);
  return { items, total, totalPages: Math.max(1, Math.ceil(total / (PAGE_SIZE * 2))) };
}
