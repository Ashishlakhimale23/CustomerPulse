import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { departmentController } from "../controllers/department.controller";
import { ticketCategoryController } from "../controllers/ticketCategory.controller";

export const departmentRouter = Router();

departmentRouter.post("/", requireAuth, requireRole(UserRole.GLOBAL_ADMIN), departmentController.create);
departmentRouter.get("/", requireAuth, departmentController.list);
departmentRouter.get("/:id", requireAuth, departmentController.getById);
departmentRouter.patch("/:id", requireAuth, requireRole(UserRole.GLOBAL_ADMIN, UserRole.DEPT_MANAGER), departmentController.update);

// Categories are configured per-department - this is where the SLA hours /
// default priority / min support level used by ticketService get set.
departmentRouter.post(
  "/:departmentId/categories",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN, UserRole.DEPT_MANAGER),
  ticketCategoryController.create
);

departmentRouter.get("/:departmentId/categories", requireAuth, ticketCategoryController.list);
