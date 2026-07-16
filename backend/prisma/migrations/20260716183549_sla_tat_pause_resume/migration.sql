-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "holdStartedAt" TIMESTAMP(3),
ADD COLUMN     "slaRemainingMinutes" INTEGER,
ADD COLUMN     "totalHoldMinutes" INTEGER NOT NULL DEFAULT 0;
