-- CreateEnum
CREATE TYPE "UtilityType" AS ENUM ('WATER', 'ELECTRICITY', 'GAS');

-- CreateTable
CREATE TABLE "UtilityBill" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "type" "UtilityType" NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilityBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UtilityBill_gymId_periodMonth_idx" ON "UtilityBill"("gymId", "periodMonth");

-- CreateIndex
CREATE INDEX "UtilityBill_gymId_type_idx" ON "UtilityBill"("gymId", "type");

-- AddForeignKey
ALTER TABLE "UtilityBill" ADD CONSTRAINT "UtilityBill_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityBill" ADD CONSTRAINT "UtilityBill_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
