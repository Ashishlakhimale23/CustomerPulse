import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { publicTokenLimiter } from "../middleware/rateLimiter";
import { loginSchema } from "../utils/schemas";
import { authController } from "../controllers/auth.controller";

export const authRouter = Router();

// No POST /auth/signup - accounts are created via invitation acceptance
// (see routes/invitations.ts -> POST /invitations/accept), which is this
// system's signup flow and already returns a token on success. This
// route is just for logging back in afterward.
authRouter.post("/login", publicTokenLimiter, validateBody(loginSchema), asyncHandler(authController.login));