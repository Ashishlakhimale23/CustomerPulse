import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { ticketCategoryController } from "../controllers/ticketCategory.controller";

export const categoryRouter = Router();

categoryRouter.patch(
  "/:id",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN, UserRole.DEPT_MANAGER),
  ticketCategoryController.update
);
