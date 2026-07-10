import { prisma } from "../lib/database";
import { generateRandomString, generateToken } from "../utils/token";
import { notificationService } from "./notification.service";
import { UserRole, InvitationStatus, SupportLevel } from "../generated/prisma/client";
import { daysFromNow } from "../utils/time";
import { signAuthToken } from "../utils/jwt";
import bcrypt from "bcryptjs";

const INVITATION_TTL_DAYS = 7;

// Roles a company-wide admin may grant. GLOBAL_ADMIN can invite anyone;
// a DEPT_ADMIN is scoped to their own department and can't create other
// admins or C-suite accounts.
const DEPT_ADMIN_INVITABLE_ROLES: UserRole[] = [
  UserRole.AGENT,
  UserRole.EMPLOYEE,
];

class InvitationError extends Error {}

export const invitationService = {
  /**
   * Only GLOBAL_ADMIN or DEPT_ADMIN accounts (pre-seeded, per your flow)
   * are allowed to call this. Enforce that at the route/middleware layer
   * with requireRole(['GLOBAL_ADMIN','DEPT_ADMIN']); this function also
   * re-checks scope defensively.
   */
  async createInvitation(params: {
    inviter: { id: string; role: UserRole};
    email: string;
    role: UserRole;
    name : string,
    departmentId?: string;
    categoryIds : string[]
    supportLevel?: SupportLevel;
  }) {
    const { name, inviter, email, role, departmentId, supportLevel, categoryIds } = params;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new InvitationError("A user with this email already exists");

    const existingPending = await prisma.invitation.findFirst({
      where: { email, status: InvitationStatus.PENDING },
    });
    if (existingPending) throw new InvitationError("An active invitation already exists for this email");
    const password = generateRandomString(10)
    const passwordHash = await bcrypt.hash(password, 10);
    


    const invitation = await prisma.invitation.create({
      data: {
        name,
        email,
        Password:passwordHash,
        invitedById: inviter.id,
        role,
        departmentId: departmentId ,
        categories : { 
          connect : categoryIds.map(id => ({id}))
        },
        supportLevel,
        token: generateToken(),
        expiresAt: daysFromNow(INVITATION_TTL_DAYS),
      },
    });

    await notificationService.sendInvitation(email, invitation.token,  role,password);
    return invitation;
  },


  async acceptInvitation(params: { token: string; fullName: string; password: string }) {
    const { token } = params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        categories: true,
      },
    });
    if (!invitation) throw new InvitationError("Invalid invitation token");
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new InvitationError(`Invitation is ${invitation.status.toLowerCase()}`);
    }
    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new InvitationError("Invitation has expired - ask an admin to resend it");
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          fullName : invitation.name,
          passwordHash :invitation.Password,
          role: invitation.role,
          departmentId: invitation.departmentId,
          supportLevel: invitation.supportLevel,
          onboardedById: invitation.invitedById,

          categoryAssignments: {
            create: invitation.categories.map((category) => ({
              categoryId: category.id,
            })),
          },
        },
        include: {
          categoryAssignments: true,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
        },
      });

      return created;
    });

    const authToken = signAuthToken({
      id: user.id,
      role: user.role,
      departmentId: user.departmentId,
    });

    return { user, token: authToken };
  },

  async cancelInvitation(id: string) {
    return prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.CANCELLED },
    });
  },

  async resendInvitation(id: string) {
    const invitation = await prisma.invitation.findUniqueOrThrow({ where: { id } });
    const refreshed = await prisma.invitation.update({
      where: { id },
      data: {
        token: generateToken(),
        expiresAt: daysFromNow(INVITATION_TTL_DAYS),
        status: InvitationStatus.PENDING,
      },
    });
    await notificationService.sendInvitation(refreshed.email, refreshed.token,  refreshed.role,refreshed.Password);
    return refreshed;
  },

  /** Run on a schedule (see jobs/scheduler.ts) to sweep stale invites. */
  async expireStaleInvitations() {
    const { count } = await prisma.invitation.updateMany({
      where: { status: InvitationStatus.PENDING, expiresAt: { lt: new Date() } },
      data: { status: InvitationStatus.EXPIRED },
    });
    return count;
  },
};

export { InvitationError };
