/*
  Warnings:

  - You are about to drop the column `cxoId` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `managerId` on the `Department` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_cxoId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_managerId_fkey";

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "cxoId",
DROP COLUMN "managerId";

-- CreateTable
CREATE TABLE "_departmentManager" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_departmentManager_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_departmentCxo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_departmentCxo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_departmentManager_B_index" ON "_departmentManager"("B");

-- CreateIndex
CREATE INDEX "_departmentCxo_B_index" ON "_departmentCxo"("B");

-- AddForeignKey
ALTER TABLE "_departmentManager" ADD CONSTRAINT "_departmentManager_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_departmentManager" ADD CONSTRAINT "_departmentManager_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_departmentCxo" ADD CONSTRAINT "_departmentCxo_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_departmentCxo" ADD CONSTRAINT "_departmentCxo_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
