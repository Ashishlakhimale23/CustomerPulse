import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { createAuditLogSchema } from "../utils/schemas";
import { auditLogController } from "../controllers/auditlogs.controller";

export const auditLogRouter = Router();

auditLogRouter.get(
  "/",
  requireAuth,
  requireRole(UserRole.GLOBAL_ADMIN, UserRole.HOD),
  asyncHandler(auditLogController.list)
);

// Any authenticated user can report a frontend-side event to the trail.
auditLogRouter.post(
  "/",
  requireAuth,
  validateBody(createAuditLogSchema),
  asyncHandler(auditLogController.create)
);