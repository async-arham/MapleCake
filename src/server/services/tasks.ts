import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { isDueDateInPast } from "@/lib/dates";
import { canDeleteTask } from "@/lib/permissions";
import type { TaskInput } from "@/validation/schemas";
import { assertActive, requireMembership } from "../access";
import { logActivity, notify } from "../activity";
import { AppError } from "../errors";
import { getProjectHealth } from "../queries/health";

type TaskPatch = Partial<TaskInput>;

async function assertAssigneeIsMember(projectId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
    select: { id: true },
  });
  if (!member) throw new AppError("VALIDATION", "You can only assign tasks to members of this project.");
}

/** If a change pushes the project below 60, tell the owner and admins (except the person who did it). */
async function notifyIfHealthDropped(projectId: string, projectName: string, before: number, actorId: string) {
  const after = await getProjectHealth(projectId);
  if (before >= 60 && after.score < 60) {
    const leaders = await db.projectMember.findMany({
      where: { projectId, role: { in: ["OWNER", "ADMIN"] }, userId: { not: actorId } },
      select: { userId: true },
    });
    if (leaders.length > 0) {
      await db.notification.createMany({
        data: leaders.map((l) => ({
          userId: l.userId,
          projectId,
          type: "HEALTH_DROPPED" as const,
          message: `“${projectName}” health dropped to ${after.score} (${after.label}).`,
        })),
      });
    }
  }
}

const PAST_DUE_MESSAGE = "Due date can’t be in the past. Pick today or a later day.";

export async function createTask(userId: string, projectId: string, input: TaskInput) {
  const { project } = await requireMembership(userId, projectId, "task:create");
  assertActive(project);
  if (input.dueDate && isDueDateInPast(input.dueDate)) throw new AppError("VALIDATION", PAST_DUE_MESSAGE);
  await assertAssigneeIsMember(projectId, input.assigneeId);
  const before = (await getProjectHealth(projectId)).score;

  const task = await db.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId,
        creatorId: userId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        type: input.type,
        dueDate: input.dueDate,
        assigneeId: input.assigneeId,
        completedAt: input.status === "DONE" ? new Date() : null,
      },
    });
    await logActivity(tx, {
      projectId,
      actorId: userId,
      taskId: created.id,
      action: "TASK_CREATED",
      message: `created ${created.type === "BUG" ? "bug" : "task"} “${created.title}”`,
    });
    if (created.assigneeId && created.assigneeId !== userId) {
      await notify(tx, {
        userId: created.assigneeId,
        projectId,
        taskId: created.id,
        type: "TASK_ASSIGNED",
        message: `You were assigned “${created.title}” in ${project.name}.`,
      });
    }
    return created;
  });

  await notifyIfHealthDropped(projectId, project.name, before, userId);
  return task;
}

async function changeTask(userId: string, projectId: string, taskId: string, patch: TaskPatch) {
  const { project } = await requireMembership(userId, projectId, "task:edit");
  assertActive(project);
  const existing = await db.task.findFirst({ where: { id: taskId, projectId } });
  if (!existing) throw new AppError("NOT_FOUND", "Task not found.");
  if (patch.assigneeId !== undefined) await assertAssigneeIsMember(projectId, patch.assigneeId);
  // Only a changed due date is checked, so an already overdue task can still be renamed, reassigned or closed.
  const dueDateChanged = patch.dueDate !== undefined && patch.dueDate?.getTime() !== existing.dueDate?.getTime();
  if (dueDateChanged && patch.dueDate && isDueDateInPast(patch.dueDate)) throw new AppError("VALIDATION", PAST_DUE_MESSAGE);
  const before = (await getProjectHealth(projectId)).score;

  const data: Prisma.TaskUncheckedUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.status !== undefined) {
    data.status = patch.status;
    if (patch.status === "DONE" && existing.status !== "DONE") data.completedAt = new Date();
    if (patch.status !== "DONE" && existing.status === "DONE") data.completedAt = null;
  }

  const statusChanged = patch.status !== undefined && patch.status !== existing.status;
  const assigneeChanged = patch.assigneeId !== undefined && patch.assigneeId !== existing.assigneeId;
  const otherChanged =
    (patch.title !== undefined && patch.title !== existing.title) ||
    (patch.description !== undefined && patch.description !== existing.description) ||
    (patch.priority !== undefined && patch.priority !== existing.priority) ||
    (patch.type !== undefined && patch.type !== existing.type) ||
    (patch.dueDate !== undefined && patch.dueDate?.getTime() !== existing.dueDate?.getTime());

  const updated = await db.$transaction(async (tx) => {
    const task = await tx.task.update({ where: { id: taskId }, data });
    const base = { projectId, actorId: userId, taskId };
    if (statusChanged) {
      await logActivity(tx, {
        ...base,
        action: "TASK_STATUS_CHANGED",
        message: `moved “${task.title}” from ${STATUS_LABEL[existing.status as TaskStatus]} to ${STATUS_LABEL[task.status as TaskStatus]}`,
      });
      if (task.assigneeId && task.assigneeId !== userId) {
        await notify(tx, {
          userId: task.assigneeId,
          projectId,
          taskId,
          type: "TASK_STATUS_CHANGED",
          message: `“${task.title}” was moved to ${STATUS_LABEL[task.status as TaskStatus]}.`,
        });
      }
    }
    if (assigneeChanged) {
      await logActivity(tx, {
        ...base,
        action: "TASK_ASSIGNED",
        message: task.assigneeId ? `assigned “${task.title}”` : `unassigned “${task.title}”`,
      });
      if (task.assigneeId && task.assigneeId !== userId) {
        await notify(tx, {
          userId: task.assigneeId,
          projectId,
          taskId,
          type: "TASK_ASSIGNED",
          message: `You were assigned “${task.title}” in ${project.name}.`,
        });
      }
    }
    if (otherChanged) {
      await logActivity(tx, { ...base, action: "TASK_UPDATED", message: `updated “${task.title}”` });
    }
    return task;
  });

  await notifyIfHealthDropped(projectId, project.name, before, userId);
  return updated;
}

export function updateTask(userId: string, projectId: string, taskId: string, input: TaskInput) {
  return changeTask(userId, projectId, taskId, input);
}

export function moveTask(userId: string, projectId: string, taskId: string, status: TaskStatus) {
  return changeTask(userId, projectId, taskId, { status });
}

export async function deleteTask(userId: string, projectId: string, taskId: string) {
  const { project, role } = await requireMembership(userId, projectId, "task:edit");
  assertActive(project);
  const task = await db.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw new AppError("NOT_FOUND", "Task not found.");
  if (!canDeleteTask(role, task.creatorId === userId)) {
    throw new AppError("FORBIDDEN", "Only admins or the person who created a task can delete it.");
  }
  await db.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: taskId } });
    await logActivity(tx, {
      projectId,
      actorId: userId,
      action: "TASK_DELETED",
      message: `deleted “${task.title}”`,
    });
  });
}
