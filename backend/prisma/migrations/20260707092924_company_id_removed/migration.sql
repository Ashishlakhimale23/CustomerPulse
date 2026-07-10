/*
  Warnings:

  - You are about to drop the column `companyId` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Department" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyId";
