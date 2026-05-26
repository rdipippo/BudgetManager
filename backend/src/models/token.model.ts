import pool from '../config/database';

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
    const result = await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    return result.rows[0].id;
  },

  async findByTokenHash(tokenHash: string): Promise<Token | null> {
    const result = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    return result.rows.length > 0 ? (result.rows[0] as Token) : null;
  },

  async markAsUsed(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE email_verification_tokens SET used = TRUE WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByUserId(userId: number): Promise<void> {
    await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
  },
};

// Password Reset Tokens
export const PasswordResetTokenModel = {
  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<number> {
    // Invalidate any existing tokens for this user first
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [userId]
    );

    const result = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    return result.rows[0].id;
  },

  async findByTokenHash(tokenHash: string): Promise<Token | null> {
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    return result.rows.length > 0 ? (result.rows[0] as Token) : null;
  },

  async markAsUsed(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

// Refresh Tokens
export const RefreshTokenModel = {
  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<number> {
    const result = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    return result.rows[0].id;
  },

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    return result.rows.length > 0 ? (result.rows[0] as RefreshToken) : null;
  },

  async revoke(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async revokeAllForUser(userId: number): Promise<void> {
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
      [userId]
    );
  },

  async deleteExpired(): Promise<number> {
    const result = await pool.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
    );
    return result.rowCount ?? 0;
  },
};
