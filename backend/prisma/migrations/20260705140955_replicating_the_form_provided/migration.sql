/*
  Warnings:

  - Added the required column `clientEmail` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientName` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateOfOccurance` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "Representative" TEXT,
ADD COLUMN     "clientEmail" TEXT NOT NULL,
ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "dateOfOccurance" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "employeeId" TEXT;
