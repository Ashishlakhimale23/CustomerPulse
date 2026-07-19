import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";
import { UserRole, SupportLevel } from "../generated/prisma/client";
import { invitationService, InvitationError } from "../services/invitation.service";

export const requestorController = {
  // GET /admin/requestors
  // Full directory of REQUESTER-role accounts (self-signups), for the
  // GLOBAL_ADMIN to review, approve/reject, and manage.
  async list(req: AuthedRequest, res: Response) {
    const requestors = await prisma.user.findMany({
      where: { role: UserRole.REQUESTER },
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeId: true,
        approvalStatus: true,
        isActive: true,
        createdAt: true,
        _count: { select: { ticketsRequested: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(requestors);
  },

  // POST /admin/requestors/:id/approve
  async approve(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== UserRole.REQUESTER) {
      throw new AppError("Requester not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { approvalStatus: "APPROVED", isActive: true },
    });

    res.json(updated);
  },

  // POST /admin/requestors/:id/reject
  async reject(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== UserRole.REQUESTER) {
      throw new AppError("Requester not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { approvalStatus: "REJECTED" },
    });

    res.json(updated);
  },

  // POST /admin/requestors/:id/block
  async block(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== UserRole.REQUESTER) {
      throw new AppError("Requester not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json(updated);
  },

  // POST /admin/requestors/:id/unblock
  async unblock(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== UserRole.REQUESTER) {
      throw new AppError("Requester not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });

    res.json(updated);
  },

  // DELETE /admin/requestors/:id
  async remove(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { ticketsRequested: true } } },
    });
    if (!user || user.role !== UserRole.REQUESTER) {
      throw new AppError("Requester not found", 404);
    }

    if (user._count.ticketsRequested > 0) {
      throw new AppError(
        "This requester has existing tickets and can't be deleted. Block them instead to prevent further access.",
        400
      );
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Requester deleted" });
  },

  // POST /admin/requestors/:id/message  { message }
  async sendMessage(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== UserRole.REQUESTER) {
      throw new AppError("Requester not found", 404);
    }
    if (!req.body.message || !req.body.message.trim()) {
      throw new AppError("Message text is required", 400);
    }

    const adminMessage = await prisma.adminMessage.create({
      data: {
        userId: req.params.id,
        fromAdminId: req.user!.id,
        message: req.body.message.trim(),
      },
    });

    res.status(201).json(adminMessage);
  },

  // POST /admin/requestors/bulk-invite  { requestors: [{ name, email }, ...] }
  // Bulk version of the existing single "Onboard Staff Member -> REQUESTER"
  // invite flow (see invitationController.create / invitationService).
  // Only ever creates REQUESTER invitations - agent/HOD/CXO/manager invite
  // logic is untouched. Rows whose email already belongs to a user, or
  // already has a pending invitation, are skipped rather than failing the
  // whole batch.
  async bulkInvite(req: AuthedRequest, res: Response) {
    const rows = req.body.requestors;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError("No requestor rows were provided", 400);
    }

    const created: string[] = [];
    const skipped: { name: string; email: string; reason: string }[] = [];

    // De-dupe within the uploaded file itself, so two rows with the same
    // email in one sheet don't both attempt an insert.
    const seenInFile = new Set<string>();

    for (const raw of rows) {
      const name = typeof raw?.name === "string" ? raw.name.trim() : "";
      const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";

      if (!name || !email) {
        skipped.push({ name, email, reason: "Missing name or email" });
        continue;
      }

      if (seenInFile.has(email)) {
        skipped.push({ name, email, reason: "Duplicate row in uploaded file" });
        continue;
      }
      seenInFile.add(email);

      try {
        await invitationService.createInvitation({
          inviter: { id: req.user!.id, role: req.user!.role },
          email,
          role: UserRole.REQUESTER,
          name,
          state: "",
          windCategory: null,
          departmentId: "",
          departmentIds: [],
          categoryIds: [],
          supportLevel: SupportLevel.L2,
        });
        created.push(email);
      } catch (err) {
        const reason = err instanceof InvitationError ? err.message : "Requestor already exists or could not be invited";
        skipped.push({ name, email, reason });
      }
    }

    res.status(200).json({
      totalRows: rows.length,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
    });
  },
};
