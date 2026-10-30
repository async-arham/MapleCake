import "server-only";
import { db } from "@/lib/db";
import { countMyInvites } from "./invites";
import { countUnread, visibleNotifications } from "./notifications";

export type LiveToast = { id: string; type: string; message: string; createdAt: string; projectId: string | null; taskId: string | null };
export type LiveSnapshot = { unread: number; invites: number; cursor: string; toasts: LiveToast[] };

/** Two commits can land out of order, so each check also looks a little before the cursor. The browser skips ids it has seen. */
const OVERLAP_MS = 10_000;

/** What the page is told when it first loads: the counts, where "new" starts, and which recent alerts to NOT announce again. */
export async function getLiveBootstrap(userId: string) {
  const [unread, invites, latest] = await Promise.all([
    countUnread(userId),
    countMyInvites(userId),
    db.notification.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const cursor = latest?.createdAt ?? new Date(0);
  const recent = latest
    ? await db.notification.findMany({ where: { userId, createdAt: { gt: new Date(cursor.getTime() - OVERLAP_MS - 1000) } }, select: { id: true }, take: 50 })
    : [];
  return { unread, invites, cursor: cursor.toISOString(), seen: recent.map((r) => r.id) };
}

/** Everything the browser needs to stay current: fresh counts plus any alerts newer than its cursor. */
export async function getLiveSnapshot(userId: string, cursor: Date): Promise<LiveSnapshot> {
  const [unread, invites, fresh] = await Promise.all([
    countUnread(userId),
    countMyInvites(userId),
    db.notification.findMany({
      where: { ...visibleNotifications(userId), createdAt: { gt: new Date(cursor.getTime() - OVERLAP_MS) } },
      orderBy: { createdAt: "asc" },
      take: 25,
      select: { id: true, type: true, message: true, createdAt: true, projectId: true, taskId: true, readAt: true },
    }),
  ]);
  const newest = fresh.length ? fresh[fresh.length - 1]!.createdAt : cursor;
  return {
    unread,
    invites,
    cursor: (newest > cursor ? newest : cursor).toISOString(),
    toasts: fresh.filter((n) => !n.readAt).slice(-4).map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  };
}
