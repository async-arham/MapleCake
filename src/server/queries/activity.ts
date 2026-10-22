import "server-only";
import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";

export async function listActivity(projectId: string, page: number) {
  const [total, items] = await Promise.all([
    db.activityLog.count({ where: { projectId } }),
    db.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE * 2,
      take: PAGE_SIZE * 2,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  return { items, total, totalPages: Math.max(1, Math.ceil(total / (PAGE_SIZE * 2))) };
}
