import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { notificationController } from "../controllers/notification.controller";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get("/me", notificationController.myMessages);
notificationRouter.patch("/:id/read", notificationController.markRead);