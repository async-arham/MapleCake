import type { Metadata } from "next";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { can } from "@/lib/permissions";
import { getProjectContext } from "@/server/context";
import { getBoardTasks } from "@/server/queries/tasks";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, role } = await getProjectContext(projectId);
  const { tasks, hiddenDone } = await getBoardTasks(project.id);
  const archived = project.status === "ARCHIVED";
  const canEdit = can(role, "task:edit") && !archived;

  return (
    <>
      {archived && <Alert tone="info">This project is archived. The board is read-only.</Alert>}
      {tasks.length === 0 ? (
        <EmptyState
          title="The board is empty"
          action={can(role, "task:create") && !archived ? <LinkButton href={`/projects/${project.id}/tasks/new`}>Add a task</LinkButton> : undefined}
        >
          Add your first task and it will appear in the To Do column.
        </EmptyState>
      ) : (
        <KanbanBoard projectId={project.id} tasks={tasks} canEdit={canEdit} hiddenDone={hiddenDone} />
      )}
    </>
  );
}
