import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";
import { startOfTodayUtc } from "@/lib/dates";
import type { TaskListQuery } from "@/validation/schemas";

const taskCard = {
  id: true,
  title: true,
  status: true,
  priority: true,
  type: true,
  dueDate: true,
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;

/** Paginated, filterable task list. Call only after project access was checked. */
export async function listTasks(projectId: string, userId: string, query: TaskListQuery) {
  const where: Prisma.TaskWhereInput = { projectId };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }
  if (query.status !== "ALL") where.status = query.status;
  if (query.priority !== "ALL") where.priority = query.priority;
  if (query.type !== "ALL") where.type = query.type;
  if (query.assignee === "me") where.assigneeId = userId;
  else if (query.assignee === "none") where.assigneeId = null;
  else if (query.assignee) where.assigneeId = query.assignee;
  if (query.overdue === "1") {
    where.status = { not: "DONE" };
    where.dueDate = { lt: startOfTodayUtc() };
  }

  const dir = query.dir;
  const orderBy: Prisma.TaskOrderByWithRelationInput[] =
    query.sort === "priority"
      ? [{ priority: dir }, { createdAt: "desc" }]
      : query.sort === "created"
        ? [{ createdAt: dir }]
        : query.sort === "updated"
          ? [{ updatedAt: dir }]
          : query.sort === "title"
            ? [{ title: dir }]
            : [{ dueDate: { sort: dir, nulls: "last" } }, { createdAt: "desc" }];

  const allCount = await db.task.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(allCount / PAGE_SIZE)));
  const [total, tasks] = await Promise.all([
    db.task.count({ where }),
    db.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: taskCard,
    }),
  ]);
  return { page, tasks, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

const DONE_ON_BOARD = 25;

export async function getBoardTasks(projectId: string) {
  const [open, done, doneTotal] = await Promise.all([
    db.task.findMany({
      where: { projectId, status: { not: "DONE" } },
      select: taskCard,
      orderBy: [{ priority: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }],
      take: 300,
    }),
    db.task.findMany({
      where: { projectId, status: "DONE" },
      select: taskCard,
      orderBy: { completedAt: "desc" },
      take: DONE_ON_BOARD,
    }),
    db.task.count({ where: { projectId, status: "DONE" } }),
  ]);
  return { tasks: [...open, ...done], hiddenDone: Math.max(0, doneTotal - DONE_ON_BOARD) };
}

export function getTask(projectId: string, taskId: string) {
  return db.task.findFirst({
    where: { id: taskId, projectId },
    include: { assignee: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } },
  });
}

export function listProjectMembers(projectId: string) {
  return db.projectMember.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "asc" }],
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}
