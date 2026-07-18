import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { publicTokenLimiter } from "../middleware/rateLimiter";
import { loginSchema, requestPasswordResetSchema, verifyPasswordResetOtpSchema, resetPasswordSchema } from "../utils/schemas";
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

// Forgot-password flow: request an OTP by email, verify it, then set a new
// password. All three are unauthenticated + brute-forceable (email/OTP
// guessing), so they share the same tight rate limiter as /login.
authRouter.post(
  "/forgot-password",
  publicTokenLimiter,
  validateBody(requestPasswordResetSchema),
  asyncHandler(authController.requestPasswordReset)
);
authRouter.post(
  "/verify-reset-otp",
  publicTokenLimiter,
  validateBody(verifyPasswordResetOtpSchema),
  asyncHandler(authController.verifyPasswordResetOtp)
);
authRouter.post(
  "/reset-password",
  publicTokenLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);
