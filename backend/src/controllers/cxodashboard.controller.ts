import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";
import { UserRole } from "../generated/prisma/client";

export const cxoDashboardController = {

    async getDepartments(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const departments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json(departments);
  },

  // GET /cxo-dashboard/analytics
  // Single lean payload for the Manager/CXO analytics console
  // (CXODashboardmock.tsx). Returns every department under this CXO, every
  // category in those departments, and every ticket raised against those
  // departments — the frontend does all range/status/site/client filtering
  // and chart aggregation client-side over this set, same shape the mock
  // data generator used to produce locally.
  //@ts-ignore
  async getAnalytics(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;

    const departments = await prisma.department.findMany({
      where: { 
        OR : [
          {cxoId},
          {managerId:cxoId}
        ]
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    if (departments.length === 0) {
      return res.json({ departments: [], categories: [], tickets: [] });
    }

    const departmentIds = departments.map((d) => d.id);

    const [categories, tickets] = await Promise.all([
      prisma.ticketCategory.findMany({
        where: { departmentId: { in: departmentIds } },
        select: { id: true, name: true, departmentId: true },
        orderBy: { name: "asc" },
      }),
      prisma.ticket.findMany({
        where: { departmentId: { in: departmentIds } },
        select: {
          id: true,
          ticketNumber: true,
          departmentId: true,
          categoryId: true,
          status: true,
          priority: true,
          createdAt: true,
          resolvedAt: true,
          slaDeadline: true,
          slaBreached: true,
          turnOverTime: true, // seconds — see computeTurnOverTimeSeconds
          site: true,
          clientName: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({ departments, categories, tickets });
  },

  // GET /cxo-dashboard/team?departmentId=
  async getTeam(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { departmentId } = req.query as { departmentId?: string };

    const cxoDepartments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true, name: true },
    });

    if (cxoDepartments.length === 0) {
      throw new AppError("No departments are assigned to you", 400);
    }

    const cxoDeptIds = cxoDepartments.map((d) => d.id);

    if (departmentId && !cxoDeptIds.includes(departmentId)) {
      throw new AppError("Department is not under your management", 403);
    }

    const targetDeptIds = departmentId ? [departmentId] : cxoDeptIds;

    const department = departmentId
      ? cxoDepartments.find((d) => d.id === departmentId)
      : undefined;

    // Include agents AND department managers (HODs) so CXO sees everyone
    const users = await prisma.user.findMany({
      where: {
        agentsdepartmentId: { in: targetDeptIds },
        id: { not: cxoId },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isAvailableForAssignment: true,
        agentsdepartmentId: true,
      },
      orderBy: { fullName: "asc" },
    });

    const deptNameById = new Map(cxoDepartments.map((d) => [d.id, d.name]));

    const usersWithTickets = await Promise.all(
      users.map(async (u) => {
        const [activeTickets, totalRequested, openCount, inProgressCount, resolvedCount, onHoldCount, breachedCount, escalatedCount] =
          await Promise.all([
            prisma.ticket.count({
              where: { assigneeId: u.id, status: { not: "RESOLVED" } },
            }),
            prisma.ticket.count({
              where: { requesterId: u.id },
            }),
            prisma.ticket.count({
              where: { assigneeId: u.id, status: "OPEN" },
            }),
            prisma.ticket.count({
              where: { assigneeId: u.id, status: "IN_PROGRESS" },
            }),
            prisma.ticket.count({
              where: { assigneeId: u.id, status: "RESOLVED" },
            }),
            prisma.ticket.count({
              where: { assigneeId: u.id, status: "ON_HOLD" },
            }),
            prisma.ticket.count({
              where: { assigneeId: u.id, slaBreached: true, status: { not: "RESOLVED" } },
            }),
            prisma.ticket.count({
              where: { escalatedToId: u.id, status: { not: "RESOLVED" } },
            }),
          ]);

        return {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          isAvailableForAssignment: u.isAvailableForAssignment,
          departmentId: u.agentsdepartmentId,
          departmentName: u.agentsdepartmentId ? deptNameById.get(u.agentsdepartmentId) : undefined,
          activeTickets,
          totalRequested,
          openTickets: openCount,
          inProgressTickets: inProgressCount,
          resolvedTickets: resolvedCount,
          onHoldTickets: onHoldCount,
          breachedTickets: breachedCount,
          escalatedTickets: escalatedCount,
        };
      })
    );

    res.json({
      departmentId: departmentId || "",
      departmentName: departmentId
        ? department?.name || "Unknown"
        : cxoDepartments.map((d) => d.name).join(", "),
      users: usersWithTickets,
    });
  },

  // GET /cxo-dashboard/tickets?departmentId=&filter=
  async getDepartmentTickets(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { departmentId, filter } = req.query as { departmentId?: string; filter?: string };

    const cxoDepartments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true, name: true },
    });

    if (cxoDepartments.length === 0) {
      throw new AppError("No departments are assigned to you", 400);
    }

    const cxoDeptIds = cxoDepartments.map((d) => d.id);

    if (departmentId && !cxoDeptIds.includes(departmentId)) {
      throw new AppError("Department is not under your management", 403);
    }

    const targetDeptIds = departmentId ? [departmentId] : cxoDeptIds;

    const where: any = { departmentId: { in: targetDeptIds } };

    if (filter === "active") {
      where.status = { not: "RESOLVED" };
    } else if (filter === "resolved") {
      where.status = "RESOLVED";
    } else if (filter === "breached") {
      where.slaBreached = true;
      where.status = { not: "RESOLVED" };
    } else if (filter === "escalated") {
      where.escalatedToId = { not: null };
      where.status = { not: "RESOLVED" };
    } else if (filter === "onHold") {
      where.status = "ON_HOLD";
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        requester: { select: { id: true, fullName: true, email: true } },
        category: { select: { name: true } },
        department: { select: { name: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      filter: filter || "all",
      tickets,
    });
  },

  // GET /cxo-dashboard/user/:userId/tickets
  async getUserTickets(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { userId } = req.params;

    const cxoDepartments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true },
    });
    const cxoDeptIds = cxoDepartments.map((d) => d.id);

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { agentsdepartmentId: true, fullName: true },
    });

    if (
      !targetUser ||
      !targetUser.agentsdepartmentId ||
      !cxoDeptIds.includes(targetUser.agentsdepartmentId)
    ) {
      throw new AppError("User is not in a department under your management", 403);
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [{ assigneeId: userId }],
        departmentId: { in: cxoDeptIds },
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        requester: { select: { id: true, fullName: true, email: true } },
        category: { select: { name: true } },
        department: { select: { name: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      user: { id: userId, fullName: targetUser.fullName },
      tickets,
    });
  },

  // POST /cxo-dashboard/reassign
  async reassignTicket(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { ticketId, newAssigneeId } = req.body;

    if (!ticketId || !newAssigneeId) {
      throw new AppError("ticketId and newAssigneeId are required", 400);
    }

    const cxoDepartments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true },
    });
    const cxoDeptIds = cxoDepartments.map((d) => d.id);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        departmentId: true,
        assigneeId: true,
        requesterId: true,
        status: true,
        ticketNumber: true,
        slaBreached: true,
        escalatedToId: true,
      },
    });

    if (!ticket) throw new AppError("Ticket not found", 404);
    if (!cxoDeptIds.includes(ticket.departmentId)) {
      throw new AppError("Ticket is not in a department under your management", 403);
    }
    if (ticket.assigneeId === newAssigneeId) {
      throw new AppError("Ticket is already assigned to this user", 400);
    }
    if (ticket.requesterId === newAssigneeId) {
      throw new AppError("Cannot reassign a ticket to the agent who raised it", 400);
    }

    const prevStatus = ticket.status;

    const newAssignee = await prisma.user.findUnique({
      where: { id: newAssigneeId },
      select: { agentsdepartmentId: true, isActive: true },
    });

    if (!newAssignee || !newAssignee.isActive) {
      throw new AppError("New assignee not found or inactive", 400);
    }
    // Must stay within the SAME department as the ticket
    if (newAssignee.agentsdepartmentId !== ticket.departmentId) {
      throw new AppError("New assignee must belong to the same department as the ticket", 400);
    }

    const newAssigneeActiveCount = await prisma.ticket.count({
      where: { assigneeId: newAssigneeId, status: { not: "RESOLVED" } },
    });

    if (newAssigneeActiveCount > 3) {
      throw new AppError("This agent already has more than 3 active tickets", 400);
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: newAssigneeId,
        assignedById: cxoId,
        assignmentMethod: "MANUAL",
        assignedAt: new Date(),
      },
      include: {
        assignee: { select: { fullName: true } },
      },
    });

    await prisma.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: prevStatus,
        status: updated.status,
        changedById: cxoId,
        changedAt: new Date(),
        note: `Reassigned by CXO from ${prevStatus} to ${updated.assignee?.fullName || "another agent"}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: cxoId,
        action: `CXO reassigned ticket ${updated.ticketNumber} to ${updated.assignee?.fullName || "another agent"}`,
        entityType: "Ticket",
        entityId: ticketId,
      },
    });

    res.json(updated);
  },
   






  // Get all departments under CXO with high-level metrics
  //@ts-ignore
  async getDepartmentOverview(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { departmentId } = req.query as { departmentId?: string };

    // Verify user is CXO
    const user = await prisma.user.findUnique({
      where: { id: cxoId },
      select: { role: true },
    });

    if (user?.role !== UserRole.CXO) {
      throw new AppError("Only CXO can access this endpoint", 403);
    }

    // Get all departments under this CXO
    const departments = await prisma.department.findMany({
      where: { cxoId },
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
        agents: {
          where: { isActive: true },
          select: { id: true },
        },
        categories: { select: { id: true } },
      },
    });

    if (departments.length === 0) {
      return res.json({
        cxoId,
        departments: [],
        summary: {
          totalDepartments: 0,
          totalAgents: 0,
          totalTickets: 0,
          avgSlaComplianceRate: 0,
          breachedTickets: 0,
        },
      });
    }

    const targetDeptIds = departmentId 
      ? departments.filter(d => d.id === departmentId).map(d => d.id)
      : departments.map(d => d.id);

    // Get metrics for each department
    const departmentsWithMetrics = await Promise.all(
      departments
        .filter(d => targetDeptIds.includes(d.id))
        .map(async (dept) => {
          const [totalTickets, openTickets, inProgressTickets, resolvedTickets, breachedTickets, onHoldTickets] =
            await Promise.all([
              prisma.ticket.count({ where: { departmentId: dept.id } }),
              prisma.ticket.count({ where: { departmentId: dept.id, status: "OPEN" } }),
              prisma.ticket.count({ where: { departmentId: dept.id, status: "IN_PROGRESS" } }),
              prisma.ticket.count({ where: { departmentId: dept.id, status: "RESOLVED" } }),
              prisma.ticket.count({ where: { departmentId: dept.id, slaBreached: true, status: { not: "RESOLVED" } } }),
              prisma.ticket.count({ where: { departmentId: dept.id, status: "ON_HOLD" } }),
            ]);

          const totalClosed = resolvedTickets + breachedTickets;
          console.log("totalclosed,resovled,breached",totalClosed,resolvedTickets,breachedTickets)
          const slaComplianceRate = totalClosed > 0 ? Math.round((resolvedTickets / totalClosed) * 100) : 100;

          // Get average TAT from status history
          const tatData = await prisma.ticketStatusHistory.aggregate({
            where: { ticket: { departmentId: dept.id } },
            _avg: { durationInPrevStatusMinutes: true },
          });

          const avgTatHrs = tatData._avg.durationInPrevStatusMinutes 
            ? Math.round(tatData._avg.durationInPrevStatusMinutes / 60 * 10) / 10
            : 0;

          return {
            id: dept.id,
            name: dept.name,
            description: dept.description,
            manager: dept.manager || null,
            agentCount: dept.agents.length,
            categoryCount: dept.categories.length,
            metrics: {
              totalTickets,
              openTickets,
              inProgressTickets,
              onHoldTickets,
              resolvedTickets,
              breachedTickets,
              slaComplianceRate,
              avgTatHrs,
            },
          };
        })
    );

    // Calculate summary
    const summary = {
      totalDepartments: departmentsWithMetrics.length,
      totalAgents: departmentsWithMetrics.reduce((sum, d) => sum + d.agentCount, 0),
      totalTickets: departmentsWithMetrics.reduce((sum, d) => sum + d.metrics.totalTickets, 0),
      avgSlaComplianceRate: Math.round(
        departmentsWithMetrics.reduce((sum, d) => sum + d.metrics.slaComplianceRate, 0) / 
        departmentsWithMetrics.length
      ) || 0,
      breachedTickets: departmentsWithMetrics.reduce((sum, d) => sum + d.metrics.breachedTickets, 0),
    };

    res.json({
      cxoId,
      departments: departmentsWithMetrics,
      summary,
    });
  },

  // Get manager performance across all departments
  async getManagerPerformance(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { departmentId } = req.query as { departmentId?: string };

    // Verify user is CXO
    const user = await prisma.user.findUnique({
      where: { id: cxoId },
      select: { role: true },
    });

    if (user?.role !== UserRole.CXO) {
      throw new AppError("Only CXO can access this endpoint", 403);
    }

    // Get departments under CXO
    let departments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true, managerId: true, name: true },
    });

    if (departmentId) {
      departments = departments.filter(d => d.id === departmentId);
      if (departments.length === 0) {
        throw new AppError("Department not found under your management", 404);
      }
    }

    // Get managers and their performance
    const managerPerformance = await Promise.all(
      departments
        .filter(d => d.managerId)
        .map(async (dept) => {
          const manager = await prisma.user.findUnique({
            where: { id: dept.managerId! },
            select: { id: true, fullName: true, email: true, role: true },
          });

          if (!manager) return null;

          // Get agents under this manager's department
          const agents = await prisma.user.findMany({
            where: { agentsdepartmentId: dept.id, isActive: true },
            select: { id: true },
          });

          const [
            totalTickets,
            openTickets,
            resolvedTickets,
            breachedTickets,
            inProgressTickets,
            onHoldTickets,
          ] = await Promise.all([
            prisma.ticket.count({ where: { departmentId: dept.id } }),
            prisma.ticket.count({ where: { departmentId: dept.id, status: "OPEN" } }),
            prisma.ticket.count({ where: { departmentId: dept.id, status: "RESOLVED" } }),
            prisma.ticket.count({ where: { departmentId: dept.id, slaBreached: true, status: { not: "RESOLVED" } } }),
            prisma.ticket.count({ where: { departmentId: dept.id, status: "IN_PROGRESS" } }),
            prisma.ticket.count({ where: { departmentId: dept.id, status: "ON_HOLD" } }),
          ]);

          const totalClosed = resolvedTickets + breachedTickets;
          const slaComplianceRate = totalClosed > 0 ? Math.round((resolvedTickets / totalClosed) * 100) : 100;

          // Get average load per agent
          const avgLoadPerAgent = agents.length > 0 ? Math.round((openTickets / agents.length) * 10) / 10 : 0;

          return {
            id: manager.id,
            fullName: manager.fullName,
            email: manager.email,
            role: manager.role,
            departmentId: dept.id,
            departmentName: dept.name,
            agentCount: agents.length,
            metrics: {
              totalTickets,
              openTickets,
              inProgressTickets,
              onHoldTickets,
              resolvedTickets,
              breachedTickets,
              slaComplianceRate,
              avgLoadPerAgent,
            },
          };
        })
    );

    res.json({
      cxoId,
      managers: managerPerformance.filter(m => m !== null),
    });
  },

  // Get agent performance within departments
  async getAgentPerformance(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { departmentId } = req.query as { departmentId?: string };

    // Verify user is CXO
    const user = await prisma.user.findUnique({
      where: { id: cxoId },
      select: { role: true },
    });

    if (user?.role !== UserRole.CXO) {
      throw new AppError("Only CXO can access this endpoint", 403);
    }

    // Get departments under CXO
    let departments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true, name: true },
    });

    if (departmentId) {
      departments = departments.filter(d => d.id === departmentId);
      if (departments.length === 0) {
        throw new AppError("Department not found under your management", 404);
      }
    }

    const deptIds = departments.map(d => d.id);

    // Get all active agents in these departments
    const agents = await prisma.user.findMany({
      where: {
        agentsdepartmentId: { in: deptIds },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        supportLevel: true,
        isAvailableForAssignment: true,
        assignedDepartment: { select: { id: true, name: true } },
      },
    });

    // Get performance metrics for each agent
    const agentMetrics = await Promise.all(
      agents.map(async (agent) => {
        const [
          activeTickets,
          resolvedTickets,
          breachedTickets,
          openTickets,
          inProgressTickets,
          onHoldTickets,
          escalatedTickets,
        ] = await Promise.all([
          prisma.ticket.count({
            where: { assigneeId: agent.id, status: { not: "RESOLVED" } },
          }),
          prisma.ticket.count({
            where: { assigneeId: agent.id, status: "RESOLVED" },
          }),
          prisma.ticket.count({
            where: { assigneeId: agent.id, slaBreached: true, status: { not: "RESOLVED" } },
          }),
          prisma.ticket.count({
            where: { assigneeId: agent.id, status: "OPEN" },
          }),
          prisma.ticket.count({
            where: { assigneeId: agent.id, status: "IN_PROGRESS" },
          }),
          prisma.ticket.count({
            where: { assigneeId: agent.id, status: "ON_HOLD" },
          }),
          prisma.ticket.count({
            where: { escalatedToId: agent.id, status: { not: "RESOLVED" } },
          }),
        ]);

        // Get average resolution time
        const tatData = await prisma.ticketStatusHistory.aggregate({
          where: { ticket: { assigneeId: agent.id } },
          _avg: { durationInPrevStatusMinutes: true },
        });

        const avgResolutionTimeHrs = tatData._avg.durationInPrevStatusMinutes
          ? Math.round(tatData._avg.durationInPrevStatusMinutes / 60 * 10) / 10
          : 0;

        return {
          id: agent.id,
          fullName: agent.fullName,
          email: agent.email,
          supportLevel: agent.supportLevel,
          isAvailableForAssignment: agent.isAvailableForAssignment,
          departmentId: agent.assignedDepartment?.id,
          departmentName: agent.assignedDepartment?.name,
          metrics: {
            activeTickets,
            resolvedTickets,
            breachedTickets,
            openTickets,
            inProgressTickets,
            onHoldTickets,
            escalatedTickets,
            avgResolutionTimeHrs,
          },
        };
      })
    );

    res.json({
      cxoId,
      agents: agentMetrics,
      departmentFilter: departmentId || "all",
    });
  },

  // Get at-risk and SLA breached tickets across all departments
  async getRiskMetrics(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;
    const { departmentId } = req.query as { departmentId?: string };

    // Verify user is CXO
    const user = await prisma.user.findUnique({
      where: { id: cxoId },
      select: { role: true },
    });

    if (user?.role !== UserRole.CXO) {
      throw new AppError("Only CXO can access this endpoint", 403);
    }

    // Get departments under CXO
    let departments = await prisma.department.findMany({
      where: { cxoId },
      select: { id: true, name: true },
    });

    if (departmentId) {
      departments = departments.filter(d => d.id === departmentId);
      if (departments.length === 0) {
        throw new AppError("Department not found under your management", 404);
      }
    }

    const deptIds = departments.map(d => d.id);

    // Get breached and at-risk tickets
    const breachedTickets = await prisma.ticket.findMany({
      where: {
        departmentId: { in: deptIds },
        slaBreached: true,
        status: { not: "RESOLVED" },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        dueDate: true,
        slaDeadline: true,
        assignee: { select: { fullName: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Get high-priority open/in-progress tickets approaching SLA
    const atRiskTickets = await prisma.ticket.findMany({
      where: {
        departmentId: { in: deptIds },
        priority: { in: ["P1", "P2"] },
        status: { in: ["OPEN", "IN_PROGRESS"] },
        slaBreached: false,
        slaDeadline: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // within 24 hours
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        dueDate: true,
        slaDeadline: true,
        assignee: { select: { fullName: true } },
        department: { select: { name: true } },
      },
      orderBy: { slaDeadline: "asc" },
      take: 100,
    });

    // Categorize by department
    const breachedByDept: Record<string, typeof breachedTickets> = {};
    const atRiskByDept: Record<string, typeof atRiskTickets> = {};

    breachedTickets.forEach(t => {
      if (!breachedByDept[t.department.name]) {
        breachedByDept[t.department.name] = [];
      }
      breachedByDept[t.department.name].push(t);
    });

    atRiskTickets.forEach(t => {
      if (!atRiskByDept[t.department.name]) {
        atRiskByDept[t.department.name] = [];
      }
      atRiskByDept[t.department.name].push(t);
    });

    res.json({
      cxoId,
      summary: {
        totalBreached: breachedTickets.length,
        totalAtRisk: atRiskTickets.length,
      },
      breached: {
        total: breachedTickets.length,
        byDepartment: breachedByDept,
        tickets: breachedTickets,
      },
      atRisk: {
        total: atRiskTickets.length,
        byDepartment: atRiskByDept,
        tickets: atRiskTickets,
      },
    });
  },

  // Get department comparison metrics for charts
  async getDepartmentComparison(req: AuthedRequest, res: Response) {
    const cxoId = req.user!.id;

    // Verify user is CXO
    const user = await prisma.user.findUnique({
      where: { id: cxoId },
      select: { role: true },
    });

    if (user?.role !== UserRole.CXO) {
      throw new AppError("Only CXO can access this endpoint", 403);
    }

    // Get all departments under CXO
    const departments = await prisma.department.findMany({
      where: { cxoId },
      include: {
        manager: { select: { fullName: true } },
        agents: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    // Get comparison data for each department
    const comparison = await Promise.all(
      departments.map(async (dept) => {
        const [p1, p2, p3, p4, open, inProgress, onHold, resolved, breached] = await Promise.all([
          prisma.ticket.count({ where: { departmentId: dept.id, priority: "P1" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, priority: "P2" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, priority: "P3" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, priority: "P4" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, status: "OPEN" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, status: "IN_PROGRESS" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, status: "ON_HOLD" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, status: "RESOLVED" } }),
          prisma.ticket.count({ where: { departmentId: dept.id, slaBreached: true, status: { not: "RESOLVED" } } }),
        ]);

        const totalTickets = open + inProgress + onHold + resolved;
        const totalClosed = resolved + breached;
        const slaComplianceRate = totalClosed > 0 ? Math.round((resolved / totalClosed) * 100) : 100;

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          managerName: dept.manager?.fullName || "Unassigned",
          agentCount: dept.agents.length,
          priority: { P1: p1, P2: p2, P3: p3, P4: p4 },
          status: { open, inProgress, onHold, resolved },
          slaComplianceRate,
          breachedTickets: breached,
          totalTickets,
          avgLoadPerAgent: dept.agents.length > 0 ? (open / dept.agents.length).toFixed(1) : "0",
        };
      })
    );

    res.json({
      cxoId,
      comparison,
    });
  },
}
