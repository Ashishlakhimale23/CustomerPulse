import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { requestorController } from "../controllers/requestor.controller";

export const requestorRouter = Router();

requestorRouter.use(requireAuth, requireRole(UserRole.GLOBAL_ADMIN));

requestorRouter.get("/", requestorController.list);
requestorRouter.post("/bulk-invite", requestorController.bulkInvite);
requestorRouter.post("/:id/approve", requestorController.approve);
requestorRouter.post("/:id/reject", requestorController.reject);
requestorRouter.post("/:id/block", requestorController.block);
requestorRouter.post("/:id/unblock", requestorController.unblock);
requestorRouter.delete("/:id", requestorController.remove);
requestorRouter.post("/:id/message", requestorController.sendMessage);
