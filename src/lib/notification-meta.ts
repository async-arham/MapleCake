// How each kind of notification looks and where it leads. Shared by the notifications page and the live pop-ups.

export type NotificationTone = "yellow" | "red" | "green" | "blue" | "purple";

export const NOTIFICATION_META: Record<string, { name: string; tone: NotificationTone; title: string }> = {
  TASK_ASSIGNED: { name: "user-add", tone: "blue", title: "Task assigned" },
  TASK_OVERDUE: { name: "alarm-warning", tone: "red", title: "Task overdue" },
  TASK_STATUS_CHANGED: { name: "task", tone: "yellow", title: "Task moved" },
  ADDED_TO_PROJECT: { name: "folder-add", tone: "green", title: "Added to a project" },
  ROLE_CHANGED: { name: "shield-user", tone: "purple", title: "Role changed" },
  REMOVED_FROM_PROJECT: { name: "user", tone: "red", title: "Removed from a project" },
  HEALTH_DROPPED: { name: "heart-pulse", tone: "red", title: "Health dropped" },
  INVITE_RECEIVED: { name: "mail-send", tone: "yellow", title: "New invitation" },
  INVITE_ACCEPTED: { name: "checkbox-circle", tone: "green", title: "Invitation accepted" },
  INVITE_DECLINED: { name: "close-circle", tone: "red", title: "Invitation declined" },
};

export const FALLBACK_META = { name: "notification-3", tone: "yellow" as NotificationTone, title: "Notification" };

/**
 * Invitations are only ever answered on the Invitations page, so that is where an invitation notification leads.
 * Nothing in a notification or pop-up can accept or decline.
 */
export function notificationHref(n: { type: string; projectId: string | null; taskId: string | null }): string {
  if (n.type === "INVITE_RECEIVED") return "/invitations";
  if (n.type === "INVITE_ACCEPTED" || n.type === "INVITE_DECLINED") return n.projectId ? `/projects/${n.projectId}/team` : "/notifications";
  if (n.type === "REMOVED_FROM_PROJECT" || !n.projectId) return "/notifications";
  return n.taskId ? `/projects/${n.projectId}/tasks/${n.taskId}` : `/projects/${n.projectId}`;
}
