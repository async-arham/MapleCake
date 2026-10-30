import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/tasks/TaskForm";
import split from "@/components/layout/split.module.css";
import { Alert } from "@/components/ui/Alert";
import { PriorityBadge } from "@/components/ui/Badges";
import { TASK_PRIORITIES } from "@/lib/constants";
import { CRITICAL_BUG_POINTS, OVERDUE_WEIGHT } from "@/lib/health";
import { can } from "@/lib/permissions";
import { createTaskAction } from "@/server/actions/tasks";
import { getProjectContext } from "@/server/context";
import { listProjectMembers } from "@/server/queries/tasks";

export const metadata: Metadata = { title: "New task" };

export default async function NewTaskPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project, role } = await getProjectContext(projectId);
  if (!can(role, "task:create")) notFound();
  if (project.status === "ARCHIVED") return <Alert tone="info">This project is archived. Restore it in Settings to add tasks.</Alert>;
  const members = (await listProjectMembers(project.id)).map((m) => ({ id: m.userId, name: m.user.name }));

  return (
    <div className={split.split}>
      <section className={split.formCard} aria-labelledby="task-title">
        <h2 id="task-title">New task</h2>
        <p className={split.formLead}>Add a task, bug or feature. Priority and due date decide how it affects the health score.</p>
        <TaskForm action={createTaskAction} projectId={project.id} members={members} currentUserId={user.id} cancelHref={`/projects/${project.id}/tasks`} />
      </section>
      <aside className={split.aside} aria-label="Scoring guide">
        <div className={split.asideCard}>
          <h3>If it runs late, it costs</h3>
          <ul className={split.weights}>
            {TASK_PRIORITIES.map((p) => (
              <li key={p}>
                <PriorityBadge value={p} />
                <span className={split.points}>-{OVERDUE_WEIGHT[p]} points</span>
              </li>
            ))}
          </ul>
          <p className={split.note}>
            <i className="ri-bug-line" aria-hidden="true" />
            <span>A bug marked <strong>Critical</strong> costs {CRITICAL_BUG_POINTS} points the moment you create it, until it is Done.</span>
          </p>
        </div>
        <div className={split.asideCard}>
          <h3>Good to know</h3>
          <ul className={split.tips}>
            <li>Tasks with no due date never count as overdue.</li>
            <li>Assign an owner so the person gets a notification.</li>
            <li>You can only assign people who are members of this project.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
