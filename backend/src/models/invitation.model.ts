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

export interface AccountMembership {
  id: number;
  owner_user_id: number;
  member_user_id: number;
  access_type: 'full' | 'partial' | 'advisor';
  revoked: boolean;
  revoked_at: Date | null;
  created_at: Date;
}

export interface MembershipWithUser extends AccountMembership {
  member_email: string;
  member_first_name: string | null;
  member_last_name: string | null;
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

export const MembershipModel = {
  async create(
    ownerUserId: number,
    memberUserId: number,
    accessType: 'full' | 'partial' | 'advisor'
  ): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO account_memberships (owner_user_id, member_user_id, access_type)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE access_type = VALUES(access_type), revoked = FALSE, revoked_at = NULL`,
      [ownerUserId, memberUserId, accessType]
    );
    if (result.insertId > 0) return result.insertId;
    // On duplicate key update, fetch the existing id
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM account_memberships WHERE owner_user_id = ? AND member_user_id = ?',
      [ownerUserId, memberUserId]
    );
    return rows[0]?.id ?? 0;
  },

  async findById(id: number): Promise<AccountMembership | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM account_memberships WHERE id = ? AND revoked = FALSE',
      [id]
    );
    return rows.length > 0 ? (rows[0] as AccountMembership) : null;
  },

  async findActiveByMember(memberUserId: number): Promise<AccountMembership | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM account_memberships WHERE member_user_id = ? AND revoked = FALSE LIMIT 1',
      [memberUserId]
    );
    return rows.length > 0 ? (rows[0] as AccountMembership) : null;
  },

  async findByOwner(ownerUserId: number): Promise<MembershipWithUser[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT am.*, u.email AS member_email, u.first_name AS member_first_name, u.last_name AS member_last_name
       FROM account_memberships am
       JOIN users u ON am.member_user_id = u.id
       WHERE am.owner_user_id = ? AND am.revoked = FALSE
       ORDER BY am.created_at DESC`,
      [ownerUserId]
    );
    return rows as MembershipWithUser[];
  },

  async revoke(id: number, ownerUserId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE account_memberships SET revoked = TRUE, revoked_at = NOW()
       WHERE id = ? AND owner_user_id = ?`,
      [id, ownerUserId]
    );
    return result.affectedRows > 0;
  },

  async addAllowedAccount(membershipId: number, plaidAccountId: number): Promise<void> {
    await pool.execute(
      'INSERT IGNORE INTO membership_allowed_accounts (membership_id, plaid_account_id) VALUES (?, ?)',
      [membershipId, plaidAccountId]
    );
  },

  async getAllowedAccountIds(membershipId: number): Promise<number[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT plaid_account_id FROM membership_allowed_accounts WHERE membership_id = ?',
      [membershipId]
    );
    return rows.map((r) => r.plaid_account_id);
  },

  async existsByOwnerAndEmail(ownerUserId: number, email: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM account_memberships am
       JOIN users u ON am.member_user_id = u.id
       WHERE am.owner_user_id = ? AND u.email = ? AND am.revoked = FALSE`,
      [ownerUserId, email.toLowerCase()]
    );
    return rows.length > 0;
  },
};
