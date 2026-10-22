import "server-only";
import { db } from "@/lib/db";
import { TASK_STATUSES } from "@/lib/constants";
import { startOfTodayUtc } from "@/lib/dates";
import { computeHealth, isOverdue, type HealthTask } from "@/lib/health";

const WEEKS = 6;
const WEEK_MS = 7 * 86_400_000;

export async function getDashboard(userId: string) {
  const now = new Date();
  const scope = { members: { some: { userId } }, status: "ACTIVE" as const };
  const projects = await db.project.findMany({ where: scope, select: { id: true, name: true } });
  const projectIds = projects.map((p) => p.id);
  const names = new Map(projects.map((p) => [p.id, p.name]));

  const weekStart = new Date(startOfTodayUtc(now).getTime() - (WEEKS - 1) * WEEK_MS);
  const [openTasks, statusCounts, recentlyDone] = await Promise.all([
    db.task.findMany({
      where: { projectId: { in: projectIds }, status: { not: "DONE" } },
      select: { id: true, title: true, projectId: true, status: true, priority: true, type: true, dueDate: true, assigneeId: true },
    }),
    db.task.groupBy({ by: ["status"], where: { projectId: { in: projectIds } }, _count: { _all: true } }),
    db.task.findMany({
      where: { projectId: { in: projectIds }, status: "DONE", completedAt: { gte: weekStart } },
      select: { completedAt: true },
    }),
  ]);

  const byProject = new Map<string, HealthTask[]>(projectIds.map((id) => [id, []]));
  for (const t of openTasks) byProject.get(t.projectId)?.push(t);
  const projectHealth = projects
    .map((p) => ({ id: p.id, name: p.name, health: computeHealth(byProject.get(p.id) ?? [], now) }))
    .sort((a, b) => a.health.score - b.health.score); // worst first

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const byStatus = TASK_STATUSES.map((status) => ({ status, count: statusMap[status] ?? 0 }));

  const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  const openByPriority = priorities.map((p) => ({ priority: p, count: openTasks.filter((t) => t.priority === p).length }));

  const weekly = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(weekStart.getTime() + i * WEEK_MS);
    const end = new Date(start.getTime() + WEEK_MS);
    const count = recentlyDone.filter((t) => t.completedAt && t.completedAt >= start && t.completedAt < end).length;
    return { start, count };
  });

  const overdueTasks = openTasks
    .filter((t) => isOverdue(t, now))
    .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime());

  const completed = statusMap.DONE ?? 0;
  const average = projectHealth.length
    ? Math.round(projectHealth.reduce((sum, p) => sum + p.health.score, 0) / projectHealth.length)
    : null;

  return {
    projectCount: projects.length,
    openCount: openTasks.length,
    completedCount: completed,
    overdueCount: overdueTasks.length,
    myOpenCount: openTasks.filter((t) => t.assigneeId === userId).length,
    averageHealth: average,
    projectHealth,
    byStatus,
    openByPriority,
    weekly,
    attention: overdueTasks.slice(0, 6).map((t) => ({ ...t, projectName: names.get(t.projectId) ?? "" })),
  };
}
