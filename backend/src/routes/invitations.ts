import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { invitationController } from "../controllers/invitation.controller";

export const invitationRouter = Router();

invitationRouter.post("/", requireAuth, requireRole(UserRole.GLOBAL_ADMIN), invitationController.create);
invitationRouter.post("/bulk", requireAuth, requireRole(UserRole.GLOBAL_ADMIN), invitationController.bulkCreate);
invitationRouter.post("/accept", invitationController.accept); // public - invitee has no account yet
invitationRouter.get("/", requireAuth, requireRole(UserRole.GLOBAL_ADMIN, UserRole.HOD), invitationController.list);
invitationRouter.post("/:id/resend", requireAuth, requireRole(UserRole.GLOBAL_ADMIN, UserRole.HOD), invitationController.resend);
invitationRouter.post("/:id/cancel", requireAuth, requireRole(UserRole.GLOBAL_ADMIN, UserRole.HOD), invitationController.cancel);
