/*
  Warnings:

  - The `internalPriority` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InternalPriorityLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "internalPriority",
ADD COLUMN     "internalPriority" "InternalPriorityLevel" NOT NULL DEFAULT 'LOW';
