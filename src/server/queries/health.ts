import "server-only";
import { db } from "@/lib/db";
import { computeHealth, type HealthResult, type HealthTask } from "@/lib/health";

export const healthTaskSelect = {
  id: true,
  title: true,
  priority: true,
  type: true,
  dueDate: true,
  assigneeId: true,
} as const;

export async function getProjectHealth(projectId: string): Promise<HealthResult> {
  const open: HealthTask[] = await db.task.findMany({
    where: { projectId, status: { not: "DONE" } },
    select: healthTaskSelect,
  });
  return computeHealth(open);
}

/** Health for many projects using one database query. Archived projects are included if passed in. */
export async function getHealthForProjects(projectIds: string[]): Promise<Map<string, HealthResult>> {
  const rows = await db.task.findMany({
    where: { projectId: { in: projectIds }, status: { not: "DONE" } },
    select: { ...healthTaskSelect, projectId: true },
  });
  const grouped = new Map<string, HealthTask[]>(projectIds.map((id) => [id, []]));
  for (const row of rows) grouped.get(row.projectId)?.push(row);
  return new Map([...grouped].map(([id, tasks]) => [id, computeHealth(tasks)]));
}
