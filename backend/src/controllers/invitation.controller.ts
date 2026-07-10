import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { invitationService } from "../services/invitation.service";
import { prisma } from "../lib/database";

// No try/catch needed here - routes wrap these in asyncHandler, and
// InvitationError is caught centrally by middleware/errorHandler.ts.
export const invitationController = {
  // POST /invitations  (GLOBAL_ADMIN, DEPT_ADMIN)
  // @ts-ignore
  async create(req: AuthedRequest, res: Response) {
    const inviter = req.user
    if (inviter == undefined || !inviter || inviter == null){
      return res.status(401).json({message:"no inviter found"})
    }

    const invitation = await invitationService.createInvitation({
      inviter: {
      id: inviter.id,
      role: inviter.role,
      },
      email: req.body.email,
      role: req.body.role,
      name : req.body.name,
      departmentId: req.body.departmentId,
      categoryIds : req.body.categoryIds, 
      supportLevel: req.body.supportLevel,
    });
    res.status(201).json({message:
      "Successfully send invite"
    });
  },

  // POST /invitations/accept  (public - invitee lands here from the emailed link)
  // Creates the account AND logs them in, same as a signup+login combo.
  async accept(req: AuthedRequest, res: Response) {
    const { user, token } = await invitationService.acceptInvitation({
      token: req.body.token,
      fullName: req.body.fullName,
      password: req.body.password,
    });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  },

  // GET /invitations (GLOBAL_ADMIN, DEPT_ADMIN)
  async list(req: AuthedRequest, res: Response) {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      select:{
        id : true,
        role : true,
        email: true,
        status : true,
        department:{
          select:{
            name : true
          }
        }
      }
    });
    res.json(invitations);
  },

  // POST /invitations/:id/resend
  async resend(req: AuthedRequest, res: Response) {
    const invitation = await invitationService.resendInvitation(req.params.id);
    res.json(invitation);
  },

  // POST /invitations/:id/cancel
  async cancel(req: AuthedRequest, res: Response) {
    const invitation = await invitationService.cancelInvitation(req.params.id);
    res.json(invitation);
  },
};
