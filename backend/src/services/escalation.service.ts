import { prisma } from "../lib/database";
import { SupportLevel, TicketStatus, UserRole, TicketPriority, InternalPriorityLevel } from "../generated/prisma/client";
import { notificationService } from "./notification.service";

const LEVEL_ORDER: SupportLevel[] = [SupportLevel.L1, SupportLevel.L2];

function nextLevel(current: SupportLevel | null): SupportLevel {
  const idx = current ? LEVEL_ORDER.indexOf(current) : -1;
  return LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
}

export const escalationService = {
  /**
   * Manual escalation - an agent/manager pushing a ticket up a level
   * (e.g. "I can't fix this, needs L3"). Picks the best-fit agent at
   * the target level using the same keyword-skill logic as assignment,
   * falling back to least-loaded if there's no skill match.
   */
  async escalate(params: {
    ticketId: string;
    reason: string;
    escalatedById: string;
    toLevel?: SupportLevel;
    isAutomatic?: boolean;
  }) {
    const { ticketId, reason, escalatedById, isAutomatic = false } = params;

    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: { keywords: true },
    });

    /*

    const fromLevel = ticket.supportLevel;
    const toLevel = params.toLevel ?? nextLevel(fromLevel);


    const ticketKeywordIds = new Set(ticket.keywords.map((k) => k.keywordId));

    const candidates = await prisma.user.findMany({
      where: {
        agentsdepartmentId: ticket.departmentId,
        role: { in: [UserRole.AGENT] },
        supportLevel: toLevel,
        isActive: true,
      },
      include: {
        skills: true,
        ticketsAssigned: { where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.ON_HOLD] } }, select: { id: true } },
      },
    });

    if (candidates.length === 0) {
      throw new Error(`No available agents found at support level ${toLevel} in this department`);
    }

    const scored = candidates
      .map((c) => ({
        agent: c,
        skillScore: c.skills.filter((s) => ticketKeywordIds.has(s.keywordId)).length,
        openCount: c.ticketsAssigned.length,
      }))
      .sort((a, b) => b.skillScore - a.skillScore || a.openCount - b.openCount);

    const target = scored[0].agent;

    */

    const [escalation, updatedTicket] = await prisma.$transaction([
      prisma.ticketEscalation.create({
        data: {
          ticketId,
          fromLevel: 'L1',
          toLevel: 'L1',
          escalatedById,
          escalatedToId:ticket.assigneeId!,
          reason,
          isAutomatic,
        },
      }),

      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          supportLevel: 'L1',
          assigneeId: ticket.assigneeId,
          escalatedToId: ticket.assigneeId,
          escalatedAt: new Date(),
          escalationReason: reason,
          status: TicketStatus.IN_PROGRESS,
        },
      }),
    ]);

    const cxo = await prisma.department.findFirst({
      where :  {
         id : ticket.departmentId,
      },
      select : {
        cxo : {
          select : {
            email : true,
            fullName : true
          }
        }
      }
    })

    await notificationService.sendTicketEscalated(updatedTicket, escalation, cxo?.cxo!);
    return { escalation, ticket: updatedTicket };
  },

  /**
   * Called by the SLA cron job (jobs/scheduler.ts). Finds tickets past
   * their slaDeadline that aren't resolved/closed and haven't already
   * been flagged, auto-escalates each one a level, and notifies both
   * the new owner and the requester's manager chain isn't touched here
   * (kept scoped to support escalation, not org escalation).
   */
  async runSlaSweep() {

    const breached = await prisma.ticket.findMany({
      where: {
        slaDeadline: { lt: new Date() },
        slaBreached: false,
        // ON_HOLD/RESOLVED tickets have their SLA clock paused (slaDeadline
        // cleared), so this notIn is mostly belt-and-suspenders - the null
        // deadline already excludes them - but keeps intent explicit.
        status: { notIn: [TicketStatus.RESOLVED, TicketStatus.ON_HOLD] },
      },
    });

    console.log(breached)

    const results = [];
    for (const ticket of breached) {

      const breachedTicket = await prisma.ticket.update({ 
        where: { id: ticket.id }, 
        data: { slaBreached: true },
        select:{assignee:{select:{fullName:true}}} 
      });

      try {

        /*
        const escalatedBy = ticket.assigneeId ?? ticket.requesterId; // system acts "as" current owner
        const result = await this.escalate({
          ticketId: ticket.id,
          reason: "Automatic escalation: SLA deadline breached",
          escalatedById: escalatedBy,
          isAutomatic: true,
        });

        */
        const managerAndCxo = await prisma.department.findFirst({
          where:{id:ticket.departmentId},
          select :  {
            name : true,
            manager :{select:{email:true,fullName:true}},
            cxo : {select:{email:true,fullName:true}}
          }
        })

        if(!managerAndCxo || !managerAndCxo.cxo?.email || !managerAndCxo.manager?.email || !breachedTicket.assignee?.fullName){
          results.push("Manager and CXO doesn't exists for this department")
          return results
        }

        await notificationService.sendSlaBreachWarning(ticket,{email:managerAndCxo.manager.email,departmentName:managerAndCxo.name,assigneeName:breachedTicket.assignee?.fullName});

        results.push(`Notification has been sent to ${managerAndCxo.manager.fullName}`);
      } catch (err) {
        // No agent available at the next level - leave it flagged as
        // breached so it shows up on dashboards even without an escalation record.
        console.error(`[sla-sweep] could not auto-escalate ticket ${ticket.ticketNumber}:`, err);
      }
    }
    return results;
  },
};

function bumpPriority(p: InternalPriorityLevel): InternalPriorityLevel {
  const order = [
    InternalPriorityLevel.CRITICAL,
    InternalPriorityLevel.HIGH,
    InternalPriorityLevel.MEDIUM,
    InternalPriorityLevel.LOW,
  ];
  const idx = order.indexOf(p);
  return order[Math.max(idx - 1, 0)];
}

