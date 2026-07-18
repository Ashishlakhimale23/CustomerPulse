import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { projectController } from "../controllers/project.controller";

export const projectRouter = Router();

// NOTE(added): update/delete a project by its own id. Listing/creation of
// projects for a given client lives under /clients/:clientId/projects
// (see routes/client.ts).
projectRouter.put("/:id",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),projectController.updateProject)
projectRouter.delete("/:id",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),projectController.deleteProject)
