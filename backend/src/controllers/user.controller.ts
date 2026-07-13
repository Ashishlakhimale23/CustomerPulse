import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { TicketStatus } from "../generated/prisma/enums";
import bcrypt from "bcryptjs"

export const userController = {
  // GET /users/me
  async me(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
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
      onhold,
    ] = await prisma.$transaction([
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: {in:[TicketStatus.IN_PROGRESS,TicketStatus.REOPENED,TicketStatus.OPEN]},
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
    });
    if (!user) return res.status(404).json({ error: "Not found" });
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
// @ts-ignore
  async resetPassword(req:AuthedRequest,res:Response){
    const {newPassword,oldPassword} = req.body
    console.log(newPassword,oldPassword)
    const checkuser = await prisma.user.findFirst({
      where : {id : req.params.id}
    })

    if (!checkuser || !checkuser.passwordHash) return res.json("no user found")

    const check = await bcrypt.compare(oldPassword,checkuser.passwordHash)

    if(!check) return res.json("password did'nt match")

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where :{id : req.params.id} ,
      data : {
        passwordHash
      }
    })

    res.json(user)
  }
};
