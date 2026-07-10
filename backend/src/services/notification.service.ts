import { sendMail } from "../lib/mailer";
import type { Ticket, User, TicketEscalation } from "../generated/prisma/client";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function layout(title: string, bodyHtml: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <h2 style="color:#111827">${title}</h2>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="font-size:12px;color:#9ca3af">This is an automated message from the Helpdesk system.</p>
    </div>
  `;
}

export const notificationService = {
  async sendInvitation(email: string, token: string, role: string,password:string) {
    const link = `http://localhost:5173/invitations/accept?token=${token}`;
    await sendMail({
      to: email,
      subject: `You've been invited to join Sanghvi`,
      html: layout("You're invited", `
        <p>You have been invited to join <b>Sanghvi</b> as <b>${role}</b>.</p>
        <p>You're password is pre set as ${password}</p>
        <p><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Accept Invitation</a></p>
        <p>This link expires in 7 days.</p>
      `),
    });
  },

  async sendTicketCreated(ticket: Ticket, requester: User) {
    await sendMail({
      to: requester.email,
      subject: `[${ticket.ticketNumber}] Ticket received: ${ticket.title}`,
      html: layout("Ticket received", `
        <p>Hi ${requester.fullName},</p>
        <p>We've logged your ticket <b>${ticket.ticketNumber}</b> - "${ticket.title}".</p>
        <p>Priority: <b>${ticket.priority}</b></p>
        <p>We'll notify you as it progresses.</p>
      `),
    });
  },

  async sendTicketAssigned(ticket: Ticket, assignee: User) {
    await sendMail({
      to: assignee.email,
      subject: `[${ticket.ticketNumber}] New ticket assigned to you: ${ticket.title}`,
      html: layout("New assignment", `
        <p>Hi ${assignee.fullName},</p>
        <p>Ticket <b>${ticket.ticketNumber}</b> - "${ticket.title}" (Priority ${ticket.priority}) has been assigned to you.</p>
        ${ticket.slaDeadline ? `<p>SLA deadline: <b>${ticket.slaDeadline.toISOString()}</b></p>` : ""}
        <p><a href="${APP_URL}/tickets/${ticket.id}">View ticket</a></p>
      `),
    });
  },

  async sendTicketEscalated(ticket: Ticket, escalation: TicketEscalation, escalatedTo: User) {
    await sendMail({
      to: escalatedTo.email,
      subject: `[${ticket.ticketNumber}] Escalated to ${escalation.toLevel}: ${ticket.title}`,
      html: layout("Ticket escalated to you", `
        <p>Hi ${escalatedTo.fullName},</p>
        <p>Ticket <b>${ticket.ticketNumber}</b> has been escalated from ${escalation.fromLevel ?? "N/A"} to <b>${escalation.toLevel}</b>.</p>
        <p>Reason: ${escalation.reason}</p>
        <p><a href="${APP_URL}/tickets/${ticket.id}">View ticket</a></p>
      `),
    });
  },

  async sendSlaBreachWarning(ticket: Ticket, recipient: User) {
    await sendMail({
      to: recipient.email,
      subject: `⚠ SLA breach: [${ticket.ticketNumber}] ${ticket.title}`,
      html: layout("SLA breached", `
        <p>Ticket <b>${ticket.ticketNumber}</b> has breached its SLA deadline (${ticket.slaDeadline?.toISOString()}).</p>
        <p>It has been automatically escalated. Please review immediately.</p>
        <p><a href="${APP_URL}/tickets/${ticket.id}">View ticket</a></p>
      `),
    });
  },

  async sendTicketResolved(ticket: Ticket, requester: User) {
    await sendMail({
      to: requester.email,
      subject: `[${ticket.ticketNumber}] Resolved: ${ticket.title}`,
      html: layout("Your ticket was resolved", `
        <p>Hi ${requester.fullName},</p>
        <p>Ticket <b>${ticket.ticketNumber}</b> has been marked resolved. Reply if you need it reopened.</p>
      `),
    });
  },
};
