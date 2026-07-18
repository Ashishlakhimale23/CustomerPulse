import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { subDepartmentController } from "../controllers/subDepartment.controller";

export const subDepartmentRouter = Router();

subDepartmentRouter.patch(
  "/:id",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN, UserRole.HOD),
  subDepartmentController.update
);

subDepartmentRouter.delete(
  "/:id",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN),
  subDepartmentController.delete
);
