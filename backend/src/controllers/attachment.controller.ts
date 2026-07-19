import fs from "fs";
import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";
import { presignAttachmentSchema } from "../utils/schemas";
import { isStaff } from "../utils/rbac";
import { TicketComment } from "../generated/prisma/client";
import {
  buildAttachmentKey,
  createPresignedUploadUrl,
  isAllowedAttachment,
  isOwnedByOurBucket,
  keyFromLocalFileUrl,
  resolveLocalAttachmentPath,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "../lib/s3";

// S3 logic is commented out for now (see lib/s3.ts) - attachments are
// temporarily stored on local disk under `backend/attachment` instead.
// File bytes are uploaded by the browser via a PUT to the URL returned by
// `presign` below (which now points at our own `/uploads` route rather than
// a presigned S3 URL) - they still don't pass through this API's normal
// JSON body handling. Once the upload succeeds client-side, `create` is
// called to record the resulting object's metadata against the ticket.

const DEFAULT_ATTACHMENT_COMMENT_PREFIX = "Attached: ";

/**
 * Flags a comment's text as referring to a now-deleted attachment. No
 * schema change - this just rewrites commentText itself. If the comment
 * was the auto-generated "Attached: <file>" note, it's replaced outright;
 * if the user had typed their own comment, their text is kept and a
 * "[Attachment deleted]" note is appended instead.
 */
function markCommentAttachmentDeleted(commentText: string, fileName: string): string {
  if (commentText === `${DEFAULT_ATTACHMENT_COMMENT_PREFIX}${fileName}`) {
    return `[Attachment deleted] ${fileName}`;
  }
  return `${commentText}\n\n[Attachment deleted: ${fileName}]`;
}

export const attachmentController = {
  // POST /tickets/:ticketId/attachments/presign  { fileName, fileType, fileSize }
  // Returns a URL the browser can PUT the file bytes straight to (local
  // stand-in for a presigned S3 PUT URL), plus the fileUrl to record
  // afterwards. Only xlsx/pdf/image files under 20MB are accepted.
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

    const key = buildAttachmentKey(req.params.ticketId, fileName);
    const { uploadUrl, fileUrl } = await createPresignedUploadUrl(key, fileType, fileSize);

    res.json({ uploadUrl, fileUrl, key, fileName });
  },

  // POST /tickets/:ticketId/attachments  { fileName, fileUrl, commentText? }
  // Called after the browser has already PUT the file using the uploadUrl
  // from `presign`. Rejects fileUrls that don't point at our own local
  // `/uploads` storage so this can't be used to link out to arbitrary URLs.
  //
  // Also posts a comment alongside the attachment, so it shows up in the
  // Comments & Activity thread: if the user typed a comment, that text is
  // used; otherwise the comment just names the attached file. Either way
  // the comment is linked to the attachment (via attachmentId) so the UI
  // can render the file next to the comment text.
  async create(req: AuthedRequest, res: Response) {
    const { fileName, fileUrl, commentText } = req.body;
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

    const trimmedComment = typeof commentText === "string" ? commentText.trim() : "";
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: req.params.ticketId,
        userId: req.user!.id,
        commentText: trimmedComment || `${DEFAULT_ATTACHMENT_COMMENT_PREFIX}${fileName}`,
        attachmentId: attachment.id,
      },
      include: { user: true, attachment: true },
    });

    res.status(201).json({ ...attachment, comment });
  },

  // DELETE /tickets/:ticketId/attachments/:attachmentId
  // Removes an attachment's DB record and its file on local disk. Only the
  // person who uploaded it, or staff, may remove it. Any comment(s) linked
  // to this attachment are flagged as referring to a deleted attachment by
  // rewriting their commentText (no schema change) - the attachmentId link
  // itself then just clears automatically (onDelete: SetNull) once the
  // attachment row is deleted below.
  async remove(req: AuthedRequest, res: Response) {
    const attachment = await prisma.ticketAttachment.findUniqueOrThrow({
      where: { id: req.params.attachmentId },
    });
    if (attachment.ticketId !== req.params.ticketId) {
      throw new AppError("Attachment does not belong to this ticket", 400);
    }
    if (attachment.uploadedBy !== req.user!.id && !isStaff(req.user!.role)) {
      throw new AppError("You do not have permission to remove this attachment", 403);
    }

    const linkedComments = await prisma.ticketComment.findMany({
      where: { attachmentId: attachment.id },
    });
    await Promise.all(
      linkedComments.map((c: TicketComment) =>
        prisma.ticketComment.update({
          where: { id: c.id },
          data: { commentText: markCommentAttachmentDeleted(c.commentText, attachment.fileName) },
        })
      )
    );

    await prisma.ticketAttachment.delete({ where: { id: attachment.id } });

    const key = keyFromLocalFileUrl(attachment.fileUrl);
    if (key) {
      // Best-effort - the DB record is already gone either way.
      fs.unlink(resolveLocalAttachmentPath(key), () => {});
    }

    res.status(204).send();
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
