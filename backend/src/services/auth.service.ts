import bcrypt from "bcryptjs";
import { prisma } from "../lib/database";
import { signAuthToken } from "../utils/jwt";
import { AppError } from "../middleware/errorHandler";
import { includes } from "zod";
import { generateOtp } from "../utils/token";
import { minutesFromNow } from "../utils/time";
import { notificationService } from "./notification.service";

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * There is deliberately no public "signup" here. Per the onboarding flow
 * (invitation.service.ts), every user except the pre-seeded company admin
 * enters through an admin-issued invitation, and `acceptInvitation` is
 * what creates the User row + password hash. This service only covers
 * logging back in afterward.
 */
export const authService = {
  async login(email: string, password: string) {
   
const user = await prisma.user.findUnique({
  where: { email },
  include: {
    assignedDepartment: true,
    managedDepartments: true,
    coxDepartements: true,
  },
});

    // Same error for "no such user" and "wrong password" so login can't
    // be used to enumerate which emails exist in the system.
    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password", 401);
    }
    if (!user.isActive) {
      throw new AppError("This account has been deactivated", 403);
    }
    if (user.approvalStatus === "PENDING") {
      throw new AppError("Your registration is still pending admin approval", 403);
    }
    if (user.approvalStatus === "REJECTED") {
      throw new AppError("Your registration request was not approved", 403);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = signAuthToken({
      id: user.id,
      role: user.role,
    });

    return {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role ,departments : [...user.managedDepartments.map(dept => dept.id),...user.coxDepartements.map(dept => dept.id),user.assignedDepartment?.id]},
    };
  },

  /**
   * Step 1 of forgot-password: issue a 6-digit OTP and email it.
   * Always resolves the same way whether or not the email exists, so this
   * endpoint can't be used to enumerate registered accounts - if the user
   * exists (and can actually log in) we fire off the email in the
   * background, otherwise we silently no-op.
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.passwordHash && user.isActive && user.approvalStatus === "APPROVED") {
      const otp = generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);

      await prisma.passwordResetOtp.create({
        data: {
          email,
          otpHash,
          expiresAt: minutesFromNow(OTP_TTL_MINUTES),
        },
      });

      await notificationService.sendPasswordResetOtp(email, otp);
    }

    return { message: "If an account exists for this email, a verification code has been sent." };
  },

  /**
   * Step 2: check the OTP the user typed in against the most recent
   * still-live code we issued for that email. Marks the row `verified`
   * (but not consumed) so resetPassword can trust it was actually checked,
   * without letting the same code be reused indefinitely afterward.
   */
  async verifyPasswordResetOtp(email: string, otp: string) {
    const record = await prisma.passwordResetOtp.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired code. Please request a new one.", 400);
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new AppError("Too many incorrect attempts. Please request a new code.", 429);
    }

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      await prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError("Invalid or expired code. Please request a new one.", 400);
    }

    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return { verified: true };
  },

  /**
   * Step 3: re-checks the OTP (rather than trusting a client-side "verified"
   * flag) and, if it's still the same code, still unexpired, and was
   * previously verified via step 2, updates the password hash and burns
   * the OTP so it can't be replayed.
   */
  async resetPassword(email: string, otp: string, password: string) {
    const record = await prisma.passwordResetOtp.findFirst({
      where: { email, consumedAt: null, verified: true },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired code. Please request a new one.", 400);
    }

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      throw new AppError("Invalid or expired code. Please request a new one.", 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("Invalid or expired code. Please request a new one.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetOtp.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    ]);

    return { message: "Password reset successfully. You can now log in with your new password." };
  },
};
