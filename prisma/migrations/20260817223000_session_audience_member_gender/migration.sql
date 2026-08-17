-- CreateEnum
CREATE TYPE "MemberGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "SessionAudience" AS ENUM ('MIXED', 'LADIES', 'MEN');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "gender" "MemberGender";

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN "audience" "SessionAudience" NOT NULL DEFAULT 'MIXED';
