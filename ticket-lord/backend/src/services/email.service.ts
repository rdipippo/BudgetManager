import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: { user: config.email.user, pass: config.email.pass },
});

export const EmailService = {
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const url = `${config.frontendUrl}/verify-email?token=${token}`;
    await transporter.sendMail({
      from: `"Ticket Lord" <${config.email.from}>`,
      to: email,
      subject: 'Verify your Ticket Lord account',
      html: `
        <h1>Welcome to Ticket Lord, ${name}!</h1>
        <p>Please verify your email address to get started.</p>
        <a href="${url}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
      `,
    });
  },

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const url = `${config.frontendUrl}/reset-password?token=${token}`;
    await transporter.sendMail({
      from: `"Ticket Lord" <${config.email.from}>`,
      to: email,
      subject: 'Reset your Ticket Lord password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Hi ${name}, click below to reset your password. Expires in 1 hour.</p>
        <a href="${url}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
      `,
    });
  },

  async sendTicketConfirmation(data: {
    email: string;
    name: string;
    eventTitle: string;
    eventDate: string;
    venue: string;
    tickets: Array<{ ticketNumber: string; type: string; qrCode: string }>;
    orderTotal: number;
  }): Promise<void> {
    const ticketHtml = data.tickets
      .map(
        (t) => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:8px 0;">
          <strong>${t.type}</strong><br/>
          Ticket #: ${t.ticketNumber}<br/>
          <img src="${t.qrCode}" alt="QR Code" style="width:120px;height:120px;margin-top:8px;" />
        </div>
      `
      )
      .join('');

    await transporter.sendMail({
      from: `"Ticket Lord" <${config.email.from}>`,
      to: data.email,
      subject: `Your tickets for ${data.eventTitle}`,
      html: `
        <h1>Booking Confirmed!</h1>
        <h2>${data.eventTitle}</h2>
        <p><strong>Date:</strong> ${data.eventDate}</p>
        <p><strong>Venue:</strong> ${data.venue}</p>
        <p><strong>Total Paid:</strong> $${(data.orderTotal / 100).toFixed(2)}</p>
        <h3>Your Tickets:</h3>
        ${ticketHtml}
        <p>Present these QR codes at the venue entrance.</p>
      `,
    });
  },

  async sendRefundConfirmation(email: string, name: string, eventTitle: string, amount: number): Promise<void> {
    await transporter.sendMail({
      from: `"Ticket Lord" <${config.email.from}>`,
      to: email,
      subject: `Refund processed for ${eventTitle}`,
      html: `
        <h1>Refund Processed</h1>
        <p>Hi ${name}, your refund of $${(amount / 100).toFixed(2)} for <strong>${eventTitle}</strong>
        has been processed. It may take 5-10 business days to appear.</p>
      `,
    });
  },
};
