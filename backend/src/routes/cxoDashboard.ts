import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { cxoDashboardController } from "../controllers/cxodashboard.controller";

export const cxoRouter = Router();


// Get department overview with metrics
cxoRouter.get("/departments-overview",requireAuth, asyncHandler(cxoDashboardController.getDepartmentOverview));

// Get manager performance metrics
cxoRouter.get("/manager-performance",requireAuth, asyncHandler(cxoDashboardController.getManagerPerformance));

// Get agent performance metrics
cxoRouter.get("/agent-performance",requireAuth, asyncHandler(cxoDashboardController.getAgentPerformance));

// Get risk metrics (SLA breached and at-risk tickets)
cxoRouter.get("/risk-metrics",requireAuth, asyncHandler(cxoDashboardController.getRiskMetrics));

// Get department comparison data
cxoRouter.get("/department-comparison",requireAuth, asyncHandler(cxoDashboardController.getDepartmentComparison));

cxoRouter.get("/departments",requireAuth, asyncHandler(cxoDashboardController.getDepartments)); 
cxoRouter.get("/team",requireAuth, asyncHandler(cxoDashboardController.getTeam));
cxoRouter.get("/tickets",requireAuth, asyncHandler(cxoDashboardController.getDepartmentTickets));
cxoRouter.get("/user/:userId/tickets",requireAuth, asyncHandler(cxoDashboardController.getUserTickets));
cxoRouter.post("/reassign", requireAuth,asyncHandler(cxoDashboardController.reassignTicket));




