import { UserRole } from "../generated/prisma/client";

// Single source of truth for "who counts as what" - used by controllers,
// middleware, and services alike. Previously duplicated inline as
// STAFF_ROLES in comment.controller.ts and requesterOnlyRoles in
// ticket.controller.ts; consolidated here so a role reclassification
// only has to happen in one place.


export const ADMIN_ROLES: UserRole[] = [UserRole.GLOBAL_ADMIN];

/** Anyone who works tickets or manages the people who do. */
export const STAFF_ROLES: UserRole[] = [
  ...ADMIN_ROLES,
  UserRole.AGENT,
];

/** Anyone whose role means "I only ever see tickets I personally filed". */
export const REQUESTER_ONLY_ROLES: UserRole[] = [
  UserRole.REQUESTER,
];

export const ASSIGNABLE_AGENT_ROLES: UserRole[] = [UserRole.AGENT];

export const isStaff = (role: UserRole) => STAFF_ROLES.includes(role);
export const isRequesterOnly = (role: UserRole) => REQUESTER_ONLY_ROLES.includes(role);
export const isAdmin = (role: UserRole) => ADMIN_ROLES.includes(role);
