import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";
import { UserRole } from "../generated/prisma/client";

export const managerDashboardController = {
  async getTeam(req: AuthedRequest, res: Response) {
    const managerId = req.user!.id;
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      throw new AppError("You are not assigned to any department", 400);
    }

    const department = await prisma.department.findMany({
      where: { managerId: manager.id },
      select: { name: true,id :true},
    });

    const departmentIds = department.map(dept => dept.id)

    const users = await prisma.user.findMany({
      where: {
        agentsdepartmentId:{in:departmentIds},
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isAvailableForAssignment: true,
      },
      orderBy: { fullName: "asc" },
    });

    const usersWithTickets = await Promise.all(
      users.map(async (u) => {
        const [activeTickets, totalRequested, openCount, inProgressCount, resolvedCount, breachedCount] =
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
              where: { assigneeId: u.id, slaBreached: true, status: { not: "RESOLVED" } },
            }),
          ]);

        return {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          isAvailableForAssignment: u.isAvailableForAssignment,
          activeTickets,
          totalRequested,
          openTickets: openCount,
          inProgressTickets: inProgressCount,
          resolvedTickets: resolvedCount,
          breachedTickets: breachedCount,
        };
      })
    );

    res.json({
      departmentId: departmentIds,
      departmentName: department || "Unknown",
      users: usersWithTickets,
    });
  },

  async getUserTickets(req: AuthedRequest, res: Response) {
    const managerId = req.user!.id;
    const { userId } = req.params;

    const manager = await prisma.department.findMany({
      where: { managerId: managerId },
      select:{
        id : true
      }
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { agentsdepartmentId: true, fullName: true },
    });

    
    const managerIds = manager.map(ids => ids.id)

    if (!manager || !targetUser || !managerIds.includes(targetUser.agentsdepartmentId!) ) {
      throw new AppError("User is not in your department", 403);
    }


    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          { requesterId: userId },
        ],
        departmentId:{in:managerIds},
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
      user: { id: userId, fullName: targetUser?.fullName },
      tickets,
    });
  },

  async reassignTicket(req: AuthedRequest, res: Response) {
    const managerId = req.user!.id;
    const { ticketId, newAssigneeId } = req.body;

    if (!ticketId || !newAssigneeId) {
      throw new AppError("ticketId and newAssigneeId are required", 400);
    }

    const manager = await prisma.department.findMany({
      where: { managerId : managerId },
      select: { id: true },
    });

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { departmentId: true, assigneeId: true, status: true, ticketNumber: true },
    });

    const managerIds = manager.map(ids => ids.id)

    if (!ticket) throw new AppError("Ticket not found", 404);
    if (!managerIds.includes(ticket.departmentId)) {
      throw new AppError("Ticket is not in your department", 403);
    }
    if (ticket.assigneeId === newAssigneeId) {
      throw new AppError("Ticket is already assigned to this user", 400);
    }

    const prevStatus = ticket.status;

    const newAssignee = await prisma.user.findUnique({
      where: { id: newAssigneeId },
      select: { agentsdepartmentId: true, isActive: true },
    });

    if (!newAssignee || !newAssignee.isActive) {
      throw new AppError("New assignee not found or inactive", 400);
    }
    if (!managerIds.includes(newAssignee.agentsdepartmentId!)) {
      throw new AppError("New assignee is not in your department", 400);
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: newAssigneeId,
        assignedById: managerId,
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
        changedById: managerId,
        changedAt: new Date(),
        note: `Reassigned by manager from ${prevStatus} to ${updated.assignee?.fullName || "another agent"}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: managerId,
        action: `Reassigned ticket ${updated.ticketNumber} to ${updated.assignee?.fullName || "another agent"}`,
        entityType: "Ticket",
        entityId: ticketId,
      },
    });

    res.json(updated);
  },


};