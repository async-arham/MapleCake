import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/tasks/TaskForm";
import split from "@/components/layout/split.module.css";
import { ActionForm } from "@/components/ui/ActionForm";
import { Alert } from "@/components/ui/Alert";
import { OverdueBadge, PriorityBadge, StatusBadge, TypeBadge } from "@/components/ui/Badges";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDate, timeAgo } from "@/lib/dates";
import { CRITICAL_BUG_POINTS, OVERDUE_WEIGHT, isOverdue } from "@/lib/health";
import { can, canDeleteTask } from "@/lib/permissions";
import { deleteTaskAction, updateTaskAction } from "@/server/actions/tasks";
import { getProjectContext } from "@/server/context";
import { getTask, listProjectMembers } from "@/server/queries/tasks";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage({ params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  const { projectId, taskId } = await params;
  const { user, project, role } = await getProjectContext(projectId);
  const task = await getTask(project.id, taskId);
  if (!task) notFound();

  const canEdit = can(role, "task:edit") && project.status === "ACTIVE";
  const canDelete = canEdit && canDeleteTask(role, task.creatorId === user.id);
  const members = (await listProjectMembers(project.id)).map((m) => ({ id: m.userId, name: m.user.name }));
  const late = task.status !== "DONE" && isOverdue(task);
  const costs = (late ? OVERDUE_WEIGHT[task.priority] : 0) + (task.status !== "DONE" && task.type === "BUG" && task.priority === "CRITICAL" ? CRITICAL_BUG_POINTS : 0);

  return (
    <div className={split.split}>
      <div className={split.column}>
        <section className={split.formCard} aria-labelledby="task-title">
          <h2 id="task-title">{canEdit ? "Edit task" : task.title}</h2>
          <p className={split.formLead}>Created by {task.creator.name} {timeAgo(task.createdAt)}.</p>
          {canEdit ? (
            <TaskForm action={updateTaskAction} projectId={project.id} members={members} currentUserId={user.id} task={task} cancelHref={`/projects/${project.id}/tasks`} />
          ) : (
            <>
              <Alert tone="info">{project.status === "ARCHIVED" ? "This project is archived, so tasks are read-only." : "You have read-only access to this project."}</Alert>
              <p style={{ marginTop: "1.2rem" }}>{task.description ?? "No description."}</p>
            </>
          )}
        </section>
        {canDelete && (
          <section className={`${split.formCard} ${split.danger}`} aria-labelledby="delete-task">
            <h2 id="delete-task" className={split.dangerTitle}>Delete task</h2>
            <p className={split.formLead}>This permanently removes the task and cannot be undone.</p>
            <ActionForm action={deleteTaskAction} inline>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="taskId" value={task.id} />
              <SubmitButton variant="danger" icon="ri-delete-bin-6-line" pendingLabel="Deleting" confirm={{ title: "Delete this task?", message: `“${task.title}” will be permanently deleted.`, confirmLabel: "Delete task" }}>
                Delete task
              </SubmitButton>
            </ActionForm>
          </section>
        )}
      </div>

      <aside className={split.aside} aria-label="Task details">
        <div className={split.asideCard}>
          <h3>Details</h3>
          <dl className={split.facts}>
            <dt>Status</dt><dd><StatusBadge value={task.status} /></dd>
            <dt>Priority</dt><dd><PriorityBadge value={task.priority} /></dd>
            <dt>Type</dt><dd><TypeBadge value={task.type} /></dd>
            <dt>Due</dt><dd>{task.dueDate ? formatDate(task.dueDate) : "No due date"} {late && <OverdueBadge />}</dd>
            <dt>Assignee</dt><dd>{task.assignee?.name ?? "Unassigned"}</dd>
            <dt>Updated</dt><dd>{timeAgo(task.updatedAt)}</dd>
          </dl>
        </div>
        <div className={split.asideCard}>
          <h3>Effect on project health</h3>
          {costs > 0 ? (
            <p className={split.note}>
              <i className="ri-heart-pulse-line" aria-hidden="true" />
              <span>This task is costing the project <strong>{costs} health point{costs === 1 ? "" : "s"}</strong> right now. Finish it or fix its due date to win them back.</span>
            </p>
          ) : (
            <p className={split.note}>
              <i className="ri-checkbox-circle-line" aria-hidden="true" />
              <span>This task is not hurting the health score.</span>
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
