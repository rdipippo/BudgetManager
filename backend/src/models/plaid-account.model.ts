import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM plaid_accounts WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as PlaidAccount) : null;
  },

  async findByPlaidAccountId(plaidAccountId: string): Promise<PlaidAccount | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM plaid_accounts WHERE plaid_account_id = ?',
      [plaidAccountId]
    );
    return rows.length > 0 ? (rows[0] as PlaidAccount) : null;
  },

  async findByPlaidItemId(plaidItemId: number): Promise<PlaidAccount[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM plaid_accounts WHERE plaid_item_id = ? ORDER BY name',
      [plaidItemId]
    );
    return rows as PlaidAccount[];
  },

  async findByUserId(userId: number): Promise<PlaidAccount[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT pa.* FROM plaid_accounts pa
       INNER JOIN plaid_items pi ON pa.plaid_item_id = pi.id
       WHERE pi.user_id = ?
       ORDER BY pi.institution_name, pa.name`,
      [userId]
    );
    return rows as PlaidAccount[];
  },

  async create(data: CreatePlaidAccountData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO plaid_accounts
       (plaid_item_id, plaid_account_id, name, official_name, type, subtype, mask, current_balance, available_balance, currency_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    return result.insertId;
  },

  async upsert(data: CreatePlaidAccountData): Promise<number> {
    // Try to find existing account
    const existing = await this.findByPlaidAccountId(data.plaid_account_id);

    if (existing) {
      // Update existing
      await pool.execute(
        `UPDATE plaid_accounts SET
         name = ?, official_name = ?, type = ?, subtype = ?, mask = ?,
         current_balance = ?, available_balance = ?, currency_code = ?
         WHERE id = ?`,
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
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE plaid_accounts SET current_balance = ?, available_balance = ? WHERE id = ?',
      [currentBalance, availableBalance, id]
    );
    return result.affectedRows > 0;
  },

  async setHidden(id: number, isHidden: boolean): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE plaid_accounts SET is_hidden = ? WHERE id = ?',
      [isHidden, id]
    );
    return result.affectedRows > 0;
  },

  async deleteByPlaidItemId(plaidItemId: number): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM plaid_accounts WHERE plaid_item_id = ?',
      [plaidItemId]
    );
    return result.affectedRows;
  },
};
