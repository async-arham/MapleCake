import "server-only";
import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";

/** Activity older than this is hidden and then deleted, so the table never grows without limit. */
export const ACTIVITY_RETENTION_DAYS = 60;

export function activityCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - ACTIVITY_RETENTION_DAYS * 86_400_000);
}

export async function listActivity(projectId: string, requested: number) {
  const where = { projectId, createdAt: { gte: activityCutoff() } };
  const count = await db.activityLog.count({ where });
  const page = Math.min(requested, Math.max(1, Math.ceil(count / (PAGE_SIZE * 2))));
  const [total, items] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE * 2,
      take: PAGE_SIZE * 2,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  return { page, items, total, totalPages: Math.max(1, Math.ceil(total / (PAGE_SIZE * 2))) };
}
