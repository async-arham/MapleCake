import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.css";
import { requireUser } from "@/lib/auth/session";
import { timeAgo } from "@/lib/dates";
import { FALLBACK_META, NOTIFICATION_META as ICON, notificationHref } from "@/lib/notification-meta";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { clearNotificationsAction, dismissNotificationAction, markAllReadAction, markReadAction } from "@/server/actions/notifications";
import { VISIBLE_DAYS, listNotifications } from "@/server/queries/notifications";
import { purgeExpiredRecords } from "@/server/services/retention";
import { pageOnlySchema } from "@/validation/schemas";
import styles from "./notifications.module.css";

export const metadata: Metadata = { title: "Notifications" };


export default async function NotificationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requireUser();
  const { page: requested } = pageOnlySchema.parse(flattenParams(await searchParams));
  await purgeExpiredRecords();
  const { items, total, totalPages, page } = await listNotifications(user.id, requested);
  const hasUnread = items.some((n) => !n.readAt);
  const hasRead = items.some((n) => n.readAt);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`Assignments, overdue tasks, team changes and health alerts. They clear themselves after ${VISIBLE_DAYS} days.`}
        actions={
          total > 0 ? (
            <div className={styles.headActions}>
              {hasUnread && (
                <form action={markAllReadAction}>
                  <button type="submit" className={`${ui.btn} ${ui.secondary}`}>
                    <i className="ri-check-double-line" aria-hidden="true" /> Mark all as read
                  </button>
                </form>
              )}
              {hasRead && (
                <ActionForm action={clearNotificationsAction} inline>
                  <input type="hidden" name="scope" value="read" />
                  <SubmitButton variant="outline" icon="ri-eraser-line">Clear read</SubmitButton>
                </ActionForm>
              )}
              <ActionForm action={clearNotificationsAction} inline>
                <input type="hidden" name="scope" value="all" />
                <SubmitButton
                  variant="outline"
                  icon="ri-delete-bin-6-line"
                  confirm={{ title: "Clear all notifications?", message: "Every notification will be removed from your list. This cannot be undone.", confirmLabel: "Clear all" }}
                >
                  Clear all
                </SubmitButton>
              </ActionForm>
            </div>
          ) : undefined
        }
      />
      {total === 0 ? (
        <EmptyState icon="notification-off" title="You are all caught up">
          New assignments and alerts will appear here.
        </EmptyState>
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((n, i) => {
              const icon = ICON[n.type] ?? FALLBACK_META;
              return (
                <li key={n.id} className={`${styles.item} ${n.readAt ? "" : styles.unread} rise`} style={{ "--i": i } as React.CSSProperties}>
                  <span className={styles.icon}>
                    <DuoIcon name={icon.name} tone={icon.tone} size="2rem" />
                    {!n.readAt && <span className={styles.dot} aria-label="Unread" />}
                  </span>
                  <div className={styles.text}>
                    <p>{n.message}</p>
                    <p className={styles.meta}>
                      <time dateTime={n.createdAt.toISOString()}>{timeAgo(n.createdAt)}</time>
                      {n.project && (
                        <>
                          {" · "}
                          <Link href={notificationHref(n)}>{n.type === "INVITE_RECEIVED" ? "Go to Invitations to answer" : "Open"}</Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className={styles.rowActions}>
                    {!n.readAt && (
                      <ActionForm action={markReadAction} inline>
                        <input type="hidden" name="notificationId" value={n.id} />
                        <SubmitButton variant="secondary" small icon="ri-check-line">Mark read</SubmitButton>
                      </ActionForm>
                    )}
                    <ActionForm action={dismissNotificationAction} inline>
                      <input type="hidden" name="notificationId" value={n.id} />
                      <SubmitButton variant="ghost" small icon="ri-delete-bin-6-line" pendingLabel="Deleting">
                        <span className="visually-hidden">Delete notification</span>
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} total={total} basePath="/notifications" noun="notification" />
        </>
      )}
    </>
  );
}
