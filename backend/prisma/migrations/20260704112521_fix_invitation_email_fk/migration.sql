-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_email_fkey";

-- DropIndex
DROP INDEX "Department_companyId_name_key";
