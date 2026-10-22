import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.css";
import { requireUser } from "@/lib/auth/session";
import { timeAgo } from "@/lib/dates";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { markAllReadAction, markReadAction } from "@/server/actions/notifications";
import { listNotifications } from "@/server/queries/notifications";
import { pageOnlySchema } from "@/validation/schemas";
import styles from "./notifications.module.css";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requireUser();
  const { page } = pageOnlySchema.parse(flattenParams(await searchParams));
  const { items, total, totalPages } = await listNotifications(user.id, page);
  const unread = items.some((n) => !n.readAt);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Assignments, overdue tasks, team changes and health alerts."
        actions={
          unread ? (
            <form action={markAllReadAction}>
              <button type="submit" className={`${ui.btn} ${ui.secondary}`}>Mark all as read</button>
            </form>
          ) : undefined
        }
      />
      {total === 0 ? (
        <EmptyState title="You are all caught up">New assignments and alerts will appear here.</EmptyState>
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((n) => (
              <li key={n.id} className={`${styles.item} ${n.readAt ? "" : styles.unread}`}>
                <div>
                  <p>{n.message}</p>
                  <p className={styles.meta}>
                    <time dateTime={n.createdAt.toISOString()}>{timeAgo(n.createdAt)}</time>
                    {n.project && (
                      <>
                        {" · "}
                        <Link href={n.taskId ? `/projects/${n.project.id}/tasks/${n.taskId}` : `/projects/${n.project.id}`}>Open</Link>
                      </>
                    )}
                  </p>
                </div>
                {!n.readAt && (
                  <ActionForm action={markReadAction} inline>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <SubmitButton variant="ghost" small pendingLabel="...">Mark read</SubmitButton>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} total={total} basePath="/notifications" noun="notification" />
        </>
      )}
    </>
  );
}
