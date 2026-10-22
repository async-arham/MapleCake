import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { TaskForm } from "@/components/tasks/TaskForm";
import { can } from "@/lib/permissions";
import { createTaskAction } from "@/server/actions/tasks";
import { getProjectContext } from "@/server/context";
import { listProjectMembers } from "@/server/queries/tasks";

export const metadata: Metadata = { title: "New task" };

export default async function NewTaskPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, role } = await getProjectContext(projectId);
  if (!can(role, "task:create")) notFound();
  if (project.status === "ARCHIVED") return <Alert tone="info">This project is archived. Restore it in Settings to add tasks.</Alert>;
  const members = (await listProjectMembers(project.id)).map((m) => ({ id: m.userId, name: m.user.name }));
  return (
    <>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>New task</h2>
      <TaskForm action={createTaskAction} projectId={project.id} members={members} cancelHref={`/projects/${project.id}/tasks`} />
    </>
  );
}
