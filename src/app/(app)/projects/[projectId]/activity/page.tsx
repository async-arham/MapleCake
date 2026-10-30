import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import styles from "@/components/projects/project.module.css";
import ui from "@/components/ui/ui.module.css";
import { timeAgo } from "@/lib/dates";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { getProjectContext } from "@/server/context";
import { ACTIVITY_RETENTION_DAYS, listActivity } from "@/server/queries/activity";
import { purgeExpiredRecords } from "@/server/services/retention";
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
  const { page: requested } = pageOnlySchema.parse(flattenParams(await searchParams));
  await purgeExpiredRecords();
  const { items, total, totalPages, page } = await listActivity(project.id, requested);

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
      <p className={styles.muted} style={{ marginTop: "1rem" }}>Activity is kept for {ACTIVITY_RETENTION_DAYS} days and then removed automatically.</p>
    </>
  );
}
