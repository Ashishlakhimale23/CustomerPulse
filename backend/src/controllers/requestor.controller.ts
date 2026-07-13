import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";
import { UserRole } from "../generated/prisma/client";

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
};