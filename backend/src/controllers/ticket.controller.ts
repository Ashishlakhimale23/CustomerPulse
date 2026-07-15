import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { ticketService } from "../services/ticket.service";
import { escalationService } from "../services/escalation.service";
import { assignmentService } from "../services/assignment.service";
import { logStatusChange } from "../services/statushistory.service";
import { prisma } from "../lib/database";
import { TicketPriority, TicketStatus, UserRole } from "../generated/prisma/client";
import { isRequesterOnly } from "../utils/rbac";
import { parsePagination, paginatedResponse } from "../utils/pagination";
import { AppError } from "../middleware/errorHandler";
import { hoursFromNow } from "../utils/time";
import { prismaVersion } from "../generated/prisma/internal/prismaNamespace";
import { notificationService } from "../services/notification.service";
import { id } from "zod/v4/locales";

// Roles whose "list" view is scoped to just their department, rather
// than being requester-only (see below) or company-wide (GLOBAL_ADMIN).
const DEPARTMENT_SCOPED_ROLES: UserRole[] = [ UserRole.HOD];

const BASE_SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  P1: 4,
  P2: 8,
  P3: 24,
  P4: 72,
};

export const ticketController = {

  async myTickets(req: AuthedRequest, res: Response) {
    if (!req.params.id) throw new AppError("Invalid user")

    const tickets = await prisma.ticket.findMany({
      where: {
        requesterId: req.params.id,
        status : {notIn : [TicketStatus.ON_HOLD,TicketStatus.RESOLVED]}
      }, select: {
        createdAt : true,
        ticketNumber: true,
        id : true,
        priority: true,
        status: true,
        clientName: true,
        department: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            fullName: true
          }
        },
      }

    })

    res.json(tickets)

  },

  async resolved(req: AuthedRequest, res: Response) {
    if (!req.params.id) throw new AppError("Invalid user")

    const tickets = await prisma.ticket.findMany({
      where: {
        requesterId: req.params.id,
        status : TicketStatus.RESOLVED
      }, select: {
        createdAt: true,
        ticketNumber: true,
        id: true,
        priority: true,
        status: true,
        clientName: true,
        department: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            fullName: true
          }
        },
      }

    })

    res.json(tickets)

  },

  async onhold(req: AuthedRequest, res: Response) {
    if (!req.params.id) throw new AppError("Invalid user")

    const tickets = await prisma.ticket.findMany({
      where: {
        requesterId: req.params.id,
        status : TicketStatus.ON_HOLD
      }, select: {
        createdAt: true,
        ticketNumber: true,
        id: true,
        priority: true,
        status: true,
        clientName: true,
        department: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            fullName: true
          }
        },
      }

    })

    res.json(tickets)

  },



  // POST /tickets
  async create(req: AuthedRequest, res: Response) {
    const ticket = await ticketService.createTicket({
      requesterId: req.user!.id,
      departmentId: req.body.departmentId,
      categoryId: req.body.categoryId,
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      representative: req.body.representative,
      employeeId: req.body.employeeId,
      clientName: req.body.clientName,
      clientEmail: req.body.clientEmail,
      dateOfOccurance: req.body.dateOfOccurance,
      site: req.body.site,
      state: req.body.state,
    });
    res.status(201).json(ticket);
  },

  // GET /tickets?departmentId=&status=&assigneeId=&priority=&page=&limit=
  //
  // Visibility rules:
  //   - REQUESTER/EMPLOYEE/VENDOR/CONTRACTOR: only tickets they personally filed.
  //   - AGENT: only tickets assigned to them, or filed by them - never
  //     the full department queue (agents work their own queue, they
  //     don't browse everyone else's).
  //   - TEAM_LEAD/MANAGER/DEPT_ADMIN: their whole department's tickets.
  //   - GLOBAL_ADMIN: everything, optionally filtered by departmentId.
  async list(req: AuthedRequest, res: Response) {
    const role = req.user!.role;
    const pagination = parsePagination(req);

    let scopeWhere: Record<string, unknown> = {};

    if (isRequesterOnly(role)) {
      scopeWhere = { requesterId: req.user!.id };
    } else if (role === UserRole.AGENT) {
      scopeWhere = { OR: [{ assigneeId: req.user!.id }, { requesterId: req.user!.id }] };
    } else if (DEPARTMENT_SCOPED_ROLES.includes(role)) {
      scopeWhere = { departmentId: req.user!.departmentId ?? undefined };
    }
    // GLOBAL_ADMIN: no forced scope - can filter by departmentId query param below.

    const where = {
      ...scopeWhere,
      departmentId: (req.query.departmentId as string) ?? (scopeWhere as any).departmentId ?? undefined,
      status: req.query.status as any,
      assigneeId: req.query.assigneeId as string | undefined,
      priority: req.query.priority as any,
    };

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: { assignee: true, requester: true },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json(paginatedResponse(tickets, total, pagination));
  },

  // GET /assigned (gets all tickets assigned to you)
  //@ts-ignore
  async getAssigned(req:AuthedRequest,res:Response){
    const id = req.params.id
    console.log(id)
    if (!id) return res.status(404).json({ error: "id provided" });

    const assignedTickets = await prisma.ticket.findMany({
      where : { 
        assigneeId : id,
        status :{notIn : [TicketStatus.RESOLVED]}
      },
       select: {
        createdAt:true,
        id:true,
        ticketNumber: true,
        priority: true,
        status: true,
        clientName: true,
        department: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            fullName: true
          }
        },
      }

    })

    console.log(assignedTickets)
    res.json(assignedTickets)

  },

  // GET /breached/userid(gets all tickets assigned to you)
  //@ts-ignore
  async getBreachedTickets(req:AuthedRequest,res:Response){
    const id = req.params.id
    if (!id) return res.status(404).json({ error: "id provided" });

    const assignedTickets = await prisma.ticket.findMany({
      where : { 
        assigneeId : id,
        slaBreached : true
      },
       select: {
        id :true,
        createdAt:true,
        ticketNumber: true,
        priority: true,
        status: true,
        clientName: true,
        department: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            fullName: true
          }
        },
      }

    })

   
    res.json(assignedTickets)

  },




  // GET /tickets/department/:departmentId?status=&priority=
  // DEPT_ADMIN or MANAGER only. A DEPT_ADMIN is further restricted to
  // their own department.
  async listByDepartment(req: AuthedRequest, res: Response) {
    const { departmentId } = req.params;

    if (req.user!.role === UserRole.HOD && req.user!.departmentId !== departmentId) {
      throw new AppError("You can only view tickets in your own department", 403);
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        departmentId,
        status: req.query.status as any,
        priority: req.query.priority as any,
      },
      include: { assignee: true, requester: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(tickets);
  },

  // GET /tickets/mine?status=&priority=
  // "Personal tickets" - every ticket the caller personally filed as
  // requester, regardless of their role.
  async listMine(req: AuthedRequest, res: Response) {
    const tickets = await prisma.ticket.findMany({
      where: {
        requesterId: req.user!.id,
        status: req.query.status as any,
        priority: req.query.priority as any,
      },
      include: { assignee: true, requester: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(tickets);
  },

  // GET /tickets/assigned?status=&priority=
  // Tickets currently assigned to the caller - the agent's personal work queue.
  async listAssignedToMe(req: AuthedRequest, res: Response) {
    const tickets = await prisma.ticket.findMany({
      where: {
        assigneeId: req.user!.id,
        status: req.query.status as any,
        priority: req.query.priority as any,
      },
      include: { assignee: true, requester: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(tickets);
  },

  // GET /tickets/:id  (requireTicketInCompany already verified it exists + is in-tenant)
  async getById(req: AuthedRequest, res: Response) {
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: req.params.id },
       include: {
        assignee: true,
        department : {select : {id : true,name :true}},
        requester: {select : {id : true,fullName:true,email:true}},
        category: true,
        keywords: { include: { keyword: true } },
        escalationHistory: { include: { escalatedBy: true, escalatedTo: true }, orderBy: { createdAt: "asc" } },
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        attachments: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });

    // Requesters/vendors never see internal-only comments.
    if (isRequesterOnly(req.user!.role)) {
      ticket.comments = ticket.comments.filter((c) => !c.isInternal);
    }
    res.json(ticket);
  },

  // PATCH /tickets/:id  (title/description/tags always editable; status
  // is staff/admin only - a requester never gets to move their own
  // ticket's status, that's the point of having someone else own it).

  //@ts-ignore
  async update(req: AuthedRequest, res: Response) {
    const {  status,turnOverTime } = req.body;

    const previous = await prisma.ticket.findUniqueOrThrow({ where: { id: req.params.id },
      select :{
        id : true,
        status : true,
        category:{
          select :{
            defaultPriority: true,
            defaultSlaHours : true
          }
        }
      }
     });


    if (status == TicketStatus.REOPENED && previous) {
      const baseSlaHours = previous.category?.defaultSlaHours ?? BASE_SLA_HOURS_BY_PRIORITY["P3"];
      const slaDeadline = hoursFromNow(baseSlaHours);

      const ticket = await prisma.ticket.update({
        where : {id : req.params.id},
        data : {
          status,
          slaDeadline : slaDeadline,
          turnOverTime : 0
        }
      })

      if (status !== undefined && status !== previous.status) {
        await logStatusChange({
          ticketId: ticket.id,
          fromStatus: previous.status,
          toStatus: status,
          changedById: req.user!.id,
        });
      }
      return res.json(ticket)
    } else if (status == TicketStatus.RESOLVED && previous) {

      const ticket = await prisma.ticket.update({
        where: { id: req.params.id },
        data: {
          status,
          turnOverTime: turnOverTime
        },select:{
          id : true,
          requester : true,
          ticketNumber:true,
          title : true
        }
      })
      if (status !== undefined && status !== previous.status) {

        await logStatusChange({
          ticketId: ticket.id,
          fromStatus: previous.status,
          toStatus: status,
          changedById: req.user!.id,
        });
      }

      // @ts-ignore
     await notificationService.sendTicketResolved(ticket, ticket.requester);
      return res.json(ticket)

    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        status,
      },
    });

    if (status !== undefined && status !== previous.status) {
      await logStatusChange({
        ticketId: ticket.id,
        fromStatus: previous.status,
        toStatus: status,
        changedById: req.user!.id,
      });
    }

    res.json(ticket);
  },

  // PATCH /tickets/:id/priority  { priority }  (GLOBAL_ADMIN, DEPT_ADMIN only)
  // Manual override of the system-computed priority. internalPriority
  // moves with it, since internalPriority is meant to reflect the true
  // triage urgency and an admin override is exactly that kind of signal.
  async updatePriority(req: AuthedRequest, res: Response) {
    const { priority } = req.body;
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { priority, internalPriority: priority },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "TICKET_PRIORITY_OVERRIDDEN",
        entityType: "Ticket",
        entityId: ticket.id,
      },
    });

    res.json(ticket);
  },

  // POST /tickets/:id/escalate  (AGENT, TEAM_LEAD, MANAGER, DEPT_ADMIN, GLOBAL_ADMIN)
  async escalate(req: AuthedRequest, res: Response) {
    try {
      const result = await escalationService.escalate({
        ticketId: req.params.id,
        reason: req.body.reason,
        escalatedById: req.user!.id,
        toLevel: req.body.toLevel,
      });
      res.json(result);
    } catch (err: any) {
      // escalationService throws plain Errors for expected business-rule
      // violations (e.g. no agent at that level) - surface as 400, not 500.
      throw new AppError(err.message, 400);
    }
  },

  // POST /tickets/:id/assign  (TEAM_LEAD, MANAGER, DEPT_ADMIN, GLOBAL_ADMIN)
  async assign(req: AuthedRequest, res: Response) {
    const ticket = await assignmentService.manualAssign(req.params.id, req.body.agentId, req.user!.id);
    res.json(ticket);
  },

  // POST /tickets/:id/reassign  (re-run the auto-assignment engine, e.g. after a suggestion was promoted)
  async autoReassign(req: AuthedRequest, res: Response) {
    const ticket = await assignmentService.autoAssign(req.params.id, req.user!.id);
    if (!ticket) throw new AppError("No eligible agent available right now", 409);
    res.json(ticket);
  },

  // POST /tickets/:id/resolve
  async resolve(req: AuthedRequest, res: Response) {
    const ticket = await ticketService.resolveTicket(req.params.id, req.user!.id);
    res.json(ticket);
  },

  // GET /tickets/:id/escalations  (full escalation history, standalone from getById)
  async listEscalations(req: AuthedRequest, res: Response) {
    const escalations = await prisma.ticketEscalation.findMany({
      where: { ticketId: req.params.id },
      include: { escalatedBy: true, escalatedTo: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(escalations);
  },

  // GET /tickets/:id/status-history
  async listStatusHistory(req: AuthedRequest, res: Response) {
    const history = await prisma.ticketStatusHistory.findMany({
      where: { ticketId: req.params.id },
      include: { changedBy: true },
      orderBy: { changedAt: "asc" },
    });
    res.json(history);
  },

  // POST /tickets/:id/keywords  { keywordId }
  async addKeyword(req: AuthedRequest, res: Response) {
    const link = await prisma.ticketKeyword.upsert({
      where: { ticketId_keywordId: { ticketId: req.params.id, keywordId: req.body.keywordId } },
      update: {},
      create: { ticketId: req.params.id, keywordId: req.body.keywordId },
    });
    res.status(201).json(link);
  },

  // DELETE /tickets/:id/keywords/:keywordId
  async removeKeyword(req: AuthedRequest, res: Response) {
    await prisma.ticketKeyword.delete({
      where: { ticketId_keywordId: { ticketId: req.params.id, keywordId: req.params.keywordId } },
    });
    res.status(204).send();
  },
};
