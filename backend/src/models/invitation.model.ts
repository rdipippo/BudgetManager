import pool from '../config/database';

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
    const result = await pool.query(
      `INSERT INTO account_invitations (owner_user_id, invitee_email, access_type, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [ownerUserId, inviteeEmail.toLowerCase(), accessType, tokenHash, expiresAt]
    );
    return result.rows[0].id;
  },

  async findByTokenHash(tokenHash: string): Promise<AccountInvitationWithOwner | null> {
    const result = await pool.query(
      `SELECT ai.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.email AS owner_email
       FROM account_invitations ai
       JOIN users u ON ai.owner_user_id = u.id
       WHERE ai.token_hash = $1`,
      [tokenHash]
    );
    return result.rows.length > 0 ? (result.rows[0] as AccountInvitationWithOwner) : null;
  },

  async findById(id: number): Promise<AccountInvitation | null> {
    const result = await pool.query(
      'SELECT * FROM account_invitations WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as AccountInvitation) : null;
  },

  async findByOwner(ownerUserId: number): Promise<AccountInvitation[]> {
    const result = await pool.query(
      `SELECT * FROM account_invitations
       WHERE owner_user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [ownerUserId]
    );
    return result.rows as AccountInvitation[];
  },

  async markAsUsed(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE account_invitations SET used = TRUE WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async revoke(id: number, ownerUserId: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE account_invitations SET used = TRUE WHERE id = $1 AND owner_user_id = $2',
      [id, ownerUserId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async addAllowedAccount(invitationId: number, plaidAccountId: number): Promise<void> {
    await pool.query(
      'INSERT INTO invitation_allowed_accounts (invitation_id, plaid_account_id, active) VALUES ($1, $2, FALSE) ON CONFLICT DO NOTHING',
      [invitationId, plaidAccountId]
    );
  },

  // Called when invitation is accepted — marks all rows active so middleware can load them
  async activateAllowedAccounts(invitationId: number): Promise<void> {
    await pool.query(
      'UPDATE invitation_allowed_accounts SET active = TRUE WHERE invitation_id = $1',
      [invitationId]
    );
  },

  // Returns allowed plaid_account_ids for an active partial-access member
  async getActiveAllowedAccountsForUser(email: string, ownerUserId: number): Promise<number[]> {
    const result = await pool.query(
      `SELECT iaa.plaid_account_id
       FROM invitation_allowed_accounts iaa
       JOIN account_invitations ai ON ai.id = iaa.invitation_id
       WHERE ai.invitee_email = $1 AND ai.owner_user_id = $2 AND iaa.active = TRUE`,
      [email.toLowerCase(), ownerUserId]
    );
    return result.rows.map((r) => r.plaid_account_id);
  },
};
