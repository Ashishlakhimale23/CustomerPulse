-- AlterTable
ALTER TABLE "TicketComment" ADD COLUMN     "attachmentId" TEXT;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "TicketAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
