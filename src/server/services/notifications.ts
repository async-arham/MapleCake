import "server-only";
import { db } from "@/lib/db";
import { startOfTodayUtc } from "@/lib/dates";

export async function markNotificationRead(userId: string, notificationId: string) {
  // The userId in the filter means nobody can touch someone else's notification.
  await db.notification.updateMany({ where: { id: notificationId, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

/**
 * Creates one "task overdue" notification per overdue assigned task (never twice).
 * Pass a userId to do it just for that person (used on the dashboard), or nothing for everyone (cron).
 */
export async function syncOverdueNotifications(userId?: string, now: Date = new Date()) {
  const overdue = await db.task.findMany({
    where: {
      status: { not: "DONE" },
      dueDate: { lt: startOfTodayUtc(now) },
      assigneeId: userId ?? { not: null },
      project: { status: "ACTIVE" },
    },
    select: { id: true, title: true, assigneeId: true, projectId: true, project: { select: { name: true } } },
    take: 500,
  });
  if (overdue.length === 0) return 0;

  const already = await db.notification.findMany({
    where: { type: "TASK_OVERDUE", taskId: { in: overdue.map((t) => t.id) } },
    select: { taskId: true, userId: true },
  });
  const seen = new Set(already.map((n) => `${n.userId}:${n.taskId}`));
  const fresh = overdue.filter((t) => t.assigneeId && !seen.has(`${t.assigneeId}:${t.id}`));
  if (fresh.length === 0) return 0;

  await db.notification.createMany({
    data: fresh.map((t) => ({
      userId: t.assigneeId as string,
      projectId: t.projectId,
      taskId: t.id,
      type: "TASK_OVERDUE" as const,
      message: `“${t.title}” in ${t.project.name} is overdue.`,
    })),
  });
  return fresh.length;
}
