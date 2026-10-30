import type { Metadata } from "next";
import Link from "next/link";
import { OverdueBadge, PriorityBadge, StatusBadge, TypeBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import ui from "@/components/ui/ui.module.css";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, TYPE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { isOverdue } from "@/lib/health";
import { can } from "@/lib/permissions";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { getProjectContext } from "@/server/context";
import { listProjectMembers, listTasks } from "@/server/queries/tasks";
import { taskListSchema } from "@/validation/schemas";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { projectId } = await params;
  const { user, project, role } = await getProjectContext(projectId);
  const query = taskListSchema.parse(flattenParams(await searchParams));
  const [{ tasks, total, totalPages, page }, members] = await Promise.all([
    listTasks(project.id, user.id, query),
    listProjectMembers(project.id),
  ]);
  const base = `/projects/${project.id}/tasks`;
  const filtered = Boolean(query.q) || query.status !== "ALL" || query.priority !== "ALL" || query.type !== "ALL" || Boolean(query.assignee) || query.overdue === "1";
  const canCreate = can(role, "task:create") && project.status === "ACTIVE";
  const sortLink = (key: string, label: string) => {
    const dir = query.sort === key && query.dir === "asc" ? "desc" : "asc";
    const sp = new URLSearchParams({ ...(query.q ? { q: query.q } : {}), status: query.status, priority: query.priority, type: query.type, assignee: query.assignee, overdue: query.overdue, sort: key, dir });
    return <Link href={`${base}?${sp.toString()}`}>{label}{query.sort === key ? (query.dir === "asc" ? " ▲" : " ▼") : ""}</Link>;
  };

  const options = {
    status: [{ value: "ALL", label: "Any" }, ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))],
    priority: [{ value: "ALL", label: "Any" }, ...TASK_PRIORITIES.map((s) => ({ value: s, label: PRIORITY_LABEL[s] }))],
    type: [{ value: "ALL", label: "Any" }, ...TASK_TYPES.map((s) => ({ value: s, label: TYPE_LABEL[s] }))],
    assignee: [
      { value: "", label: "Anyone" },
      { value: "me", label: "Me" },
      { value: "none", label: "Unassigned" },
      ...members.filter((m) => m.userId !== user.id).map((m) => ({ value: m.userId, label: m.user.name })),
    ],
    overdue: [{ value: "0", label: "Any time" }, { value: "1", label: "Overdue only" }],
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "1.25rem" }}>Tasks</h2>
        {canCreate ? <LinkButton href={`${base}/new`}>New task</LinkButton> : <span className={ui.hint}>{project.status === "ARCHIVED" ? "Archived projects are read-only." : "You have read-only access."}</span>}
      </div>

      <form method="get" className={ui.toolbar} role="search" aria-label="Filter tasks">
        <div className={`${ui.field} ${ui.grow}`}>
          <label htmlFor="q" className={ui.label}>Search</label>
          <input id="q" name="q" type="search" defaultValue={query.q} placeholder="Title or description" className={ui.input} maxLength={100} />
        </div>
        <div className={ui.field}>
          <label htmlFor="status" className={ui.label}>Status</label>
          <Select id="status" name="status" compact defaultValue={query.status} options={options.status} />
        </div>
        <div className={ui.field}>
          <label htmlFor="priority" className={ui.label}>Priority</label>
          <Select id="priority" name="priority" compact defaultValue={query.priority} options={options.priority} />
        </div>
        <div className={ui.field}>
          <label htmlFor="type" className={ui.label}>Type</label>
          <Select id="type" name="type" compact defaultValue={query.type} options={options.type} />
        </div>
        <div className={ui.field}>
          <label htmlFor="assignee" className={ui.label}>Assignee</label>
          <Select id="assignee" name="assignee" compact defaultValue={query.assignee} options={options.assignee} />
        </div>
        <div className={ui.field}>
          <label htmlFor="overdue" className={ui.label}>Due</label>
          <Select id="overdue" name="overdue" compact defaultValue={query.overdue} options={options.overdue} />
        </div>
        <input type="hidden" name="sort" value={query.sort} />
        <input type="hidden" name="dir" value={query.dir} />
        <button type="submit" className={`${ui.btn} ${ui.secondary}`}>Apply</button>
        {filtered && <LinkButton href={base} variant="ghost">Clear</LinkButton>}
      </form>

      {tasks.length === 0 ? (
        filtered ? (
          <EmptyState title="No tasks match these filters" action={<LinkButton href={base} variant="secondary">Clear filters</LinkButton>}>
            Try removing a filter or searching for something else.
          </EmptyState>
        ) : (
          <EmptyState title="No tasks yet" action={canCreate ? <LinkButton href={`${base}/new`}>Add a task</LinkButton> : undefined}>
            Tasks and bugs you add will show up here.
          </EmptyState>
        )
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.tableStack}`}>
              <thead className={ui.sortBar}>
                <tr>
                  <th scope="col" data-sort>{sortLink("title", "Title")}</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col" data-sort>{sortLink("priority", "Priority")}</th>
                  <th scope="col" data-sort>{sortLink("due", "Due")}</th>
                  <th scope="col">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td data-title><Link href={`${base}/${t.id}`}>{t.title}</Link></td>
                    <td data-label="Type"><TypeBadge value={t.type} /></td>
                    <td data-label="Status"><StatusBadge value={t.status} /></td>
                    <td data-label="Priority"><PriorityBadge value={t.priority} /></td>
                    <td data-label="Due">
                      {t.dueDate ? formatDate(t.dueDate) : "-"} {t.status !== "DONE" && isOverdue(t) && <OverdueBadge />}
                    </td>
                    <td data-label="Assignee">{t.assignee?.name ?? "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} basePath={base} noun="task" params={{ ...(query.q ? { q: query.q } : {}), status: query.status, priority: query.priority, type: query.type, assignee: query.assignee, overdue: query.overdue, sort: query.sort, dir: query.dir }} />
        </>
      )}
    </>
  );
}
