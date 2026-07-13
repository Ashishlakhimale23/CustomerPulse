import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { ticketCategoryController } from "../controllers/ticketCategory.controller";
import { ticketController } from "../controllers/ticket.controller";

export const categoryRouter = Router();

categoryRouter.patch(
  "/:id",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN, UserRole.HOD),
  ticketCategoryController.update
);

categoryRouter.delete(
  "/:id",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN),
  ticketCategoryController.delete
)