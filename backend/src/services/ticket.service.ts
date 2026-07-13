import { prisma } from "../lib/database";
import { generateTicketNumber } from "../utils/token";
import { priorityService } from "./priority.service";
import { keywordService } from "./keyword.service";
import { assignmentService } from "./assignment.service";
import { notificationService } from "./notification.service";
import { logStatusChange } from "./statushistory.service";
import { Prisma, TicketPriority, SupportLevel, TicketStatus } from "../generated/prisma/client";
import { hoursFromNow } from "../utils/time";

// Baseline hours used when there's no categoryId, or the category exists
// but was never given a defaultSlaHours. category.defaultSlaHours, when
// set, overrides this baseline entirely.
const BASE_SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  P1: 4,
  P2: 8,
  P3: 24,
  P4: 72,
};

export const ticketService = {
  /**
   * generateTicketNumber() mixes a year-month prefix with random bytes,
   * so a collision on the unique ticketNumber index is very unlikely -
   * but under high write volume it's not impossible, so this retries
   * with a freshly generated number instead of failing ticket creation
   * outright on a P2002 unique violation.
   *
   * Typed against Prisma.TicketUncheckedCreateInput specifically (the
   * raw-foreign-key variant) rather than deriving the type from
   * Parameters<...> of prisma.ticket.create - that create() data param
   * is a discriminated union of the "unchecked" and "checked" (connect)
   * shapes, and spreading a derived type collapses that union into
   * something that satisfies neither branch.
   */
  async createTicketWithUniqueNumber(data: Omit<Prisma.TicketUncheckedCreateInput, "ticketNumber">) {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await prisma.ticket.create({
          data: { ...data, ticketNumber: generateTicketNumber() },
        });
      } catch (err: any) {
        const isUniqueViolation = err?.code === "P2002" && err?.meta?.target?.includes("ticketNumber");
        if (!isUniqueViolation || attempt === MAX_ATTEMPTS) throw err;
      }
    }
    throw new Error("Failed to generate a unique ticket number");
  },

  async createTicket(params: {
    requesterId: string;
    departmentId: string;
    categoryId?: string;
    title: string;
    description?: string;
    tags?: string[];
    // Fields from the client-issue intake form. representative and
    // employeeId are optional - a new SML hire may not have system
    // access yet, so someone else raises the ticket on their behalf.
    representative?: string;
    employeeId?: string;
    clientName: string;
    clientEmail: string;
    dateOfOccurance: Date | string;
    site: string;
    state: string;
  }) {
    const {
      requesterId, departmentId, categoryId, title, description, tags = [],
      representative, employeeId, clientName, clientEmail, dateOfOccurance, site, state,
    } = params;

    const requester = await prisma.user.findUniqueOrThrow({ where: { id: requesterId } });
    const category = categoryId
      ? await prisma.ticketCategory.findUnique({ where: { id: categoryId } })
      : null;
 // this need to reworked on not role based get the average or default sla hours for departments
    const priority = priorityService.computePriority({
      categoryDefaultPriority: category?.defaultPriority,
    });

    const baseSlaHours = category?.defaultSlaHours ?? BASE_SLA_HOURS_BY_PRIORITY[priority];
    const slaDeadline = hoursFromNow(baseSlaHours);

    
    const ticket = await this.createTicketWithUniqueNumber({
      title,
      description,
      requesterId,
      departmentId,
      categoryId:category?.id,
      representative,
      employeeId,
      clientName,
      clientEmail,
      dateOfOccurance: new Date(dateOfOccurance),
      site,
      priority,
      internalPriority: priority,
      slaDeadline,
    });

    await logStatusChange({ ticketId: ticket.id, fromStatus: null, toStatus: TicketStatus.OPEN, changedById: requesterId });

    // Keyword extraction runs before assignment so the matcher has
    // something to score against if there's no category (or the
    // category has no agents assigned).
    await keywordService.extractAndLinkKeywords({
      ticketId: ticket.id,
      departmentId,
      text: `${title} ${description ?? ""}`,
    });

    await notificationService.sendTicketCreated(ticket, requester);
    await assignmentService.autoAssign(ticket.id);

    return prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: { keywords: { include: { keyword: true } }, assignee: true },
    });
  },

  async resolveTicket(ticketId: string, resolvedById: string) {
    const previous = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.RESOLVED, resolvedAt: new Date() },
      include: { requester: true },
    });
    await logStatusChange({ ticketId, fromStatus: previous.status, toStatus: TicketStatus.RESOLVED, changedById: resolvedById });
    await notificationService.sendTicketResolved(ticket, ticket.requester);
    return ticket;
  },
};
