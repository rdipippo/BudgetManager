import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import {
  RefreshTokenModel,
  EmailVerificationTokenModel,
  PasswordResetTokenModel,
} from '../models';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  // Membership context (set when the user is a member of another account)
  primaryUserId?: number;       // Owner's userId (for full/advisor access data queries)
  accessType?: 'full' | 'partial' | 'advisor';
  membershipId?: number;        // Active membership ID
  partialOwnerUserId?: number;  // Owner's userId when accessType is 'partial' (for transaction queries)
}

export interface MembershipContext {
  primaryUserId?: number;
  accessType: 'full' | 'partial' | 'advisor';
  membershipId: number;
  partialOwnerUserId?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const TokenService = {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
    } as SignOptions);
  },

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  },

  async generateRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + config.tokens.refreshTokenExpiry);

    await RefreshTokenModel.create(userId, tokenHash, expiresAt);

    return token;
  },

  async verifyRefreshToken(token: string): Promise<{ userId: number; tokenId: number } | null> {
    const tokenHash = this.hashToken(token);
    const storedToken = await RefreshTokenModel.findByTokenHash(tokenHash);

    if (!storedToken) return null;
    if (storedToken.revoked) return null;
    if (new Date(storedToken.expires_at) < new Date()) return null;

    return { userId: storedToken.user_id, tokenId: storedToken.id };
  },

  async revokeRefreshToken(tokenId: number): Promise<void> {
    await RefreshTokenModel.revoke(tokenId);
  },

  async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await RefreshTokenModel.revokeAllForUser(userId);
  },

  async generateTokenPair(
    userId: number,
    email: string,
    role: string,
    membershipContext?: MembershipContext
  ): Promise<TokenPair> {
    const payload: JwtPayload = { userId, email, role };
    if (membershipContext) {
      payload.accessType = membershipContext.accessType;
      payload.membershipId = membershipContext.membershipId;
      if (membershipContext.primaryUserId) {
        payload.primaryUserId = membershipContext.primaryUserId;
      }
      if (membershipContext.partialOwnerUserId) {
        payload.partialOwnerUserId = membershipContext.partialOwnerUserId;
      }
    }
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(userId);
    return { accessToken, refreshToken };
  },

  async generateInvitationToken(): Promise<{ token: string; tokenHash: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    return { token, tokenHash };
  },

  async generateEmailVerificationToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + config.tokens.emailVerificationExpiry);

    await EmailVerificationTokenModel.create(userId, tokenHash, expiresAt);

    return token;
  },

  async verifyEmailToken(token: string): Promise<{ userId: number; tokenId: number } | null> {
    const tokenHash = this.hashToken(token);
    const storedToken = await EmailVerificationTokenModel.findByTokenHash(tokenHash);

    if (!storedToken) return null;
    if (storedToken.used) return null;
    if (new Date(storedToken.expires_at) < new Date()) return null;

    return { userId: storedToken.user_id, tokenId: storedToken.id };
  },

  async markEmailTokenAsUsed(tokenId: number): Promise<void> {
    await EmailVerificationTokenModel.markAsUsed(tokenId);
  },

  async generatePasswordResetToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + config.tokens.passwordResetExpiry);

    await PasswordResetTokenModel.create(userId, tokenHash, expiresAt);

    return token;
  },

  async verifyPasswordResetToken(token: string): Promise<{ userId: number; tokenId: number } | null> {
    const tokenHash = this.hashToken(token);
    const storedToken = await PasswordResetTokenModel.findByTokenHash(tokenHash);

    if (!storedToken) return null;
    if (storedToken.used) return null;
    if (new Date(storedToken.expires_at) < new Date()) return null;

    return { userId: storedToken.user_id, tokenId: storedToken.id };
  },

  async markPasswordResetTokenAsUsed(tokenId: number): Promise<void> {
    await PasswordResetTokenModel.markAsUsed(tokenId);
  },

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },
};
