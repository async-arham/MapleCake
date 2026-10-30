-- AlterTable: notifications can be dismissed ("deleted") by the person without losing the record
-- that an overdue alert was already sent (so it is never sent twice).
ALTER TABLE "Notification" ADD COLUMN "dismissedAt" TIMESTAMP(3);
