import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";
import { presignAttachmentSchema } from "../utils/schemas";
import {
  buildAttachmentKey,
  createPresignedUploadUrl,
  isAllowedAttachment,
  isOwnedByOurBucket,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "../lib/s3";

// File bytes are uploaded directly to S3 from the browser via a presigned
// URL (see `presign` below) - they never pass through this API. Once the
// upload succeeds client-side, `create` is called to record the resulting
// object's metadata against the ticket.
export const attachmentController = {
  // POST /tickets/:ticketId/attachments/presign  { fileName, fileType, fileSize }
  // Returns a short-lived S3 PUT URL the browser can upload straight to,
  // plus the public fileUrl to record afterwards. Only xlsx/pdf/image
  // files under 20MB are accepted.
  async presign(req: AuthedRequest, res: Response) {
    const { fileName, fileType, fileSize } = presignAttachmentSchema.parse(req.body);

    // Make sure the ticket exists (and implicitly scope the S3 key to it).
    await prisma.ticket.findUniqueOrThrow({ where: { id: req.params.ticketId } });

    if (!isAllowedAttachment(fileName, fileType)) {
      throw new AppError("Unsupported file type. Allowed: PDF, XLSX, XLS, PNG, JPG, WEBP, GIF", 400);
    }
    if (fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new AppError("File exceeds the 20MB limit", 400);
    }

    const key = buildAttachmentKey(req.user!.companyId, req.params.ticketId, fileName);
    const { uploadUrl, fileUrl } = await createPresignedUploadUrl(key, fileType, fileSize);

    res.json({ uploadUrl, fileUrl, key, fileName });
  },

  // POST /tickets/:ticketId/attachments  { fileName, fileUrl }
  // Called after the browser has already PUT the file to S3 using the
  // presigned URL from `presign`. Rejects fileUrls that don't point at
  // our own bucket so this can't be used to link out to arbitrary URLs.
  async create(req: AuthedRequest, res: Response) {
    const { fileName, fileUrl } = req.body;
    if (!fileName || !fileUrl) {
      throw new AppError("fileName and fileUrl are required", 400);
    }
    if (!isOwnedByOurBucket(fileUrl)) {
      throw new AppError("fileUrl must point at an uploaded document in the configured S3 bucket", 400);
    }
    if (!isAllowedAttachment(fileName, "")) {
      throw new AppError("Unsupported file type. Allowed: PDF, XLSX, XLS, PNG, JPG, WEBP, GIF", 400);
    }

    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId: req.params.ticketId,
        fileName,
        fileUrl,
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

