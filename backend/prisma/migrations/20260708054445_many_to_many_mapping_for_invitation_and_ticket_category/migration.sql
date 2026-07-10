-- CreateTable
CREATE TABLE "_InvitationToTicketCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InvitationToTicketCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InvitationToTicketCategory_B_index" ON "_InvitationToTicketCategory"("B");

-- AddForeignKey
ALTER TABLE "_InvitationToTicketCategory" ADD CONSTRAINT "_InvitationToTicketCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvitationToTicketCategory" ADD CONSTRAINT "_InvitationToTicketCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "TicketCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
