import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { managerDashboardController } from "../controllers/managerDashboard.controllar"

export const managerDashboardRouter = Router();

managerDashboardRouter.use(requireAuth);

managerDashboardRouter.get(
  "/team",
  requireRole(UserRole.DEPT_MANAGER),
  managerDashboardController.getTeam
);

managerDashboardRouter.get(
  "/user/:userId/tickets",
  requireRole(UserRole.DEPT_MANAGER),
  managerDashboardController.getUserTickets
);

managerDashboardRouter.post(
  "/reassign",
  requireRole(UserRole.DEPT_MANAGER),
  managerDashboardController.reassignTicket
);

managerDashboardRouter.post(
  "/set-manager",
  requireRole(UserRole.GLOBAL_ADMIN),
  managerDashboardController.setDepartmentManager
);
