-- DropForeignKey
ALTER TABLE "Keyword" DROP CONSTRAINT "Keyword_departmentId_fkey";

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
