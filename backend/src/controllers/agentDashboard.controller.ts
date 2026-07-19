import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";
import { TicketStatus } from "../generated/prisma/client";

export interface StatusSegmentDTO {
  status: TicketStatus;
  hours: number;
}

/**
 * Turns a ticket's ordered TicketStatusHistory rows into the
 * {status, hours}[] "segments" shape the frontend charts expect, by
 * diffing consecutive changedAt timestamps. We diff timestamps rather
 * than trusting durationInPrevStatusMinutes because that column isn't
 * populated by the current write path (logStatusChange never sets it) —
 * this stays correct regardless.
 */
function buildSegments(
  history: { status: TicketStatus; changedAt: Date }[],
  createdAt: Date,
  currentStatus: TicketStatus,
  endBoundary: Date
): StatusSegmentDTO[] {
  // Ticket creation always writes an initial OPEN history row (see
  // ticket.service.createTicket), so history is normally non-empty and
  // already starts at ~createdAt. Only synthesize a single entry for the
  // rare legacy/seeded ticket with no history rows at all.
  const timeline = history.length > 0 ? history : [{ status: currentStatus, changedAt: createdAt }];

  const totalsByStatus = new Map<TicketStatus, number>();
  for (let i = 0; i < timeline.length; i++) {
    const start = timeline[i].changedAt;
    const end = timeline[i + 1] ? timeline[i + 1].changedAt : endBoundary;
    const hours = Math.max(0, (end.getTime() - start.getTime()) / 3600000);
    if (hours === 0) continue;
    const status = timeline[i].status;
    totalsByStatus.set(status, (totalsByStatus.get(status) ?? 0) + hours);
  }

  return Array.from(totalsByStatus.entries()).map(([status, hours]) => ({
    status,
    hours: Number(hours.toFixed(2)),
  }));
}

export const agentDashboardController = {
  // GET /agent-dashboard/analytics
  // Single lean payload for the agent's personal analytics console
  // (AgentDashboardmock.tsx). Returns every ticket assigned to the
  // signed-in agent — with status-history-derived time segments and its
  // category — plus the department's categories and an average TAT
  // baseline to compare the agent against. The frontend does all
  // range/tab filtering and chart aggregation client-side over this set,
  // same shape the mock data generator used to produce locally.
  async getAnalytics(req: AuthedRequest, res: Response) {
    const agentId = req.user!.id;

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        fullName: true,
        agentsdepartmentId: true,
        assignedDepartment: {
          select: {
            id: true,
            name: true,
            manager: { select: { fullName: true } },
            _count: { select: { agents: true } },
          },
        },
      },
    });

    if (!agent) throw new AppError("Agent not found", 404);

    const departmentId = agent.agentsdepartmentId;

    const [categories, tickets, deptOpenCount, deptBreachedCount, deptTotalCount] = await Promise.all([
      departmentId
        ? prisma.ticketCategory.findMany({
            where: { departmentId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([] as { id: string; name: string }[]),
      prisma.ticket.findMany({
        where: { assigneeId: agentId },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          priority: true,
          status: true,
          categoryId: true,
          category: { select: { name: true } },
          requester: { select: { fullName: true } },
          createdAt: true,
          slaDeadline: true,
          resolvedAt: true,
          slaBreached: true,
          turnOverTime: true, // seconds
          statusHistory: {
            select: { status: true, changedAt: true },
            orderBy: { changedAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      // Department-wide counts (all agents, not just the signed-in one) —
      // real numbers for the "You vs. department" / "Department snapshot"
      // cards, replacing what used to be client-side fabricated multipliers.
      departmentId
        ? prisma.ticket.count({ where: { departmentId, status: { not: TicketStatus.RESOLVED } } })
        : Promise.resolve(0),
      departmentId
        ? prisma.ticket.count({ where: { departmentId, slaBreached: true } })
        : Promise.resolve(0),
      departmentId ? prisma.ticket.count({ where: { departmentId } }) : Promise.resolve(0),
    ]);

    const now = new Date();

    const ticketDTOs = tickets.map((t) => {
      const endBoundary = t.resolvedAt ?? now;
      const segments = buildSegments(t.statusHistory, t.createdAt, t.status, endBoundary);
      const tatHours = t.turnOverTime != null ? Number((t.turnOverTime / 3600).toFixed(1)) : null;
      const dueInHrs = t.slaDeadline ? Math.round((t.slaDeadline.getTime() - now.getTime()) / 3600000) : null;

      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.title,
        requester: t.requester?.fullName ?? "Unknown",
        priority: t.priority,
        status: t.status,
        categoryId: t.categoryId,
        categoryName: t.category?.name ?? "Uncategorized",
        createdAt: t.createdAt,
        dueAt: t.slaDeadline,
        dueInHrs,
        resolvedAt: t.resolvedAt,
        tatHours,
        slaBreached: t.slaBreached,
        segments,
      };
    });

    // Department TAT baseline — average turnOverTime (seconds -> hours)
    // across every resolved ticket in the department (any assignee), so
    // "You vs. department" has something to compare the agent against.
    let departmentAvgTatHours: number | null = null;
    if (departmentId) {
      const agg = await prisma.ticket.aggregate({
        where: { departmentId, status: TicketStatus.RESOLVED, turnOverTime: { not: null } },
        _avg: { turnOverTime: true },
      });
      departmentAvgTatHours = agg._avg.turnOverTime != null ? Number((agg._avg.turnOverTime / 3600).toFixed(1)) : null;
    }

    // Real "Department snapshot" numbers — no more client-side guessed
    // multipliers off the agent's own stats. All null/0 when the agent
    // isn't assigned to a department yet.
    const agentOpenCount = ticketDTOs.filter((t) => t.status !== "RESOLVED").length;
    const departmentSnapshot = departmentId
      ? {
          departmentName: agent.assignedDepartment?.name ?? null,
          managerName: agent.assignedDepartment?.manager?.fullName ?? null,
          agentCount: agent.assignedDepartment?._count.agents ?? 0,
          openTickets: deptOpenCount,
          breachedTickets: deptBreachedCount,
          totalTickets: deptTotalCount,
          compliancePct: deptTotalCount ? Math.round(((deptTotalCount - deptBreachedCount) / deptTotalCount) * 100) : 100,
          yourOpenSharePct: deptOpenCount ? Math.round((agentOpenCount / deptOpenCount) * 100) : 0,
        }
      : null;

    res.json({
      agent: { id: agent.id, fullName: agent.fullName },
      department: agent.assignedDepartment ? { id: agent.assignedDepartment.id, name: agent.assignedDepartment.name } : null,
      departmentSnapshot,
      categories,
      tickets: ticketDTOs,
      departmentAvgTatHours,
    });
  },
};
