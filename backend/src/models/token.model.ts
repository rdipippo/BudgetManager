import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Token {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface RefreshToken extends Token {
  revoked: boolean;
}

// Email Verification Tokens
export const EmailVerificationTokenModel = {
  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt]
    );
    return result.insertId;
  },

  async findByTokenHash(tokenHash: string): Promise<Token | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM email_verification_tokens WHERE token_hash = ?',
      [tokenHash]
    );
    return rows.length > 0 ? (rows[0] as Token) : null;
  },

  async markAsUsed(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE email_verification_tokens SET used = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  async deleteByUserId(userId: number): Promise<void> {
    await pool.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId]);
  },
};

// Password Reset Tokens
export const PasswordResetTokenModel = {
  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<number> {
    // Invalidate any existing tokens for this user first
    await pool.execute(
      'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE',
      [userId]
    );

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt]
    );
    return result.insertId;
  },

  async findByTokenHash(tokenHash: string): Promise<Token | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM password_reset_tokens WHERE token_hash = ?',
      [tokenHash]
    );
    return rows.length > 0 ? (rows[0] as Token) : null;
  },

  async markAsUsed(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },
};

// Refresh Tokens
export const RefreshTokenModel = {
  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt]
    );
    return result.insertId;
  },

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM refresh_tokens WHERE token_hash = ?',
      [tokenHash]
    );
    return rows.length > 0 ? (rows[0] as RefreshToken) : null;
  },

  async revoke(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  async revokeAllForUser(userId: number): Promise<void> {
    await pool.execute(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?',
      [userId]
    );
  },

  async deleteExpired(): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
    );
    return result.affectedRows;
  },
};
