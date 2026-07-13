import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";

export const notificationController = {
  // GET /notifications/me
  async myMessages(req: AuthedRequest, res: Response) {
    const messages = await prisma.adminMessage.findMany({
      where: { userId: req.user!.id },
      include: { fromAdmin: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  },

  // PATCH /notifications/:id/read
  async markRead(req: AuthedRequest, res: Response) {
    const updated = await prisma.adminMessage.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ updated: updated.count });
  },
};