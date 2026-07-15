import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { managerDashboardController } from "../controllers/managerDashboard.controller";

export const managerDashboardRouter = Router();


managerDashboardRouter.get(
  "/team",
  requireAuth,
  requireRole(UserRole.HOD),
  managerDashboardController.getTeam
);

managerDashboardRouter.get(
  "/user/:userId/tickets",
  requireAuth,
  requireRole(UserRole.HOD),
  managerDashboardController.getUserTickets
);

managerDashboardRouter.post(
  "/reassign",
  requireAuth,
  requireRole(UserRole.HOD),
  managerDashboardController.reassignTicket
);

managerDashboardRouter.post(
  "/set-manager",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN),
  managerDashboardController.setDepartmentManager
);
