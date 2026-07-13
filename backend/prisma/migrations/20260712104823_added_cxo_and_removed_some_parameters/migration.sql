/*
  Warnings:

  - The values [L3,L4] on the enum `SupportLevel` will be removed. If these variants are still used in the database, this will fail.
  - The values [DEPT_MANAGER,EMPLOYEE] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `state` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `minSupportLevel` on the `TicketCategory` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `managerId` on the `User` table. All the data in the column will be lost.
  - Added the required column `projectName` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cxoId` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `managerId` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turnoverRate` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SupportLevel_new" AS ENUM ('L1', 'L2');
ALTER TABLE "public"."TicketCategory" ALTER COLUMN "minSupportLevel" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "supportLevel" TYPE "SupportLevel_new" USING ("supportLevel"::text::"SupportLevel_new");
ALTER TABLE "Ticket" ALTER COLUMN "supportLevel" TYPE "SupportLevel_new" USING ("supportLevel"::text::"SupportLevel_new");
ALTER TABLE "TicketEscalation" ALTER COLUMN "fromLevel" TYPE "SupportLevel_new" USING ("fromLevel"::text::"SupportLevel_new");
ALTER TABLE "TicketEscalation" ALTER COLUMN "toLevel" TYPE "SupportLevel_new" USING ("toLevel"::text::"SupportLevel_new");
ALTER TABLE "Invitation" ALTER COLUMN "supportLevel" TYPE "SupportLevel_new" USING ("supportLevel"::text::"SupportLevel_new");
ALTER TYPE "SupportLevel" RENAME TO "SupportLevel_old";
ALTER TYPE "SupportLevel_new" RENAME TO "SupportLevel";
ALTER TABLE "TicketCategory" ALTER COLUMN "minSupportLevel" TYPE "SupportLevel" USING ("minSupportLevel"::text::"SupportLevel");
DROP TYPE "public"."SupportLevel_old";
COMMIT;

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('CXO', 'GLOBAL_ADMIN', 'HOD', 'AGENT', 'REQUESTER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'REQUESTER';
COMMIT;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "projectName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "cxoId" TEXT NOT NULL,
ADD COLUMN     "managerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "state",
ADD COLUMN     "turnOverTime" DOUBLE PRECISION,
ADD COLUMN     "turnoverRate" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "TicketCategory" DROP COLUMN "minSupportLevel";

-- AlterTable
ALTER TABLE "TicketStatusHistory" ADD COLUMN     "durationInPrevStatusMinutes" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "departmentId",
DROP COLUMN "managerId",
ADD COLUMN     "agentsdepartmentId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'REQUESTER';

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_cxoId_fkey" FOREIGN KEY ("cxoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agentsdepartmentId_fkey" FOREIGN KEY ("agentsdepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
