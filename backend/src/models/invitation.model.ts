import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AccountInvitation {
  id: number;
  owner_user_id: number;
  invitee_email: string;
  access_type: 'full' | 'partial' | 'advisor';
  token_hash: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface AccountInvitationWithOwner extends AccountInvitation {
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_email: string;
}

export const InvitationModel = {
  async create(
    ownerUserId: number,
    inviteeEmail: string,
    accessType: 'full' | 'partial' | 'advisor',
    tokenHash: string,
    expiresAt: Date
  ): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO account_invitations (owner_user_id, invitee_email, access_type, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [ownerUserId, inviteeEmail.toLowerCase(), accessType, tokenHash, expiresAt]
    );
    return result.insertId;
  },

  async findByTokenHash(tokenHash: string): Promise<AccountInvitationWithOwner | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ai.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.email AS owner_email
       FROM account_invitations ai
       JOIN users u ON ai.owner_user_id = u.id
       WHERE ai.token_hash = ?`,
      [tokenHash]
    );
    return rows.length > 0 ? (rows[0] as AccountInvitationWithOwner) : null;
  },

  async findById(id: number): Promise<AccountInvitation | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM account_invitations WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as AccountInvitation) : null;
  },

  async findByOwner(ownerUserId: number): Promise<AccountInvitation[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM account_invitations
       WHERE owner_user_id = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [ownerUserId]
    );
    return rows as AccountInvitation[];
  },

  async markAsUsed(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE account_invitations SET used = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  async revoke(id: number, ownerUserId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE account_invitations SET used = TRUE WHERE id = ? AND owner_user_id = ?',
      [id, ownerUserId]
    );
    return result.affectedRows > 0;
  },

  async addAllowedAccount(invitationId: number, plaidAccountId: number): Promise<void> {
    await pool.execute(
      'INSERT IGNORE INTO invitation_allowed_accounts (invitation_id, plaid_account_id) VALUES (?, ?)',
      [invitationId, plaidAccountId]
    );
  },

  async getAllowedAccounts(invitationId: number): Promise<number[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT plaid_account_id FROM invitation_allowed_accounts WHERE invitation_id = ?',
      [invitationId]
    );
    return rows.map((r) => r.plaid_account_id);
  },
};
