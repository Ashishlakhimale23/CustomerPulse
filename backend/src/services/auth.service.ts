import bcrypt from "bcryptjs";
import { prisma } from "../lib/database";
import { signAuthToken } from "../utils/jwt";
import { AppError } from "../middleware/errorHandler";

/**
 * There is deliberately no public "signup" here. Per the onboarding flow
 * (invitation.service.ts), every user except the pre-seeded company admin
 * enters through an admin-issued invitation, and `acceptInvitation` is
 * what creates the User row + password hash. This service only covers
 * logging back in afterward.
 */
export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Same error for "no such user" and "wrong password" so login can't
    // be used to enumerate which emails exist in the system.
    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password", 401);
    }
    if (!user.isActive) {
      throw new AppError("This account has been deactivated", 403);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = signAuthToken({
      id: user.id,
      role: user.role,
      departmentId: user.departmentId,
    });

    return {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  },
};