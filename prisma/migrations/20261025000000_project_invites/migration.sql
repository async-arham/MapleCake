-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'MEMBER_INVITED';
ALTER TYPE "ActivityAction" ADD VALUE 'INVITE_DECLINED';
ALTER TYPE "ActivityAction" ADD VALUE 'INVITE_CANCELLED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INVITE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITE_DECLINED';

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProjectInvite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "inviterId" TEXT,
    "inviteeId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_projectId_inviteeId_key" ON "ProjectInvite"("projectId", "inviteeId");

-- CreateIndex
CREATE INDEX "ProjectInvite_inviteeId_status_idx" ON "ProjectInvite"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "ProjectInvite_projectId_status_idx" ON "ProjectInvite"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectInvite_createdAt_idx" ON "ProjectInvite"("createdAt");

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same Supabase protection as every other table: the public REST API can read nothing.
ALTER TABLE "ProjectInvite" ENABLE ROW LEVEL SECURITY;
