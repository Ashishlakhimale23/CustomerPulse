import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { keywordController } from "../controllers/keyword.controller";

export const keywordRouter = Router();
const ADMIN_ROLES = [UserRole.DEPT_MANAGER, UserRole.GLOBAL_ADMIN];

keywordRouter.post("/", requireAuth, requireRole(...ADMIN_ROLES), keywordController.create);
keywordRouter.get("/", requireAuth, keywordController.list);

keywordRouter.post("/agents/:userId/skills", requireAuth, requireRole(...ADMIN_ROLES), keywordController.assignSkills);
keywordRouter.delete("/agents/:userId/skills/:keywordId", requireAuth, requireRole(...ADMIN_ROLES), keywordController.removeSkill);

keywordRouter.get("/departments/:departmentId/suggestions", requireAuth, requireRole(...ADMIN_ROLES), keywordController.listSuggestions);
keywordRouter.post("/suggestions/:id/promote", requireAuth, requireRole(...ADMIN_ROLES), keywordController.promoteSuggestion);
keywordRouter.post("/suggestions/:id/reject", requireAuth, requireRole(...ADMIN_ROLES), keywordController.rejectSuggestion);
