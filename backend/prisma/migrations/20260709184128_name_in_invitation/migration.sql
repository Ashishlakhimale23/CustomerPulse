/*
  Warnings:

  - You are about to drop the column `tags` on the `Ticket` table. All the data in the column will be lost.
  - Added the required column `name` to the `Invitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "tags";
