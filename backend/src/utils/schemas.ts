import { z } from "zod";
import { UserRole, SupportLevel, TicketStatus, TicketPriority } from "../generated/prisma/client";

// Kept close to the controllers that use them rather than one giant
// file per resource - easier to see the shape a given endpoint expects
// without cross-referencing multiple files.

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  departmentId: z.string().uuid().optional(),
  supportLevel: z.nativeEnum(SupportLevel).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32),
  fullName: z.string().min(1).max(200),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createTicketSchema = z.object({
  departmentId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(10_000).optional(),
  tags: z.array(z.string()).optional(),
  // Client-issue intake form fields (see prisma/schema.prisma Ticket
  // model comments for why representative/employeeId are optional).
  representative: z.string().max(200).optional(),
  employeeId: z.string().max(50).optional(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email(),
  dateOfOccurance: z.coerce.date(),
  site: z.string().min(1).max(200),
  state: z.string().min(1).max(100),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10_000).optional(),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

// Admin-only priority override - separate from updateTicketSchema since
// only GLOBAL_ADMIN/DEPT_ADMIN can touch this, everyone else's PATCH
// /tickets/:id never includes it.
export const updateTicketPrioritySchema = z.object({
  priority: z.nativeEnum(TicketPriority),
});

export const escalateTicketSchema = z.object({
  reason: z.string().min(1).max(2000),
  toLevel: z.nativeEnum(SupportLevel).optional(),
});

export const assignTicketSchema = z.object({
  agentId: z.string().uuid(),
});

export const createKeywordSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  synonyms: z.array(z.string()).optional(),
});

export const promoteSuggestionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  synonyms: z.array(z.string()).optional(),
  grantToUserIds: z.array(z.string().uuid()).optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  role: z.nativeEnum(UserRole).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  supportLevel: z.nativeEnum(SupportLevel).nullable().optional(),
  isActive: z.boolean().optional(),
  isAvailableForAssignment: z.boolean().optional(),
  maxActiveTickets: z.number().int().min(1).max(200).optional(),
});

export const createTicketCategorySchema = z.object({
  name: z.string().min(1).max(150),
  defaultSlaHours: z.number().int().positive().optional(),
  defaultPriority: z.nativeEnum(TicketPriority).optional(),
  minSupportLevel: z.nativeEnum(SupportLevel).optional(),
});

export const createCommentSchema = z.object({
  commentText: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

// Client is a flat lookup list - just a name.
export const clientSchema = z.object({
  name: z.string().min(1).max(200),
});

// Lets an agent be linked to (or unlinked from) a category for
// category-first auto-assignment.
export const categoryAgentSchema = z.object({
  userId: z.string().uuid(),
  proficiency: z.number().int().min(1).max(10).optional(),
});

// POST /audit-logs - lets the frontend explicitly report an action it
// took (e.g. "opened ticket detail", "downloaded attachment") that
// wouldn't otherwise generate a server-side AuditLog row on its own.
// Most audit rows are still written server-side as a side effect of the
// action itself (status changes, priority overrides, invitations) -
// this is specifically for frontend-only events with no matching mutation.
export const createAuditLogSchema = z.object({
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityId: z.string().optional(),
});
