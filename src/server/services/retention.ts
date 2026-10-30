import "server-only";
import { db } from "@/lib/db";
import { activityCutoff } from "../queries/activity";

const HOUR_MS = 3_600_000;
let lastRun = 0;

/**
 * Deletes notifications older than 90 days, activity older than 60 days and invitations older than 60 days.
 * Called from busy pages (at most once an hour per server) and by the daily cron job (always).
 */
export async function purgeExpiredRecords(options: { force?: boolean; now?: Date } = {}) {
  const now = options.now ?? new Date();
  if (!options.force && now.getTime() - lastRun < HOUR_MS) return { notifications: 0, activity: 0, invites: 0, skipped: true };
  lastRun = now.getTime();
  const [notifications, activity, invites] = await Promise.all([
    db.notification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 90 * 86_400_000) } } }),
    db.activityLog.deleteMany({ where: { createdAt: { lt: activityCutoff(now) } } }),
    db.projectInvite.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 60 * 86_400_000) } } }),
  ]);
  return { notifications: notifications.count, activity: activity.count, invites: invites.count, skipped: false };
}
