-- CreateEnum
CREATE TYPE "MemberInviteStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "email" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteStatus" "MemberInviteStatus",
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Member_inviteToken_key" ON "Member"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Member_gymId_email_key" ON "Member"("gymId", "email");

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "Member"("email");
