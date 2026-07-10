import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";

// This assumes file bytes are uploaded directly to object storage (S3/GCS)
// from the client via a presigned URL, and this endpoint just records the
// resulting metadata. Swap for a multipart upload handler if you'd rather
// proxy the bytes through this API.
export const attachmentController = {
  // POST /tickets/:ticketId/attachments  { fileName, fileUrl }
  async create(req: AuthedRequest, res: Response) {
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId: req.params.ticketId,
        fileName: req.body.fileName,
        fileUrl: req.body.fileUrl,
        uploadedBy: req.user!.id,
      },
    });
    res.status(201).json(attachment);
  },

  // GET /tickets/:ticketId/attachments
  async list(req: AuthedRequest, res: Response) {
    const attachments = await prisma.ticketAttachment.findMany({
      where: { ticketId: req.params.ticketId },
      include: { uploader: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(attachments);
  },
};
