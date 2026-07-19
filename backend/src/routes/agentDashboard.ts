import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { agentDashboardController } from "../controllers/agentDashboard.controller";

export const agentDashboardRouter = Router();

// GET /agent-dashboard/analytics
// Personal analytics for the signed-in agent (AgentDashboardmock.tsx):
// their tickets (with time-in-status segments + category), department
// categories, and a department TAT baseline to compare against.
agentDashboardRouter.get(
  "/analytics",
  requireAuth,
  requireRole(UserRole.AGENT),
  asyncHandler(agentDashboardController.getAnalytics)
);
