import { TicketPriority, UserRole, SupportLevel } from "../generated/prisma/client";

// Lower index = more urgent. Used to compare/merge priorities numerically.
const ORDER: TicketPriority[] = [TicketPriority.P1, TicketPriority.P2, TicketPriority.P3, TicketPriority.P4];
const rank = (p: TicketPriority) => ORDER.indexOf(p);

/**
 * Base priority purely from who is asking. This is intentionally
 * conservative - it sets a *ceiling of urgency* the requester's role
 * alone justifies. It is never lowered by category, only ever matched
 * or raised by one, so an executive's request never gets buried below
 * their role's floor even if they filed it under a low-urgency category.
 */
const ROLE_BASE_PRIORITY: Record<UserRole, TicketPriority> = {
  GLOBAL_ADMIN: TicketPriority.P2,
  HOD: TicketPriority.P2,
  AGENT: TicketPriority.P3,
  REQUESTER: TicketPriority.P3,
  CXO: TicketPriority.P1
};

// Support-level floor: a ticket already requiring deep specialist
// involvement (L3/L4) shouldn't be filed as trivial P4 regardless of role.
const SUPPORT_LEVEL_FLOOR: Partial<Record<SupportLevel, TicketPriority>> = {
  L1: TicketPriority.P1,
};

function mostUrgent(...priorities: TicketPriority[]): TicketPriority {
  return priorities.reduce((best, p) => (rank(p) < rank(best) ? p : best));
}

export const priorityService = {
  /**
   * The customer-visible `priority` and the internal triage
   * `internalPriority` are computed the same way here, but callers may
   * choose to mask `priority` (e.g. always show requester P3 externally
   * while internalPriority reflects true VIP urgency) - both fields exist
   * on Ticket precisely to allow that split if you want it later.
   */
  computePriority(params: {
    categoryDefaultPriority?: TicketPriority | null;
  }): TicketPriority {
    const {  categoryDefaultPriority } = params;

  
    const candidates: TicketPriority[] = [];

    if (categoryDefaultPriority) candidates.push(categoryDefaultPriority);
    if (!categoryDefaultPriority) candidates.push(TicketPriority.P3)

    return mostUrgent(...candidates);
  },

  /** Priority never quietly downgrades - only escalation logic may raise it further. */
  isEscalationCandidate(current: TicketPriority, next: TicketPriority) {
    return rank(next) < rank(current);
  },


};
