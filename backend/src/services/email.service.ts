import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export const EmailService = {
  async sendVerificationEmail(email: string, token: string, firstName?: string): Promise<boolean> {
    const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;
    const name = firstName || 'there';

    try {
      await transporter.sendMail({
        from: config.email.from,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;">Hi ${name},</p>
              <p style="font-size: 16px;">Thanks for signing up! Please verify your email address by clicking the button below.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email</a>
              </div>
              <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 14px; color: #4F46E5; word-break: break-all;">${verificationUrl}</p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This link will expire in 24 hours.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${name},\n\nThanks for signing up! Please verify your email address by clicking this link:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
      });
      return true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  },

  async sendPasswordResetEmail(email: string, token: string, firstName?: string): Promise<boolean> {
    const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
    const name = firstName || 'there';

    try {
      await transporter.sendMail({
        from: config.email.from,
        to: email,
        subject: 'Reset Your Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;">Hi ${name},</p>
              <p style="font-size: 16px;">We received a request to reset your password. Click the button below to choose a new password.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
              </div>
              <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 14px; color: #4F46E5; word-break: break-all;">${resetUrl}</p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This link will expire in 1 hour.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${name},\n\nWe received a request to reset your password. Click this link to choose a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.`,
      });
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  },

  async sendInvitationEmail(
    inviteeEmail: string,
    token: string,
    ownerName: string,
    accessType: 'full' | 'partial' | 'advisor'
  ): Promise<boolean> {
    const acceptUrl = `${config.appUrl}/accept-invitation?token=${token}`;

    const accessDescriptions: Record<string, string> = {
      full: 'Full Access — view and manage all budgets, transactions, categories, and accounts, and invite others.',
      partial: 'Partial Access — view a selected set of accounts and create your own budgets and categories.',
      advisor: 'Financial Advisor Access — full read access and can add transactions, but cannot add or delete accounts or delete transactions.',
    };
    const accessDesc = accessDescriptions[accessType] || '';

    try {
      await transporter.sendMail({
        from: config.email.from,
        to: inviteeEmail,
        subject: `${ownerName} has invited you to join their Budget Manager account`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">You've Been Invited!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;"><strong>${ownerName}</strong> has invited you to access their Budget Manager account.</p>
              <p style="font-size: 16px;">Your access level: <strong>${accessDesc}</strong></p>
              <p style="font-size: 16px;">Click the button below to create your account and accept the invitation. You must register with this email address (${inviteeEmail}).</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Accept Invitation</a>
              </div>
              <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 14px; color: #4F46E5; word-break: break-all;">${acceptUrl}</p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This invitation link will expire in 7 days.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </body>
          </html>
        `,
        text: `${ownerName} has invited you to access their Budget Manager account.\n\nAccess level: ${accessDesc}\n\nTo accept the invitation and create your account, visit:\n${acceptUrl}\n\nThis invitation expires in 7 days.\n\nIf you did not expect this invitation, you can safely ignore this email.`,
      });
      return true;
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      return false;
    }
  },

  async verifyConnection(): Promise<boolean> {
    try {
      await transporter.verify();
      console.log('Email service connected successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  },
};
