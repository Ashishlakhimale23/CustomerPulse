import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { publicTokenLimiter } from "../middleware/rateLimiter";
import { loginSchema } from "../utils/schemas";
import { authController } from "../controllers/auth.controller";

export const authRouter = Router();

// POST /auth/signup is the public requester self-registration flow.
// Accounts created this way start as PENDING and can't log in until a
// GLOBAL_ADMIN approves them from the Requestor Directory.
// (Invited accounts - agents, HODs, CXOs, admins - go through
// routes/invitations.ts -> POST /invitations/accept instead, and are
// approved by default.)
authRouter.post("/login", publicTokenLimiter, validateBody(loginSchema), asyncHandler(authController.login));
authRouter.post("/signup", publicTokenLimiter, asyncHandler(authController.signup));