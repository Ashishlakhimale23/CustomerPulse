import { prisma } from "../lib/database";
import { generateRandomString, generateToken } from "../utils/token";
import { notificationService } from "./notification.service";
import { UserRole, InvitationStatus, SupportLevel, Invitation } from "../generated/prisma/client";
import { daysFromNow } from "../utils/time";
import { signAuthToken } from "../utils/jwt";
import bcrypt from "bcryptjs";

const INVITATION_TTL_DAYS = 7;

// Roles a company-wide admin may grant. GLOBAL_ADMIN can invite anyone;
// a DEPT_ADMIN is scoped to their own department and can't create other
// admins or C-suite accounts.
const DEPT_ADMIN_INVITABLE_ROLES: UserRole[] = [
  UserRole.AGENT,
  UserRole.HOD,
  UserRole.CXO,
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
    departmentId: string;
    departmentIds : string[],
    categoryIds : string[]
    supportLevel: SupportLevel;
  }) {
    const { name, inviter, email, role, departmentId,departmentIds, supportLevel, categoryIds } = params;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new InvitationError("A user with this email already exists");

    const existingPending = await prisma.invitation.findFirst({
      where: { email, status: InvitationStatus.PENDING },
    });

    if (existingPending) throw new InvitationError("An active invitation already exists for this email");
    const password = "12345"
    const passwordHash = await bcrypt.hash(password, 10);
    let invitation
    if(role == UserRole.CXO || role == UserRole.HOD){
      invitation = await prisma.invitation.create({
        data: {
          name,
          email,
          Password: passwordHash,
          invitedById: inviter.id,
          role,
          department: {
            connect: departmentIds.map(id => ({ id }))
          },
          categories: {
            connect: categoryIds.map(id => ({ id }))
          },
          supportLevel,
          token: generateToken(),
          expiresAt: daysFromNow(INVITATION_TTL_DAYS),
        },
      });
    }else{
      invitation = await prisma.invitation.create({
        data: {
          name,
          email,
          Password: passwordHash,
          invitedById: inviter.id,
          role,
          department:{
            connect : {id :departmentId}
          }, 
          categories: {
            connect: categoryIds.map(id => ({ id }))
          },
          supportLevel,
          token: generateToken(),
          expiresAt: daysFromNow(INVITATION_TTL_DAYS),
        },
      });


    }



    await notificationService.sendInvitation(email, invitation.token, role, password);
    return invitation;
  },


  async acceptInvitation(params: { token: string; fullName: string; password: string }) {
    const { token } = params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        categories: true,
        department: true
      },
    });
    if (!invitation) throw new InvitationError("Invalid invitation token");
    console.log(invitation)
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

    // THREE CASES BASED ON ROLE (AGENT, HOD, CXO)

    let user

    switch (invitation.role) {

      case "CXO":

        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: invitation.email,
              fullName: invitation.name,
              passwordHash: invitation.Password,
              role: invitation.role,
              coxDepartements : {
                connect: invitation.department
                  .filter((dept: any) => dept?.id != null)           
                  .map((dept: any) => ({
                    id: dept.id!                                    
                  }))
              },
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
              assignedDepartment: true,
              managedDepartments: true,
              coxDepartements: true,
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
        break
      case "HOD":
        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: invitation.email,
              fullName: invitation.name,
              passwordHash: invitation.Password,
              role: invitation.role,
              managedDepartments: {
                connect: invitation.department
                  .filter((dept: any) => dept?.id != null)           // remove null/undefined
                  .map((dept: any) => ({
                    id: dept.id!                                     // safe non-null
                  }))
              },
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
              assignedDepartment: true,
              managedDepartments: true,
              coxDepartements: true,
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
        break

      case "AGENT":
        const deparment = invitation.department.map(dept => dept.id)
        const deparmentId = deparment[0]
        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: invitation.email,
              fullName: invitation.name,
              passwordHash: invitation.Password,
              role: invitation.role,
              agentsdepartmentId: deparmentId ,
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
              assignedDepartment: true,
              managedDepartments: true,
              coxDepartements: true,
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
        break
    }



    if(!user) throw new InvitationError("User cannot be created")

    const authToken = signAuthToken({
      id: user.id,
      role: user.role,
    
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
