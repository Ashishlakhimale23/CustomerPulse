import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { userController } from "../controllers/user.controller";

export const userRouter = Router();

userRouter.get("/me", requireAuth, userController.me);
userRouter.patch("/me/availability", requireAuth, userController.setMyAvailability);

userRouter.get("/", requireAuth, userController.list);
  
userRouter.get("/:id", requireAuth, userController.getById);

userRouter.get('/metric/:id',requireAuth,userController.metric)

userRouter.patch("/reset/:id",requireAuth,userController.resetPassword)