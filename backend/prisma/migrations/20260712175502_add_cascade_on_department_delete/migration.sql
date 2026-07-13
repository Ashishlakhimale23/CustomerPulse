-- DropForeignKey
ALTER TABLE "KeywordSuggestion" DROP CONSTRAINT "KeywordSuggestion_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCategory" DROP CONSTRAINT "TicketCategory_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketKeyword" DROP CONSTRAINT "TicketKeyword_keywordId_fkey";

-- DropForeignKey
ALTER TABLE "TicketKeyword" DROP CONSTRAINT "TicketKeyword_ticketId_fkey";

-- AddForeignKey
ALTER TABLE "KeywordSuggestion" ADD CONSTRAINT "KeywordSuggestion_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketKeyword" ADD CONSTRAINT "TicketKeyword_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketKeyword" ADD CONSTRAINT "TicketKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCategory" ADD CONSTRAINT "TicketCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
