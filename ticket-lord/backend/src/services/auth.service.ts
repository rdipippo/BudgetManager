import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { TokenModel } from '../models/token.model';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export const AuthService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
  },

  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  },

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  async saveRefreshToken(userId: number, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await TokenModel.createRefreshToken(userId, tokenHash, expiresAt);
  },

  async verifyRefreshToken(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const record = await TokenModel.findRefreshToken(tokenHash);
    return !!record;
  },

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await TokenModel.deleteRefreshToken(tokenHash);
  },

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  },

  async generateVerificationToken(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  },

  async createEmailVerificationToken(userId: number, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await TokenModel.createVerificationToken(userId, tokenHash, 'email_verification', expiresAt);
  },

  async verifyEmailToken(token: string): Promise<number | null> {
    const tokenHash = this.hashToken(token);
    const record = await TokenModel.findVerificationToken(tokenHash, 'email_verification');
    if (!record) return null;
    await TokenModel.deleteVerificationToken(tokenHash);
    return record.user_id;
  },

  async createPasswordResetToken(userId: number, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await TokenModel.createVerificationToken(userId, tokenHash, 'password_reset', expiresAt);
  },

  async verifyPasswordResetToken(token: string): Promise<number | null> {
    const tokenHash = this.hashToken(token);
    const record = await TokenModel.findVerificationToken(tokenHash, 'password_reset');
    if (!record) return null;
    await TokenModel.deleteVerificationToken(tokenHash);
    return record.user_id;
  },
};
