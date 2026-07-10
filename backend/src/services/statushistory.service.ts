import { prisma } from "../lib/database";
import { TicketStatus } from "../generated/prisma/client";

/**
 * Single place that records a status transition. Called from ticket
 * creation (NEW), ticket.controller.update, ticket.service.resolveTicket,
 * and escalation.service.escalate (which moves status to IN_PROGRESS) -
 * every status change should go through this, per the requirement that
 * every change be reflected in both TicketStatusHistory and the audit
 * trail, not just the resolvedAt/closedAt columns on Ticket itself.
 */
export async function logStatusChange(params: {
  ticketId: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedById: string | null;
  note?: string;
}) {
  const { ticketId, fromStatus, toStatus, changedById, note } = params;

  await prisma.ticketStatusHistory.create({
    data: { ticketId, fromStatus: fromStatus ?? undefined, status: toStatus, changedById: changedById ?? undefined, note },
  });

  if (changedById) {
    await prisma.auditLog.create({
      data: {
        userId: changedById,
        action: "TICKET_STATUS_CHANGED",
        entityType: "Ticket",
        entityId: ticketId,
      },
    });
  }
}