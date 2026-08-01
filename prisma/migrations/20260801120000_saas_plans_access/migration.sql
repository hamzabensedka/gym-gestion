-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'GROWTH', 'PRO');

-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('DESK_ONLY', 'KIOSK', 'BADGE_PC_EXTENSION', 'VENDOR_CONNECTOR', 'NEW_ACCESS_KIT');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'STARTER',
ADD COLUMN     "accessMode" "AccessMode" NOT NULL DEFAULT 'DESK_ONLY',
ADD COLUMN     "planStatus" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "maxStaff" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "lastAccessExportAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "badgeNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_gymId_badgeNumber_key" ON "Member"("gymId", "badgeNumber");
