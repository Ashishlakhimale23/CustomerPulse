import { prisma } from "../lib/database";
import { AssignmentMethod, TicketStatus } from "../generated/prisma/client";
import { notificationService } from "./notification.service";
import { logStatusChange } from "./statushistory.service";
import { ASSIGNABLE_AGENT_ROLES } from "../utils/rbac";
import { AppError } from "../middleware/errorHandler";


const OPEN_STATUSES: TicketStatus[] = [ TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PENDING];

export const assignmentService = {
  /**
   * Picks the best agent for a ticket, in priority order:
   *
   *   1. CATEGORY MATCH (primary, when the ticket has a categoryId):
   *      candidates = agents explicitly linked to that category via
   *      CategoryAgent. Scored by proficiency, tie-broken by lowest
   *      current open-ticket load.
   *   2. KEYWORD MATCH (fallback, used whenever there's no category, or
   *      the category has zero linked agents): candidates = active,
   *      available agents in the department at the required support
   *      level, scored by how many of the ticket's linked keywords
   *      match their declared skills (UserKeyword), weighted by
   *      proficiency.
   *   3. LOAD-BALANCE FALLBACK: if neither of the above produces a
   *      match, fall back to the least-loaded eligible agent in the
   *      department so a ticket never sits permanently unassigned just
   *      because nobody's skills/category lined up.
   *
   * All three respect maxActiveTickets - an agent at capacity is never
   * selected, regardless of how good their match score is.
   */
  async findBestAgent(ticketId: string) {
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: { keywords: true },
    });

    // ---- 1. Category-based match (primary) ----
    if (ticket.categoryId) {
      const categoryAgents = await prisma.categoryAgent.findMany({
        where: { categoryId: ticket.categoryId },
        include: {
          agent: {
            include: { ticketsAssigned: { where: { status: { in: OPEN_STATUSES } }, select: { id: true } } },
          },
        },
      });

      const eligible = categoryAgents
        .filter((ca) => ca.agent.isActive && ca.agent.isAvailableForAssignment)
        .filter((ca) => !ticket.supportLevel || ca.agent.supportLevel === ticket.supportLevel)
        .map((ca) => ({ agent: ca.agent, proficiency: ca.proficiency, openCount: ca.agent.ticketsAssigned.length }))
        .filter((c) => c.openCount < c.agent.maxActiveTickets);

      if (eligible.length > 0) {
        eligible.sort((a, b) => b.proficiency - a.proficiency || a.openCount - b.openCount);
        return { agent: eligible[0].agent, method: AssignmentMethod.AUTO_CATEGORY };
      }
      // No eligible category agents - fall through to keyword matching
      // below rather than returning null immediately.
    }

    // ---- 2. Keyword/skill match (fallback when no category, or category has no agents) ----
    const candidates = await prisma.user.findMany({
      where: {
        departmentId: ticket.departmentId,
        role: { in: ASSIGNABLE_AGENT_ROLES },
        isActive: true,
        isAvailableForAssignment: true,
        ...(ticket.supportLevel ? { supportLevel: ticket.supportLevel } : {}),
      },
      include: {
        skills: true,
        ticketsAssigned: { where: { status: { in: OPEN_STATUSES } }, select: { id: true } },
      },
    });

    if (candidates.length === 0) return null;

    const ticketKeywordIds = new Set(ticket.keywords.map((k) => k.keywordId));

    const scored = candidates
      .map((agent) => {
        const skillScore = agent.skills
          .filter((s) => ticketKeywordIds.has(s.keywordId))
          .reduce((sum, s) => sum + s.proficiency, 0);
        const openCount = agent.ticketsAssigned.length;
        const atCapacity = openCount >= agent.maxActiveTickets;
        return { agent, skillScore, openCount, atCapacity };
      })
      .filter((c) => !c.atCapacity);

    if (scored.length === 0) return null;

    const hasSkillMatch = scored.some((c) => c.skillScore > 0);
    const pool = hasSkillMatch ? scored.filter((c) => c.skillScore > 0) : scored;

    // ---- 3. Load-balance fallback is just "no skill match" above, same pool ----
    pool.sort((a, b) => b.skillScore - a.skillScore || a.openCount - b.openCount);

    return {
      agent: pool[0].agent,
      method: hasSkillMatch ? AssignmentMethod.AUTO_KEYWORD : AssignmentMethod.AUTO_LOAD_BALANCE,
    };
  },

  async autoAssign(ticketId: string, assignedById?: string) {
    const result = await this.findBestAgent(ticketId);
    if (!result) {
      // Leave unassigned - it'll surface on the department's unassigned
      // queue / SLA job rather than being silently dropped.
      return null;
    }

    const previous = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: result.agent.id,
        assignedById: assignedById ?? null,
        assignmentMethod: result.method,
        assignedAt: new Date(),
        status: TicketStatus.OPEN,
      },
    });

    if (previous.status !== TicketStatus.OPEN) {
      await logStatusChange({ ticketId, fromStatus: previous.status, toStatus: TicketStatus.OPEN, changedById: assignedById ?? null });
    }

    await notificationService.sendTicketAssigned(ticket, result.agent);
    return ticket;
  },

  async manualAssign(ticketId: string, agentId: string, assignedById: string) {
    const agent = await prisma.user.findUniqueOrThrow({ where: { id: agentId } });
    const previous = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    // find the assignee and check the number of tickets   
    if (!agent || !previous ){
      throw new AppError('agent or ticket not found',401)
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: agentId,
        assignedById,
        assignmentMethod: AssignmentMethod.MANUAL,
        assignedAt: new Date(),
        status: TicketStatus.OPEN,
      },
    });

    if (previous.status !== TicketStatus.OPEN) {
      await logStatusChange({ ticketId, fromStatus: previous.status, toStatus: TicketStatus.OPEN, changedById: assignedById });
    }

    await notificationService.sendTicketAssigned(ticket, agent);
    return ticket;
  },
};
