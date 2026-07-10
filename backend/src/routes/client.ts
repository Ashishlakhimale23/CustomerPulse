import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { clientController } from "../controllers/client.controller";

export const clientRouter = Router();

// get,post 

clientRouter.get("/",requireAuth,clientController.getClients)
clientRouter.post("/",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),clientController.createClient)
clientRouter.delete("/:id",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),clientController.deleteClient)
clientRouter.put("/:id",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),clientController.updateClient)

