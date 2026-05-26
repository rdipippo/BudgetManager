import pool from '../config/database';

export interface PlaidAccount {
  id: number;
  plaid_item_id: number;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  currency_code: string;
  is_hidden: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePlaidAccountData {
  plaid_item_id: number;
  plaid_account_id: string;
  name: string;
  official_name?: string;
  type?: string;
  subtype?: string;
  mask?: string;
  current_balance?: number;
  available_balance?: number;
  currency_code?: string;
}

export const PlaidAccountModel = {
  async findById(id: number): Promise<PlaidAccount | null> {
    const result = await pool.query(
      'SELECT * FROM plaid_accounts WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as PlaidAccount) : null;
  },

  async findByPlaidAccountId(plaidAccountId: string): Promise<PlaidAccount | null> {
    const result = await pool.query(
      'SELECT * FROM plaid_accounts WHERE plaid_account_id = $1',
      [plaidAccountId]
    );
    return result.rows.length > 0 ? (result.rows[0] as PlaidAccount) : null;
  },

  async findByPlaidItemId(plaidItemId: number): Promise<PlaidAccount[]> {
    const result = await pool.query(
      'SELECT * FROM plaid_accounts WHERE plaid_item_id = $1 ORDER BY name',
      [plaidItemId]
    );
    return result.rows as PlaidAccount[];
  },

  async findByUserId(userId: number): Promise<PlaidAccount[]> {
    const result = await pool.query(
      `SELECT pa.* FROM plaid_accounts pa
       INNER JOIN plaid_items pi ON pa.plaid_item_id = pi.id
       WHERE pi.user_id = $1
       ORDER BY pi.institution_name, pa.name`,
      [userId]
    );
    return result.rows as PlaidAccount[];
  },

  async create(data: CreatePlaidAccountData): Promise<number> {
    const result = await pool.query(
      `INSERT INTO plaid_accounts
       (plaid_item_id, plaid_account_id, name, official_name, type, subtype, mask, current_balance, available_balance, currency_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        data.plaid_item_id,
        data.plaid_account_id,
        data.name,
        data.official_name || null,
        data.type || null,
        data.subtype || null,
        data.mask || null,
        data.current_balance ?? null,
        data.available_balance ?? null,
        data.currency_code || 'USD',
      ]
    );
    return result.rows[0].id;
  },

  async upsert(data: CreatePlaidAccountData): Promise<number> {
    // Try to find existing account
    const existing = await this.findByPlaidAccountId(data.plaid_account_id);

    if (existing) {
      // Update existing
      await pool.query(
        `UPDATE plaid_accounts SET
         name = $1, official_name = $2, type = $3, subtype = $4, mask = $5,
         current_balance = $6, available_balance = $7, currency_code = $8
         WHERE id = $9`,
        [
          data.name,
          data.official_name || null,
          data.type || null,
          data.subtype || null,
          data.mask || null,
          data.current_balance ?? null,
          data.available_balance ?? null,
          data.currency_code || 'USD',
          existing.id,
        ]
      );
      return existing.id;
    }

    // Create new
    return this.create(data);
  },

  async updateBalances(
    id: number,
    currentBalance: number | null,
    availableBalance: number | null
  ): Promise<boolean> {
    const result = await pool.query(
      'UPDATE plaid_accounts SET current_balance = $1, available_balance = $2 WHERE id = $3',
      [currentBalance, availableBalance, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async setHidden(id: number, isHidden: boolean): Promise<boolean> {
    const result = await pool.query(
      'UPDATE plaid_accounts SET is_hidden = $1 WHERE id = $2',
      [isHidden, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByPlaidItemId(plaidItemId: number): Promise<number> {
    const result = await pool.query(
      'DELETE FROM plaid_accounts WHERE plaid_item_id = $1',
      [plaidItemId]
    );
    return result.rowCount ?? 0;
  },
};
