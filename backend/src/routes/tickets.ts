import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { ticketController } from "../controllers/ticket.controller";
import { commentController } from "../controllers/comment.controller";
import { attachmentController } from "../controllers/attachment.controller";
import { asyncHandler } from "../middleware/asyncHandler";

export const ticketRouter = Router();

// ---- core ticket lifecycle ----
ticketRouter.post("/", requireAuth, ticketController.create);
ticketRouter.get("/", requireAuth, ticketController.list); // only be accessed by global admin for the particular company
ticketRouter.get("/:id", requireAuth, ticketController.getById);
ticketRouter.patch("/:id", requireAuth, ticketController.update);
// Full ticket edit (title/description/client info/department/category/project) - GLOBAL_ADMIN only.
ticketRouter.patch("/:id/edit", requireAuth, requireRole(UserRole.GLOBAL_ADMIN), ticketController.editTicket);
ticketRouter.post("/:id/resolve", requireAuth, ticketController.resolve);
ticketRouter.get("/assigned/:id",requireAuth,ticketController.getAssigned )
ticketRouter.get("/breached/:id",requireAuth,ticketController.getBreachedTickets)
ticketRouter.get("/resolved/:id",requireAuth,ticketController.resolved)
ticketRouter.get("/onhold/:id",requireAuth,ticketController.onhold)
// get all personal tickets
ticketRouter.get("/mytickets/:id",requireAuth,ticketController.myTickets)

/**
  Routes to be added in ticket route along with their controllers
  Add department specific can we only accessed by DEPT_ADMIN, MANAGER of the company
  Personal tickets 
  Ticket Assigned to the user 
*/

// ---- escalation ----
ticketRouter.post(
  "/:id/escalate",
  requireAuth,
  ticketController.escalate
);


ticketRouter.get("/:id/escalations", requireAuth, ticketController.listEscalations);


// ---- assignment ----
ticketRouter.post(
  "/:id/assign",
  requireAuth,
  ticketController.assign
);
ticketRouter.post(
  "/:id/reassign",
  requireAuth,
  ticketController.autoReassign
);


// status-history

ticketRouter.get("/:id/status-history",requireAuth,ticketController.listStatusHistory)

// ---- manual keyword overrides ----

ticketRouter.post(
  "/:id/keywords",
  requireAuth,
  requireRole(UserRole.AGENT, UserRole.HOD, UserRole.GLOBAL_ADMIN),
  ticketController.addKeyword
);
ticketRouter.delete(
  "/:id/keywords/:keywordId",
  requireAuth,
  requireRole(UserRole.AGENT,  UserRole.HOD, UserRole.GLOBAL_ADMIN),
  ticketController.removeKeyword
);

// ---- nested: comments ----
ticketRouter.post("/:ticketId/comments", requireAuth, commentController.create);
ticketRouter.get("/:ticketId/comments", requireAuth, commentController.list);

// ---- nested: attachments ----
// Step 1: client asks for a presigned S3 PUT URL, uploads the file bytes
// directly to S3 with it, then Step 2 (POST /attachments) records the
// resulting object's metadata against the ticket.
ticketRouter.post("/:ticketId/attachments/presign", requireAuth, asyncHandler(attachmentController.presign));
ticketRouter.post("/:ticketId/attachments", requireAuth, asyncHandler(attachmentController.create));
ticketRouter.get("/:ticketId/attachments", requireAuth, asyncHandler(attachmentController.list));
ticketRouter.delete("/:ticketId/attachments/:attachmentId", requireAuth, asyncHandler(attachmentController.remove));
