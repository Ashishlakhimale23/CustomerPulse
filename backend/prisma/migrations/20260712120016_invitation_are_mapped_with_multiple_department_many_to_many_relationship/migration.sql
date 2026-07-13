/*
  Warnings:

  - You are about to drop the column `departmentId` on the `Invitation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_departmentId_fkey";

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "departmentId";

-- CreateTable
CREATE TABLE "_DepartmentToInvitation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentToInvitation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DepartmentToInvitation_B_index" ON "_DepartmentToInvitation"("B");

-- AddForeignKey
ALTER TABLE "_DepartmentToInvitation" ADD CONSTRAINT "_DepartmentToInvitation_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToInvitation" ADD CONSTRAINT "_DepartmentToInvitation_B_fkey" FOREIGN KEY ("B") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
