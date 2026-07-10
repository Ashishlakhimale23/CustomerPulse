import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";

export const userController = {
  // GET /users/me
  async me(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { department: true, skills: { include: { keyword: true } } },
    });
    res.json(user);
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
      totalSubmissions,
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
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        openTickets,
        assignedTickets,
        slaBreachedTickets,
        resolvedTickets,
        totalSubmissions,
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
        id: true, fullName: true, email: true, role: true, departmentId:true,
        supportLevel: true, isActive: true, isAvailableForAssignment: true, maxActiveTickets: true,
        _count : {
          select : {
            ticketsAssigned : true
          }
        }
      },
    
    });
    res.json(users);
  },

  // GET /users/:id
  // @ts-ignore
  async getById(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { department: true, skills: { include: { keyword: true } }, manager: true },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  },

  // PATCH /users/:id
  // Admin-managed fields: role, departmentId, managerId, supportLevel,
  // isActive, isAvailableForAssignment, maxActiveTickets.
  // Restrict which fields non-admins can touch (e.g. only isAvailableForAssignment
  // for their own record) at the route/middleware layer via requireRole.
  async update(req: AuthedRequest, res: Response) {
    const {
      role, departmentId, managerId, supportLevel,
      isActive, isAvailableForAssignment, maxActiveTickets, fullName,
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        role, departmentId, managerId, supportLevel,
        isActive, isAvailableForAssignment, maxActiveTickets, fullName,
      },
    });
    res.json(user);
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
};
