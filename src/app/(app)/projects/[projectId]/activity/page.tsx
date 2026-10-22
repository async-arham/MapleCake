import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import styles from "@/components/projects/project.module.css";
import ui from "@/components/ui/ui.module.css";
import { timeAgo } from "@/lib/dates";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { getProjectContext } from "@/server/context";
import { listActivity } from "@/server/queries/activity";
import { pageOnlySchema } from "@/validation/schemas";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { projectId } = await params;
  const { project } = await getProjectContext(projectId);
  const { page } = pageOnlySchema.parse(flattenParams(await searchParams));
  const { items, total, totalPages } = await listActivity(project.id, page);

  if (total === 0) return <EmptyState title="No activity yet">Changes to tasks, members and settings are recorded here.</EmptyState>;

  return (
    <>
      <div className={ui.card}>
        <ul className={styles.list}>
          {items.map((a) => (
            <li key={a.id}>
              <span>
                <strong>{a.actor?.name ?? "Someone"}</strong> {a.message}
              </span>
              <time dateTime={a.createdAt.toISOString()} className={styles.muted} title={a.createdAt.toUTCString()}>
                {timeAgo(a.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} basePath={`/projects/${project.id}/activity`} noun="event" />
    </>
  );
}
