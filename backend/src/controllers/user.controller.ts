import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { TicketStatus } from "../generated/prisma/enums";
import { AppError } from "../middleware/errorHandler";

export const userController = {
  // GET /users/me
  async me(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    });
    res.json({ ...user, departmentId: user.agentsdepartmentId });
  },

  //metric ->count of opentickets,assigned tickets,sla breached,resolved,total submissions
  async metric(req: AuthedRequest, res: Response) {
  try {
    const userId = req.params.id; // or req.params.userId

    const [
      openTickets,
      assignedTickets,
      slaBreachedTickets,
      resolvedTickets,
      onhold,
    ] = await prisma.$transaction([
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: "OPEN",
        },
      }),

      prisma.ticket.count({
        where: {
          status :{  notIn: ["RESOLVED"]},
          assigneeId: req.params.id
        },
      }),

      prisma.ticket.count({
        where: {
          requesterId: userId,
          slaBreached: true,
        },
      }),

      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: "RESOLVED",
        },
      }),

      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.ON_HOLD
        }
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        openTickets,
        assignedTickets,
        slaBreachedTickets,
        resolvedTickets,
        onhold,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch metrics",
    });
  }
},

  // GET /users
  async list(req: AuthedRequest, res: Response) {
    const users = await prisma.user.findMany({
      where: {
      },
      select: {
        id: true, fullName: true, email: true, role: true, 
        supportLevel: true, isActive: true, isAvailableForAssignment: true, maxActiveTickets: true,
        agentsdepartmentId: true,
        _count : {
          select : {
            ticketsAssigned : true
          }
        }
      },
    
    });
    res.json(users.map(u => ({ ...u, departmentId: u.agentsdepartmentId })));
  },

  // GET /users/:id
  // @ts-ignore
  async getById(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ ...user, departmentId: user.agentsdepartmentId });
  },
  // PATCH /users/me/availability  { isAvailableForAssignment }
  // Self-service toggle so an agent going on break/PTO stops receiving
  // new auto-assignments without an admin having to intervene.
  async setMyAvailability(req: AuthedRequest, res: Response) {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { isAvailableForAssignment: Boolean(req.body.isAvailableForAssignment) },
    });
    res.json(user);
  },

  // PATCH /users/:id  (GLOBAL_ADMIN only)
  // Lets an admin edit an operator's profile from the User Directory,
  // including transferring an agent to a different department when
  // teams get reorganized.
  async update(req: AuthedRequest, res: Response) {
    const { role, departmentId, supportLevel, isActive, isAvailableForAssignment, maxActiveTickets } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError("User not found", 404);

    if (departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) throw new AppError("Department not found", 404);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(role !== undefined && { role }),
        agentsdepartmentId: departmentId || null,
        ...(supportLevel !== undefined && { supportLevel: supportLevel || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isAvailableForAssignment !== undefined && { isAvailableForAssignment: Boolean(isAvailableForAssignment) }),
        ...(maxActiveTickets !== undefined && { maxActiveTickets: Number(maxActiveTickets) }),
      },
    });

    res.json({ ...user, departmentId: user.agentsdepartmentId });
  },
};
