CREATE TYPE "PlanRequestSource" AS ENUM ('PUBLIC', 'GYM');
CREATE TYPE "PlanRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'DONE');

ALTER TABLE "Gym" ADD COLUMN "planTrialEndsAt" TIMESTAMP(3);

CREATE TABLE "PlanRequest" (
    "id" TEXT NOT NULL,
    "source" "PlanRequestSource" NOT NULL,
    "status" "PlanRequestStatus" NOT NULL DEFAULT 'NEW',
    "plan" "Plan" NOT NULL,
    "gymName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gymId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanRequest_email_createdAt_idx" ON "PlanRequest"("email", "createdAt");
CREATE INDEX "PlanRequest_gymId_idx" ON "PlanRequest"("gymId");

ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
