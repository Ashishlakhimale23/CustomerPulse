-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_cxoId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_managerId_fkey";

-- AlterTable
ALTER TABLE "Department" ALTER COLUMN "cxoId" DROP NOT NULL,
ALTER COLUMN "managerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_cxoId_fkey" FOREIGN KEY ("cxoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
