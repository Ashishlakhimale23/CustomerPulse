import { TicketStatus } from "../generated/prisma/client";
import { addMinutes, diffInMinutes, diffInSeconds } from "../utils/time";

// The SLA clock is "paused" whenever the ticket isn't actively being
// worked - ON_HOLD, or RESOLVED (which may still get reopened). While
// paused the deadline is cleared (so the SLA sweep cron leaves it alone)
// and whatever time was left gets banked in slaRemainingMinutes. Coming
// back to an active status (off hold, or REOPENED) resumes the deadline
// from that banked remainder instead of granting a fresh window.
const SLA_PAUSED_STATUSES: TicketStatus[] = [TicketStatus.ON_HOLD, TicketStatus.RESOLVED];

export type TicketClockFields = {
  status: TicketStatus;
  createdAt: Date;
  slaDeadline: Date | null;
  slaRemainingMinutes: number | null;
  holdStartedAt: Date | null;
  totalHoldMinutes: number;
};

export type SlaClockUpdate = {
  slaDeadline?: Date | null;
  slaRemainingMinutes?: number | null;
  holdStartedAt?: Date | null;
  totalHoldMinutes?: number;
};

/**
 * Given a ticket's current clock state and the status it's moving to,
 * returns the fields that need updating on the Ticket row. Handles two
 * independent things that both key off ON_HOLD/RESOLVED transitions:
 *   - the SLA deadline pause/resume (paused by ON_HOLD *or* RESOLVED)
 *   - the ON_HOLD wall-clock accumulator (only ON_HOLD, used by TAT)
 */
export function computeSlaClockUpdate(
  previous: Pick<TicketClockFields, "status" | "slaDeadline" | "slaRemainingMinutes" | "holdStartedAt" | "totalHoldMinutes">,
  nextStatus: TicketStatus,
  now: Date = new Date()
): SlaClockUpdate {
  const data: SlaClockUpdate = {};

  // Close out / open the ON_HOLD window itself - independent of the SLA
  // pause below, since TAT only cares about ON_HOLD time, not RESOLVED time.
  if (previous.status === TicketStatus.ON_HOLD && nextStatus !== TicketStatus.ON_HOLD) {
    const holdMinutes = previous.holdStartedAt ? diffInMinutes(previous.holdStartedAt, now) : 0;
    data.totalHoldMinutes = previous.totalHoldMinutes + holdMinutes;
    data.holdStartedAt = null;
  } else if (nextStatus === TicketStatus.ON_HOLD && previous.status !== TicketStatus.ON_HOLD) {
    data.holdStartedAt = now;
  }

  const wasPaused = SLA_PAUSED_STATUSES.includes(previous.status);
  const willBePaused = SLA_PAUSED_STATUSES.includes(nextStatus);

  if (!wasPaused && willBePaused) {
    // Entering ON_HOLD or RESOLVED: bank whatever SLA time is left (0 if
    // it had already breached) and stop the deadline from being checked.
    data.slaRemainingMinutes = previous.slaDeadline ? diffInMinutes(now, previous.slaDeadline) : null;
    data.slaDeadline = null;
  } else if (wasPaused && !willBePaused) {
    // Leaving ON_HOLD, or reopening a RESOLVED ticket: resume from the
    // banked remainder rather than starting a new SLA window.
    data.slaDeadline = previous.slaRemainingMinutes != null ? addMinutes(now, previous.slaRemainingMinutes) : previous.slaDeadline;
    data.slaRemainingMinutes = null;
  }

  return data;
}

/**
 * TAT (turnOverTime): wall-clock age of the ticket minus time spent
 * ON_HOLD. Unlike the SLA clock, a RESOLVED period is NOT subtracted - if
 * the ticket gets reopened, the time it sat resolved still counts toward
 * turnaround time.
 */
export function computeTurnOverTimeSeconds(ticket: Pick<TicketClockFields, "status" | "createdAt" | "holdStartedAt" | "totalHoldMinutes">, now: Date = new Date()) {
  const ongoingHoldMinutes = ticket.status === TicketStatus.ON_HOLD && ticket.holdStartedAt ? diffInMinutes(ticket.holdStartedAt, now) : 0;
  const totalHoldSeconds = (ticket.totalHoldMinutes + ongoingHoldMinutes) * 60;
  return Math.max(0, diffInSeconds(ticket.createdAt, now) - totalHoldSeconds);
}
