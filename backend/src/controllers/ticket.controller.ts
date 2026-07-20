import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { ticketService } from "../services/ticket.service";
import { escalationService } from "../services/escalation.service";
import { assignmentService } from "../services/assignment.service";
import { logStatusChange } from "../services/statushistory.service";
import { prisma } from "../lib/database";
import { TicketPriority, TicketStatus, UserRole, Designation } from "../generated/prisma/client";
import { isRequesterOnly } from "../utils/rbac";
import { parsePagination, paginatedResponse } from "../utils/pagination";
import { AppError } from "../middleware/errorHandler";
import { minutesFromNow, addMinutes, diffInMinutes } from "../utils/time";
import { computeSlaClockUpdate, computeTurnOverTimeSeconds } from "../services/slaClock.service";
import { prismaVersion } from "../generated/prisma/internal/prismaNamespace";
import { notificationService } from "../services/notification.service";
import { priorityService } from "../services/priority.service";
import { internalPriorityService } from "../services/internalPriority.service";
import { id } from "zod/v4/locales";

// Designations counted as "top management" for the internal-priority
// scoring - mirrors ticket.service.ts's createTicket.
const TOP_MANAGEMENT_DESIGNATIONS: Designation[] = [Designation.CEO, Designation.COO, Designation.CXO];

// Statuses whose SLA clock is actively running - mirrors
// slaClock.service.ts's SLA_PAUSED_STATUSES, expressed as the inverse.
const ACTIVE_SLA_STATUSES: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.REOPENED, TicketStatus.IN_PROGRESS];


// Roles whose "list" view is scoped to the department(s) assigned to them,
// rather than being requester-only (see below) or company-wide (GLOBAL_ADMIN).
// NOTE(fixed): this previously only included HOD, so CXO users fell through
// to "no forced scope" and could see every ticket in the company - even
// though CXO and HOD are meant to have identical (department-scoped) access.
const DEPARTMENT_SCOPED_ROLES: UserRole[] = [UserRole.HOD, UserRole.CXO];

const BASE_SLA_MINUTES_BY_PRIORITY: Record<TicketPriority, number> = {
  P1: 4 * 60,
  P2: 8 * 60,
  P3: 24 * 60,
  P4: 72 * 60,
};

// NOTE(fixed): req.user!.departmentId does not exist - the JWT payload only
// ever carries { id, role } (see auth.service.ts signAuthToken call), and the
// User model itself has no singular `departmentId` column for HOD/CXO. A HOD
// manages departments via Department.managerId and a CXO via
// Department.cxoId, and either one can be assigned to MULTIPLE departments -
// so the only correct way to scope their ticket list is to look this up.
// Mirrors the same lookup already used in managerDashboard.controller.ts /
// cxodashboard.controller.ts, so all three stay consistent.
async function getScopedDepartmentIds(userId: string, role: UserRole): Promise<string[]> {
  if (role === UserRole.HOD) {
    const departments = await prisma.department.findMany({
      where: { managerId: userId },
      select: { id: true },
    });
    return departments.map((d) => d.id);
  }
  if (role === UserRole.CXO) {
    const departments = await prisma.department.findMany({
      where: { cxoId: userId },
      select: { id: true },
    });
    return departments.map((d) => d.id);
  }
  return [];
}

// Parses an optional "YYYY-MM-DD" query param into a Date range bound.
// `endOfDay` pushes the "to" side to 23:59:59 so a same-day from/to range
// (e.g. dateOfOccuranceFrom=dateOfOccuranceTo=today) is inclusive.
function parseDateBound(value: unknown, endOfDay: boolean): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(endOfDay ? `${value}T23:59:59.999` : value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateRangeFilter(fromValue: unknown, toValue: unknown): { gte?: Date; lte?: Date } | undefined {
  const gte = parseDateBound(fromValue, false);
  const lte = parseDateBound(toValue, true);
  if (!gte && !lte) return undefined;
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

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
      designation: req.body.designation,
      projectId: req.body.projectId,
    });
    res.status(201).json(ticket);
  },

  // GET /tickets - key/value filter search.
  //
  // Query params (all optional, combine as AND):
  //   departmentId, status, assigneeId, internalPriority,
  //   categoryId, projectId, clientName, state,
  //   dateOfOccuranceFrom / dateOfOccuranceTo   (date-of-occurrence range)
  //   slaDeadlineFrom / slaDeadlineTo           (SLA deadline range)
  //   createdFrom / createdTo                   (the generic "custom date filter")
  //   page, limit
  //
  // NOTE(changed): the searchable priority key is internalPriority, not
  // the customer-facing SLA priority (P1-P4) - internalPriority is the
  // triage metric staff actually search/sort by, so it replaces `priority`
  // as a filter key here (the underlying field itself is untouched
  // elsewhere, e.g. updatePriority()).
  //
  // Visibility rules (the "keys are the roles" scoping):
  //   - REQUESTER (and other requester-only roles): only tickets they personally filed.
  //   - AGENT: only tickets assigned to them, or filed by them - never
  //     the full department queue (agents work their own queue, they
  //     don't browse everyone else's).
  //   - HOD / CXO: identical access - every ticket in whichever department(s)
  //     are assigned to them (a HOD/CXO can be assigned to more than one
  //     department), plus any ticket they personally filed themselves.
  //   - GLOBAL_ADMIN: everything, optionally narrowed by departmentId.
  async list(req: AuthedRequest, res: Response) {
    const role = req.user!.role;
    const pagination = parsePagination(req);

    let scopeWhere: Record<string, unknown> = {};

    if (isRequesterOnly(role)) {
      scopeWhere = { requesterId: req.user!.id };
    } else if (role === UserRole.AGENT) {
      scopeWhere = { OR: [{ assigneeId: req.user!.id }, { requesterId: req.user!.id }] };
    } else if (DEPARTMENT_SCOPED_ROLES.includes(role)) {
      const deptIds = await getScopedDepartmentIds(req.user!.id, role);
      // Scoped to their department(s) OR tickets they raised themselves.
      scopeWhere = { OR: [{ departmentId: { in: deptIds } }, { requesterId: req.user!.id }] };
    }
    // GLOBAL_ADMIN: no forced scope - has access to everything.

    const filterWhere: Record<string, unknown> = {};

    if (req.query.departmentId) filterWhere.departmentId = req.query.departmentId as string;
    if (req.query.status) filterWhere.status = req.query.status as TicketStatus;
    if (req.query.assigneeId) filterWhere.assigneeId = req.query.assigneeId as string;
    // internalPriority is the searchable "priority" key (see NOTE above) -
    // the raw SLA priority field is intentionally not filterable here.
    if (req.query.internalPriority) filterWhere.internalPriority = req.query.internalPriority as any;
    if (req.query.categoryId) filterWhere.categoryId = req.query.categoryId as string;
    if (req.query.projectId) filterWhere.projectId = req.query.projectId as string;
    if (req.query.clientName) filterWhere.clientName = req.query.clientName as string;
    if (req.query.state) filterWhere.state = req.query.state as string;

    const dateOfOccurance = dateRangeFilter(req.query.dateOfOccuranceFrom, req.query.dateOfOccuranceTo);
    if (dateOfOccurance) filterWhere.dateOfOccurance = dateOfOccurance;

    const slaDeadline = dateRangeFilter(req.query.slaDeadlineFrom, req.query.slaDeadlineTo);
    if (slaDeadline) filterWhere.slaDeadline = slaDeadline;

    // The generic "custom date filter" - filed-on date.
    const createdRange = dateRangeFilter(req.query.createdFrom, req.query.createdTo);
    if (createdRange) filterWhere.createdAt = createdRange;

    // scopeWhere may itself be an OR clause (dept-scoped roles), so it has
    // to be AND-ed with the query filters rather than spread/merged, or a
    // filter like departmentId would silently clobber the scope's OR.
    const where = Object.keys(scopeWhere).length ? { AND: [scopeWhere, filterWhere] } : filterWhere;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          assignee: { select: { fullName: true, email: true, supportLevel: true } },
          requester: { select: { id: true, fullName: true, email: true, employeeId: true, role: true } },
          department: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, defaultSlaMinutes: true, defaultPriority: true } },
          project: { select: { id: true, name: true } },
        },
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
    const { status, comment } = req.body;

    // Putting a ticket ON_HOLD requires an explanatory comment - it's
    // recorded on the status history entry (as its note) and also added
    // as a regular ticket comment so it shows up in the discussion thread.
    if (status === TicketStatus.ON_HOLD && !(typeof comment === "string" && comment.trim().length > 0)) {
      throw new AppError("A comment is required when placing a ticket on hold", 400);
    }

    // Resolving a ticket requires a reason too - same treatment: recorded
    // as the status history note and as a regular ticket comment.
    if (status === TicketStatus.RESOLVED && !(typeof comment === "string" && comment.trim().length > 0)) {
      throw new AppError("A comment is required when resolving a ticket", 400);
    }

    const previous = await prisma.ticket.findUniqueOrThrow({ where: { id: req.params.id },
      select :{
        id : true,
        status : true,
        createdAt: true,
        slaDeadline: true,
        slaRemainingMinutes: true,
        holdStartedAt: true,
        totalHoldMinutes: true,
        category:{
          select :{
            defaultPriority: true,
            defaultSlaMinutes : true
          }
        }
      }
     });

    const now = new Date();
    // Ticket is put ON_HOLD or RESOLVED -> SLA clock pauses (deadline banked
    // into slaRemainingMinutes) and, for ON_HOLD specifically, the wall-clock
    // hold window that TAT subtracts opens/closes. Coming back off either
    // one resumes the deadline from the banked remainder rather than
    // granting a fresh window. No-op when status isn't actually changing.
    const slaClockUpdate = status !== undefined && status !== previous.status
      ? computeSlaClockUpdate(previous, status, now)
      : {};

    if (status == TicketStatus.REOPENED && previous) {
      // slaClockUpdate already resumes the deadline from where it was
      // banked when the ticket was resolved. Only a ticket with no banked
      // remainder at all (e.g. one that predates this tracking) falls back
      // to a fresh SLA window.
      const resumedDeadline = slaClockUpdate.slaDeadline
        ?? (previous.slaRemainingMinutes == null
          ? minutesFromNow(previous.category?.defaultSlaMinutes ?? BASE_SLA_MINUTES_BY_PRIORITY["P3"])
          : null);

      const ticket = await prisma.ticket.update({
        where : {id : req.params.id},
        data : {
          ...slaClockUpdate,
          status,
          slaDeadline : resumedDeadline,
          resolvedAt: null,
          turnOverTime: computeTurnOverTimeSeconds({ ...previous, ...slaClockUpdate, status }, now),
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
          ...slaClockUpdate,
          status,
          resolvedAt: now,
          // TAT is computed server-side from the ticket's own timestamps
          // (age minus banked ON_HOLD time) rather than trusting whatever
          // the client sent, so it stays correct across reopen cycles.
          turnOverTime: computeTurnOverTimeSeconds({ ...previous, ...slaClockUpdate, status }, now),
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
          // Validated above - resolving always carries a reason.
          note: comment.trim(),
        });

        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: req.user!.id,
            commentText: comment.trim(),
            isInternal: false,
          },
        });
      }

      // @ts-ignore
     await notificationService.sendTicketResolved(ticket, ticket.requester);
      return res.json(ticket)

    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        ...slaClockUpdate,
        status,
        ...(status !== undefined && status !== previous.status
          ? { turnOverTime: computeTurnOverTimeSeconds({ ...previous, ...slaClockUpdate, status }, now) }
          : {}),
      },
    });

    if (status !== undefined && status !== previous.status) {
      await logStatusChange({
        ticketId: ticket.id,
        fromStatus: previous.status,
        toStatus: status,
        changedById: req.user!.id,
        // ON_HOLD is required to carry a comment (validated above); other
        // transitions may optionally include one too.
        note: typeof comment === "string" && comment.trim().length > 0 ? comment.trim() : undefined,
      });

      if (typeof comment === "string" && comment.trim().length > 0) {
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: req.user!.id,
            commentText: comment.trim(),
            isInternal: false,
          },
        });
      }
    }

    res.json(ticket);
  },

  // PATCH /tickets/:id/edit  (GLOBAL_ADMIN only)
  //
  // Full edit of the ticket's own fields - separate from PATCH /tickets/:id,
  // which only ever drives status transitions (and from /priority, which
  // is its own dedicated override flow). Every field here is optional in
  // the body; only whatever is actually sent gets updated, so a global
  // admin can correct a single typo'd field without having to resend the
  // whole ticket.
  //
  // Since category/project/client/designation drive both the customer-facing
  // priority and the internal-priority score (see priority.service.ts /
  // internalPriority.service.ts), an edit recomputes both from whatever the
  // effective values are post-edit - same formulas createTicket uses. The
  // SLA window is likewise recalculated (carrying over whatever portion of
  // the *previous* window was already consumed, exactly like a category's
  // defaultSlaMinutes change does in ticketCategory.controller.ts), rather
  // than either keeping a now-stale deadline or granting a full fresh one.
  // turnOverTime (TAT) is intentionally left untouched - it's a wall-clock
  // measurement of the ticket's actual lifetime and isn't something an edit
  // should reset or recompute.
  async editTicket(req: AuthedRequest, res: Response) {
    const {
      title,
      description,
      clientName,
      clientEmail,
      dateOfOccurance,
      site,
      state,
      designation,
      departmentId,
      categoryId,
      projectId,
    } = req.body;

    const previous = await prisma.ticket.findUniqueOrThrow({
      where: { id: req.params.id },
      select: {
        status: true,
        priority: true,
        categoryId: true,
        projectId: true,
        clientName: true,
        designation: true,
        slaDeadline: true,
        slaRemainingMinutes: true,
        slaTotalMinutes: true,
      },
    });

    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        throw new AppError("Title cannot be empty", 400);
      }
      data.title = title.trim();
    }
    if (description !== undefined) data.description = description === null ? null : String(description);
    if (clientName !== undefined) {
      if (typeof clientName !== "string" || !clientName.trim()) {
        throw new AppError("Client name cannot be empty", 400);
      }
      data.clientName = clientName.trim();
    }
    if (clientEmail !== undefined) {
      if (typeof clientEmail !== "string" || !clientEmail.trim()) {
        throw new AppError("Client email cannot be empty", 400);
      }
      data.clientEmail = clientEmail.trim();
    }
    if (dateOfOccurance !== undefined) {
      const parsed = new Date(dateOfOccurance);
      if (Number.isNaN(parsed.getTime())) throw new AppError("Invalid dateOfOccurance", 400);
      data.dateOfOccurance = parsed;
    }
    if (site !== undefined) {
      if (typeof site !== "string" || !site.trim()) {
        throw new AppError("Site cannot be empty", 400);
      }
      data.site = site.trim();
    }
    if (state !== undefined) data.state = state;
    if (designation !== undefined) data.designation = designation;

    // Cross-entity references are validated so a typo'd id doesn't silently
    // fail the FK constraint with an opaque 500 later. The fetched rows are
    // kept around (rather than re-queried) for the priority/SLA recompute
    // below.
    let category: { defaultPriority: TicketPriority; defaultSlaMinutes: number | null; isWorkStopping: boolean; isSafetyViolation: boolean } | null = null;
    let categoryFetched = false;
    if (departmentId !== undefined) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) throw new AppError("Department not found", 400);
      data.departmentId = departmentId;
    }
    if (categoryId !== undefined) {
      categoryFetched = true;
      if (categoryId === null) {
        data.categoryId = null;
      } else {
        category = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
        if (!category) throw new AppError("Category not found", 400);
        data.categoryId = categoryId;
      }
    }
    let project: { isShutdownJob: boolean } | null = null;
    let projectFetched = false;
    if (projectId !== undefined) {
      projectFetched = true;
      if (projectId === null) {
        data.projectId = null;
      } else {
        project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new AppError("Project not found", 400);
        data.projectId = projectId;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new AppError("No editable fields were provided", 400);
    }

    // Effective classification inputs post-edit: whatever was just sent,
    // falling back to what the ticket already had.
    const effectiveCategoryId = categoryFetched ? categoryId : previous.categoryId;
    const effectiveProjectId = projectFetched ? projectId : previous.projectId;
    const effectiveClientName = (data.clientName as string | undefined) ?? previous.clientName;
    const effectiveDesignation = (data.designation as Designation | null | undefined) ?? previous.designation;

    // Only re-fetch what wasn't already loaded above while validating the
    // incoming ids.
    if (!categoryFetched && effectiveCategoryId) {
      category = await prisma.ticketCategory.findUnique({ where: { id: effectiveCategoryId } });
    }
    if (!projectFetched && effectiveProjectId) {
      project = await prisma.project.findUnique({ where: { id: effectiveProjectId } });
    }
    const client = effectiveClientName
      ? await prisma.client.findFirst({ where: { name: effectiveClientName } })
      : null;

    const newPriority = priorityService.computePriority({
      categoryDefaultPriority: category?.defaultPriority,
    });

    const internalPriorityResult = internalPriorityService.computeScore({
      isWorkStopping: category?.isWorkStopping ?? false,
      isSafetyViolation: category?.isSafetyViolation ?? false,
      isShutdownJob: project?.isShutdownJob ?? false,
      isReportedByTopManagement: !!effectiveDesignation && TOP_MANAGEMENT_DESIGNATIONS.includes(effectiveDesignation),
      isKeyClient: client?.isKeyClient ?? false,
    });

    data.priority = newPriority;
    data.internalPriority = internalPriorityResult.level;

    // SLA window carryover: figure out how much of the *previous* window
    // is already consumed, then apply that same consumed amount against the
    // newly-computed window - same math as a category's defaultSlaMinutes
    // change (ticketCategory.controller.ts), generalized to also account for
    // a priority change with no category at all.
    const now = new Date();
    const previousTotalMinutes = previous.slaTotalMinutes ?? BASE_SLA_MINUTES_BY_PRIORITY[previous.priority];
    const isCurrentlyActive = ACTIVE_SLA_STATUSES.includes(previous.status);

    const previousRemainingMinutes = isCurrentlyActive
      ? (previous.slaDeadline ? diffInMinutes(now, previous.slaDeadline) : previousTotalMinutes)
      : (previous.slaRemainingMinutes ?? previousTotalMinutes);

    const consumedMinutes = Math.max(0, previousTotalMinutes - previousRemainingMinutes);

    const newTotalMinutes = category?.defaultSlaMinutes ?? BASE_SLA_MINUTES_BY_PRIORITY[newPriority];
    const newRemainingMinutes = newTotalMinutes - consumedMinutes;

    data.slaTotalMinutes = newTotalMinutes;
    if (isCurrentlyActive) {
      // Deadline is live and being checked by the SLA sweep - recalculate
      // it directly (may land in the past, i.e. immediately breached).
      data.slaDeadline = addMinutes(now, newRemainingMinutes);
      data.slaBreached = newRemainingMinutes <= 0;
    } else {
      // ON_HOLD / RESOLVED - the clock is paused, so only the banked
      // remainder is updated; the deadline stays cleared until it resumes.
      data.slaRemainingMinutes = newRemainingMinutes;
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: {
        assignee: true,
        department: { select: { id: true, name: true } },
        requester: { select: { id: true, fullName: true, email: true } },
        category: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "TICKET_EDITED",
        entityType: "Ticket",
        entityId: ticket.id,
      },
    });

    res.json(ticket);
  },

  // PATCH /tickets/:id/priority  { priority }  (GLOBAL_ADMIN, DEPT_ADMIN only)
  // Manual override of the system-computed priority. internalPriority is a
  // separately-computed triage metric (see internalPriority.service.ts) and
  // is intentionally left untouched by this override.
  async updatePriority(req: AuthedRequest, res: Response) {
    const { priority } = req.body;
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { priority },
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

  // POST /tickets/:id/resolve  { comment }  - comment is mandatory, same
  // reasoning as the PATCH /tickets/:id RESOLVED path: it's recorded as
  // the status history note and added as a regular ticket comment.
  async resolve(req: AuthedRequest, res: Response) {
    const { comment } = req.body;
    if (!(typeof comment === "string" && comment.trim().length > 0)) {
      throw new AppError("A comment is required when resolving a ticket", 400);
    }
    const ticket = await ticketService.resolveTicket(req.params.id, req.user!.id, comment.trim());
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
