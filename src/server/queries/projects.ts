import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";
import { isOverdue } from "@/lib/health";
import type { ProjectListQuery } from "@/validation/schemas";
import { activityCutoff } from "./activity";
import { getHealthForProjects } from "./health";

export async function listProjects(userId: string, query: ProjectListQuery) {
  const where: Prisma.ProjectWhereInput = {
    members: { some: { userId } }, // only projects this person belongs to
    ...(query.status === "all" ? {} : { status: query.status === "archived" ? "ARCHIVED" : "ACTIVE" }),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProjectOrderByWithRelationInput =
    query.sort === "name" ? { name: "asc" } : query.sort === "created" ? { createdAt: "desc" } : { updatedAt: "desc" };

  const allCount = await db.project.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(allCount / PAGE_SIZE)));
  const [total, rows] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        members: { where: { userId }, select: { role: true } },
        _count: { select: { members: true, tasks: true } },
      },
    }),
  ]);

  const health = await getHealthForProjects(rows.map((r) => r.id));
  const projects = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    updatedAt: p.updatedAt,
    memberCount: p._count.members,
    taskCount: p._count.tasks,
    role: p.members[0]?.role ?? "VIEWER",
    health: health.get(p.id)!,
  }));
  return { page, projects, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Everything the project overview page needs. Call only after access has been checked. */
export async function getProjectOverview(projectId: string) {
  const now = new Date();
  const [counts, openTasks, memberCount, recentActivity] = await Promise.all([
    db.task.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
    db.task.findMany({
      where: { projectId, status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        priority: true,
        type: true,
        dueDate: true,
        assigneeId: true,
        assignee: { select: { name: true } },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    }),
    db.projectMember.count({ where: { projectId } }),
    db.activityLog.findMany({
      where: { projectId, createdAt: { gte: activityCutoff() } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;
  const attention = openTasks
    .filter((t) => isOverdue(t, now) || (t.type === "BUG" && t.priority === "CRITICAL"))
    .slice(0, 6);
  return { byStatus, openTasks, attention, memberCount, recentActivity };
}

/** Small numbers for the settings page summary. Call only after access has been checked. */
export async function getProjectFacts(projectId: string) {
  const [tasks, done, members] = await Promise.all([
    db.task.count({ where: { projectId } }),
    db.task.count({ where: { projectId, status: "DONE" } }),
    db.projectMember.count({ where: { projectId } }),
  ]);
  return { tasks, done, members };
}
