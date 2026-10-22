import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { ActionForm } from "@/components/ui/ActionForm";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/ui/Badges";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TaskForm } from "@/components/tasks/TaskForm";
import styles from "@/components/projects/project.module.css";
import ui from "@/components/ui/ui.module.css";
import { formatDate, timeAgo } from "@/lib/dates";
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

  return (
    <div className={styles.stack}>
      <h2 style={{ fontSize: "1.25rem" }}>{canEdit ? "Edit task" : task.title}</h2>
      <p className={styles.muted}>
        Created by {task.creator.name} {timeAgo(task.createdAt)} · updated {timeAgo(task.updatedAt)}
      </p>

      {canEdit ? (
        <>
          <TaskForm action={updateTaskAction} projectId={project.id} members={members} task={task} cancelHref={`/projects/${project.id}/tasks`} />
          {canDelete && (
            <section className={`${ui.card} ${styles.danger}`} aria-labelledby="delete-task">
              <h3 id="delete-task" style={{ marginBottom: "0.5rem" }}>Delete task</h3>
              <p className={styles.muted} style={{ marginBottom: "0.75rem" }}>This cannot be undone.</p>
              <ActionForm action={deleteTaskAction} inline>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="taskId" value={task.id} />
                <SubmitButton variant="danger" pendingLabel="Deleting..." confirm="Delete this task permanently?">Delete task</SubmitButton>
              </ActionForm>
            </section>
          )}
        </>
      ) : (
        <>
          <Alert tone="info">{project.status === "ARCHIVED" ? "This project is archived, so tasks are read-only." : "You have read-only access to this project."}</Alert>
          <dl className={styles.dl}>
            <dt>Status</dt><dd><StatusBadge value={task.status} /></dd>
            <dt>Priority</dt><dd><PriorityBadge value={task.priority} /></dd>
            <dt>Type</dt><dd><TypeBadge value={task.type} /></dd>
            <dt>Due</dt><dd>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</dd>
            <dt>Assignee</dt><dd>{task.assignee?.name ?? "Unassigned"}</dd>
            <dt>Description</dt><dd>{task.description ?? "No description"}</dd>
          </dl>
        </>
      )}
    </div>
  );
}
