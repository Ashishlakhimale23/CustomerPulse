import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { TicketPriority, TicketStatus, UserRole } from "../generated/prisma/client";
import { diffInMinutes, addMinutes } from "../utils/time";

// Baseline minutes used when a ticket has no category, or its category
// was never given a defaultSlaMinutes. Kept in sync with the fallback in
// ticket.service.ts / ticket.controller.ts - used here only to make sense
// of tickets whose slaTotalMinutes predates that field (see
// resolveConsumedMinutes below).
const BASE_SLA_MINUTES_BY_PRIORITY: Record<TicketPriority, number> = {
  P1: 4 * 60,
  P2: 8 * 60,
  P3: 24 * 60,
  P4: 72 * 60,
};

// Statuses whose SLA clock is actively running - i.e. NOT paused. This
// mirrors slaClock.service.ts's SLA_PAUSED_STATUSES (ON_HOLD, RESOLVED),
// just expressed as the inverse "active" set since that's what we're
// filtering for here.
const ACTIVE_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.REOPENED,
  TicketStatus.IN_PROGRESS,
];

/**
 * How much of a ticket's SLA window has already been used up, in minutes.
 *
 * We know the total window that was last granted to the ticket
 * (slaTotalMinutes) and, since the ticket is currently active, how much
 * of it is left (the gap between now and slaDeadline). Consumed = total
 * - remaining. If the ticket predates slaTotalMinutes being tracked,
 * fall back to the category's *previous* SLA value (or the priority
 * baseline) as the best guess of what its original window was.
 */
function resolveConsumedMinutes(
  ticket: { slaDeadline: Date | null; slaTotalMinutes: number | null; priority: TicketPriority },
  previousCategorySlaMinutes: number | null | undefined,
  now: Date
): number {
  if (!ticket.slaDeadline) return 0;

  const remaining = diffInMinutes(now, ticket.slaDeadline);
  const total = ticket.slaTotalMinutes
    ?? previousCategorySlaMinutes
    ?? BASE_SLA_MINUTES_BY_PRIORITY[ticket.priority];

  return Math.max(0, total - remaining);
}

// NOTE(added): isWorkStopping / isSafetyViolation are set by an admin when
// configuring a category and are only ever meant to be seen by the roles
// that can configure categories (GLOBAL_ADMIN, HOD) - requesters/agents/
// CXOs fetching the category list (e.g. for the ticket form) never get
// these two fields back.
const ADMIN_ONLY_FIELD_ROLES: UserRole[] = [UserRole.GLOBAL_ADMIN, UserRole.HOD];

function stripAdminOnlyFields<T extends { isWorkStopping?: boolean; isSafetyViolation?: boolean }>(
  category: T,
  role: UserRole | undefined
): T {
  if (role && ADMIN_ONLY_FIELD_ROLES.includes(role)) return category;
  const { isWorkStopping, isSafetyViolation, ...rest } = category;
  return rest as T;
}

export const ticketCategoryController = {
  // POST /departments/:departmentId/categories
  // { name, defaultSlaMinutes, defaultPriority, subDepartmentId?, isWorkStopping?, isSafetyViolation? }
  // (GLOBAL_ADMIN, HOD). This is where the SLA/priority defaults
  // ticketService reads from get configured, along with the optional
  // sub-department scoping and the admin-only classification flags.
  async create(req: AuthedRequest, res: Response) {
    const category = await prisma.ticketCategory.create({
      data: {
        departmentId: req.params.departmentId,
        subDepartmentId: req.body.subDepartmentId || null,
        name: req.body.name,
        defaultSlaMinutes: req.body.defaultSlaMinutes,
        defaultPriority: req.body.defaultPriority,
        isWorkStopping: !!req.body.isWorkStopping,
        isSafetyViolation: !!req.body.isSafetyViolation,
      },
    });
    res.status(201).json(category);
  },

  // GET /departments/:departmentId/categories?subDepartmentId=...
  // When subDepartmentId is provided, only categories mapped to that
  // sub-department are returned (a subset of the department's categories).
  // When it's omitted, every category under the department is returned,
  // regardless of whether it's mapped to a sub-department or not - this is
  // what the ticket form uses before a sub-department has been chosen.
  async list(req: AuthedRequest, res: Response) {
    const { subDepartmentId } = req.query;
    const categories = await prisma.ticketCategory.findMany({
      where: {
        departmentId: req.params.departmentId,
        ...(subDepartmentId ? { subDepartmentId: String(subDepartmentId) } : {}),
      },
    });
    res.json(categories.map((c) => stripAdminOnlyFields(c, req.user?.role)));
  },

  // PATCH /categories/:id
  // When defaultSlaMinutes is being changed, every currently-active ticket
  // in this category (i.e. not ON_HOLD/RESOLVED - see ACTIVE_TICKET_STATUSES)
  // has its SLA deadline recalculated from the new value, minus whatever
  // SLA time it has already consumed - it does NOT just get the full new
  // window bolted on top of its existing deadline.
  async update(req: AuthedRequest, res: Response) {
    const previousCategory = await prisma.ticketCategory.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { defaultSlaMinutes: true },
    });

    const nextSlaMinutes: number | undefined = req.body.defaultSlaMinutes;
    const slaIsChanging =
      nextSlaMinutes !== undefined && nextSlaMinutes !== previousCategory.defaultSlaMinutes;

    const category = await prisma.ticketCategory.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        defaultSlaMinutes: req.body.defaultSlaMinutes,
        defaultPriority: req.body.defaultPriority,
        ...(req.body.subDepartmentId !== undefined
          ? { subDepartmentId: req.body.subDepartmentId || null }
          : {}),
        ...(req.body.isWorkStopping !== undefined
          ? { isWorkStopping: !!req.body.isWorkStopping }
          : {}),
        ...(req.body.isSafetyViolation !== undefined
          ? { isSafetyViolation: !!req.body.isSafetyViolation }
          : {}),
      },
    });

    if (slaIsChanging) {
      const now = new Date();
      const activeTickets = await prisma.ticket.findMany({
        where: {
          categoryId: category.id,
          status: { in: ACTIVE_TICKET_STATUSES },
        },
        select: {
          id: true,
          priority: true,
          slaDeadline: true,
          slaTotalMinutes: true,
        },
      });

      await Promise.all(
        activeTickets.map((ticket) => {
          const consumedMinutes = resolveConsumedMinutes(
            ticket,
            previousCategory.defaultSlaMinutes,
            now
          );
          const remainingMinutes = nextSlaMinutes - consumedMinutes;

          return prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              // remainingMinutes can go negative if the ticket had already
              // consumed more than the new, shorter SLA - that lands the
              // deadline in the past, i.e. immediately breached, which the
              // SLA sweep job will pick up on its next run.
              slaDeadline: addMinutes(now, remainingMinutes),
              slaTotalMinutes: nextSlaMinutes,
            },
          });
        })
      );
    }

    res.json(category);
  },

  async delete(req:AuthedRequest,res:Response){
    const deleteCategory = await prisma.ticketCategory.delete({
      where : {id:req.params.id}
    })
    res.status(200).json({message:"delete the category"})
  }


  
};

  
};

