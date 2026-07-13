import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { managerDashboardController } from "../controllers/managerDashboard.controller";

export const managerDashboardRouter = Router();

managerDashboardRouter.use(requireAuth);

managerDashboardRouter.get(
  "/teams",
  requireRole(UserRole.HOD),
  managerDashboardController.getTeam
);

managerDashboardRouter.get(
  "/user/:userId/tickets",
  requireRole(UserRole.HOD),
  managerDashboardController.getUserTickets
);

managerDashboardRouter.post(
  "/reassign",
  requireRole(UserRole.HOD),
  managerDashboardController.reassignTicket
);

