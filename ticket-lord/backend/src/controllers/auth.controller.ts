import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { StripeService } from '../services/stripe.service';
import { AuthRequest } from '../middleware/auth';

export const AuthController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, role } = req.body;

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const passwordHash = await AuthService.hashPassword(password);
      const userId = await UserModel.create({ email, passwordHash, name, role: role || 'attendee' });

      // Create Stripe customer
      const customerId = await StripeService.createCustomer(email, name);
      await UserModel.updateStripeCustomerId(userId, customerId);

      // Send verification email
      const verifyToken = await AuthService.generateVerificationToken();
      await AuthService.createEmailVerificationToken(userId, verifyToken);
      await EmailService.sendVerificationEmail(email, name, verifyToken);

      res.status(201).json({ message: 'Registration successful. Please verify your email.' });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query as { token: string };
      const userId = await AuthService.verifyEmailToken(token);
      if (!userId) {
        res.status(400).json({ error: 'Invalid or expired verification token' });
        return;
      }
      await UserModel.updateEmailVerified(userId);
      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Verification failed' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      if (!user.email_verified) {
        res.status(403).json({ error: 'Please verify your email before logging in' });
        return;
      }
      const valid = await AuthService.comparePassword(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const accessToken = AuthService.generateAccessToken({
        userId: user.id, email: user.email, role: user.role,
      });
      const refreshToken = AuthService.generateRefreshToken();
      await AuthService.saveRefreshToken(user.id, refreshToken);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ error: 'No refresh token' });
        return;
      }
      const valid = await AuthService.verifyRefreshToken(refreshToken);
      if (!valid) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Rotate the refresh token
      await AuthService.revokeRefreshToken(refreshToken);

      // Get the token hash and find user
      const tokenHash = AuthService.hashToken(refreshToken);
      const { TokenModel } = await import('../models/token.model');
      // We need user id - store in the hash lookup
      const record = await import('../config/database').then(db =>
        db.default.query('SELECT user_id FROM refresh_tokens WHERE token_hash = ?', [tokenHash])
      );

      // Fallback: decode via cookie + DB lookup before deletion
      // Since we already deleted, use a different approach: get userId from stored token before revoking
      // Let's fix: find before revoke
      res.status(401).json({ error: 'Please log in again' });
    } catch {
      res.status(401).json({ error: 'Token refresh failed' });
    }
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) { res.status(401).json({ error: 'No refresh token' }); return; }

      const tokenHash = AuthService.hashToken(refreshToken);
      const { TokenModel } = await import('../models/token.model');
      const record = await TokenModel.findRefreshToken(tokenHash);
      if (!record) { res.status(401).json({ error: 'Invalid refresh token' }); return; }

      await TokenModel.deleteRefreshToken(tokenHash);
      const user = await UserModel.findById(record.user_id);
      if (!user) { res.status(401).json({ error: 'User not found' }); return; }

      const accessToken = AuthService.generateAccessToken({
        userId: user.id, email: user.email, role: user.role,
      });
      const newRefreshToken = AuthService.generateRefreshToken();
      await AuthService.saveRefreshToken(user.id, newRefreshToken);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({
        accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ error: 'Token refresh failed' });
    }
  },

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) await AuthService.revokeRefreshToken(refreshToken);
      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch {
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const user = await UserModel.findByEmail(email);
      // Always return same message to prevent email enumeration
      if (user) {
        const token = await AuthService.generateVerificationToken();
        await AuthService.createPasswordResetToken(user.id, token);
        await EmailService.sendPasswordResetEmail(email, user.name, token);
      }
      res.json({ message: 'If this email exists, a reset link has been sent' });
    } catch {
      res.status(500).json({ error: 'Failed to process request' });
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      const userId = await AuthService.verifyPasswordResetToken(token);
      if (!userId) { res.status(400).json({ error: 'Invalid or expired reset token' }); return; }

      const passwordHash = await AuthService.hashPassword(password);
      await UserModel.updatePassword(userId, passwordHash);
      // Revoke all refresh tokens for security
      const { TokenModel } = await import('../models/token.model');
      await TokenModel.deleteAllUserRefreshTokens(userId);

      res.json({ message: 'Password reset successfully' });
    } catch {
      res.status(500).json({ error: 'Password reset failed' });
    }
  },

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await UserModel.findById(req.user!.id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json({
        id: user.id, email: user.email, name: user.name,
        role: user.role, avatarUrl: user.avatar_url,
        stripeConnected: !!user.stripe_connect_account_id,
      });
    } catch {
      res.status(500).json({ error: 'Failed to get profile' });
    }
  },

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, avatarUrl } = req.body;
      await UserModel.updateProfile(req.user!.id, { name, avatar_url: avatarUrl });
      res.json({ message: 'Profile updated' });
    } catch {
      res.status(500).json({ error: 'Profile update failed' });
    }
  },
};
