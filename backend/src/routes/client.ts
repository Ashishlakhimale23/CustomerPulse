import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { clientController } from "../controllers/client.controller";
import { projectController } from "../controllers/project.controller";

export const clientRouter = Router();

// get,post 

clientRouter.get("/",requireAuth,clientController.getClients)
clientRouter.post("/",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),clientController.createClient)
clientRouter.post("/import",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),clientController.importClients)
clientRouter.delete("/:id",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),clientController.deleteClient)
clientRouter.put("/:id",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),clientController.updateClient)

// NOTE(added): projects nested under a client (a client can have multiple projects)
clientRouter.get("/:clientId/projects",requireAuth,projectController.getProjectsForClient)
clientRouter.post("/:clientId/projects",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),projectController.createProject)
