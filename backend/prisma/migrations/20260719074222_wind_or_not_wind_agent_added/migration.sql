-- CreateEnum
CREATE TYPE "WindCategory" AS ENUM ('WIND', 'NON_WIND', 'BOTH');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "windCategory" "WindCategory";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "windCategory" "WindCategory";
