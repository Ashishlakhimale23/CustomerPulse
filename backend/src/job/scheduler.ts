import cron from "node-cron";
import { escalationService } from "../services/escalation.service";
import { invitationService } from "../services/invitation.service";

export function startScheduledJobs() {
  // Every 5 minutes: escalate anything past its SLA deadline.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const results = await escalationService.runSlaSweep();
      if (results.length) console.log(`[sla-sweep] auto-escalated ${results.length} ticket(s)`);
    } catch (err) {
      console.error("[sla-sweep] failed:", err);
    }
  });

  // Hourly: sweep invitations past their expiry into EXPIRED status.
  cron.schedule("0 * * * *", async () => {
    try {
      const count = await invitationService.expireStaleInvitations();
      if (count) console.log(`[invitations] expired ${count} stale invitation(s)`);
    } catch (err) {
      console.error("[invitation-expiry] failed:", err);
    }
  });

  console.log("Scheduled jobs started: SLA sweep (5m), invitation expiry (1h)");
}