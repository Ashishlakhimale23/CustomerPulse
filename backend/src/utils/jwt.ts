import jwt from "jsonwebtoken";
import { UserRole } from "../generated/prisma/client";

export interface AuthTokenPayload {
  id: string;
  role: UserRole;
}

const EXPIRES_IN = "12h";

/**
 * This is plain JWT for local/testing use, explicitly NOT SSO. Swap
 * `signAuthToken`/`verifyAuthToken` for your real identity provider's
 * token issuance/verification later - middleware/auth.ts and this file
 * are the only two places that need to change, since every controller
 * just reads req.user off AuthedRequest either way.
 */
export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET || "its-me", { expiresIn: EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET || "its-me") as AuthTokenPayload;
}