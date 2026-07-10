import { Router } from "express";
import { UserRole } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { ticketController } from "../controllers/ticket.controller";
import { commentController } from "../controllers/comment.controller";
import { attachmentController } from "../controllers/attachment.controller";

export const ticketRouter = Router();

// ---- core ticket lifecycle ----
ticketRouter.post("/", requireAuth, ticketController.create);
ticketRouter.get("/", requireAuth, ticketController.list); // only be accessed by global admin for the particular company
ticketRouter.get("/:id", requireAuth, ticketController.getById);
ticketRouter.patch("/:id", requireAuth, ticketController.update);
ticketRouter.post("/:id/resolve", requireAuth, ticketController.resolve);
ticketRouter.get("/assigned/:id",requireAuth,ticketController.getAssigned )
ticketRouter.get("/breached/:id",requireAuth,ticketController.getBreachedTickets)
ticketRouter.get("/unassigned/:id",requireAuth,ticketController.getUnassignedDepartmentTickets)

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
  requireRole(UserRole.AGENT, UserRole.DEPT_MANAGER, UserRole.GLOBAL_ADMIN),
  ticketController.escalate
);


ticketRouter.get("/:id/escalations", requireAuth, ticketController.listEscalations);


// ---- assignment ----
ticketRouter.post(
  "/:id/assign",
  requireAuth,
  requireRole(  UserRole.DEPT_MANAGER, UserRole.GLOBAL_ADMIN), ticketController.assign
);
ticketRouter.post(
  "/:id/reassign",
  requireAuth,
  requireRole(UserRole.DEPT_MANAGER, UserRole.GLOBAL_ADMIN),
  ticketController.autoReassign
);


// status-history

ticketRouter.get("/:id/status-history",requireAuth,requireRole(UserRole.GLOBAL_ADMIN),ticketController.listStatusHistory)

// ---- manual keyword overrides ----

ticketRouter.post(
  "/:id/keywords",
  requireAuth,
  requireRole(UserRole.AGENT, UserRole.DEPT_MANAGER, UserRole.GLOBAL_ADMIN),
  ticketController.addKeyword
);
ticketRouter.delete(
  "/:id/keywords/:keywordId",
  requireAuth,
  requireRole(UserRole.AGENT,  UserRole.DEPT_MANAGER, UserRole.GLOBAL_ADMIN),
  ticketController.removeKeyword
);

// ---- nested: comments ----
ticketRouter.post("/:ticketId/comments", requireAuth, commentController.create);
ticketRouter.get("/:ticketId/comments", requireAuth, commentController.list);

// ---- nested: attachments ----
ticketRouter.post("/:ticketId/attachments", requireAuth, attachmentController.create);
ticketRouter.get("/:ticketId/attachments", requireAuth, attachmentController.list);
