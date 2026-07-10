/*
  Warnings:

  - Added the required column `site` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "site" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL;
