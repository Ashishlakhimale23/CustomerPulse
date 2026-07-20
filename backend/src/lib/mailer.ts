import dotenv from "dotenv"
import { Resend } from "resend";
dotenv.config()

export const transporter = new Resend(process.env.RESEND_API_KEY)


export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

console.log(transporter)

export async function sendMail({ to, subject, html }: SendMailInput) {
  try {
    await transporter.emails.send({
      from: 'Sanghvi Movers ltd <noreply@surajweb.in>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`[mailer] failed to send "${subject}" to ${to}:`, err);
  }
}