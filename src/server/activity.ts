import "server-only";
import type { ActivityAction, NotificationType, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export function logActivity(
  tx: Tx,
  entry: { projectId: string; actorId: string | null; taskId?: string; action: ActivityAction; message: string },
) {
  return tx.activityLog.create({ data: entry });
}

export function notify(
  tx: Tx,
  entry: { userId: string; projectId?: string; taskId?: string; type: NotificationType; message: string },
) {
  return tx.notification.create({ data: entry });
}
