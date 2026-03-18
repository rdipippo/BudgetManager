import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface RefreshToken extends RowDataPacket {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface VerificationToken extends RowDataPacket {
  id: number;
  user_id: number;
  token_hash: string;
  type: 'email_verification' | 'password_reset';
  expires_at: Date;
  created_at: Date;
}

export const TokenModel = {
  async createRefreshToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    const [rows] = await pool.query<RefreshToken[]>(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    );
    return rows[0] || null;
  },

  async deleteRefreshToken(tokenHash: string): Promise<void> {
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
  },

  async deleteAllUserRefreshTokens(userId: number): Promise<void> {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  },

  async createVerificationToken(
    userId: number,
    tokenHash: string,
    type: 'email_verification' | 'password_reset',
    expiresAt: Date
  ): Promise<void> {
    await pool.query(
      'INSERT INTO verification_tokens (user_id, token_hash, type, expires_at) VALUES (?, ?, ?, ?)',
      [userId, tokenHash, type, expiresAt]
    );
  },

  async findVerificationToken(
    tokenHash: string,
    type: 'email_verification' | 'password_reset'
  ): Promise<VerificationToken | null> {
    const [rows] = await pool.query<VerificationToken[]>(
      'SELECT * FROM verification_tokens WHERE token_hash = ? AND type = ? AND expires_at > NOW()',
      [tokenHash, type]
    );
    return rows[0] || null;
  },

  async deleteVerificationToken(tokenHash: string): Promise<void> {
    await pool.query('DELETE FROM verification_tokens WHERE token_hash = ?', [tokenHash]);
  },

  async cleanupExpiredTokens(): Promise<void> {
    await pool.query('DELETE FROM refresh_tokens WHERE expires_at <= NOW()');
    await pool.query('DELETE FROM verification_tokens WHERE expires_at <= NOW()');
  },
};
