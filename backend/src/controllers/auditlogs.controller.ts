import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";

export const auditLogController = {
  // GET /audit-logs?userId=&entityType=&entityId=  (GLOBAL_ADMIN, DEPT_ADMIN)
  async list(req: AuthedRequest, res: Response) {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: req.query.userId as string | undefined,
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId as string | undefined,
      },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(logs);
  },

  // POST /audit-logs  { action, entityType, entityId? }  (any authenticated user)
  // For frontend-driven events that don't already produce an AuditLog
  // row as a side effect of some other mutation (status changes, priority
  // overrides, and invitation actions already log themselves server-side
  // - this is for reporting purely client-side actions back to the trail,
  // e.g. "viewed ticket", "downloaded attachment").
  async create(req: AuthedRequest, res: Response) {
    const log = await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: req.body.action,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
      },
    });
    res.status(201).json(log);
  },
};