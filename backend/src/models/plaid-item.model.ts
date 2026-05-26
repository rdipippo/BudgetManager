import pool from '../config/database';

export interface PlaidItem {
  id: number;
  user_id: number;
  plaid_item_id: string;
  access_token_encrypted: string;
  institution_id: string | null;
  institution_name: string | null;
  status: 'active' | 'error' | 'pending_expiration';
  consent_expiration_time: Date | null;
  last_sync_at: Date | null;
  cursor: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePlaidItemData {
  user_id: number;
  plaid_item_id: string;
  access_token_encrypted: string;
  institution_id?: string;
  institution_name?: string;
}

export const PlaidItemModel = {
  async findById(id: number): Promise<PlaidItem | null> {
    const result = await pool.query(
      'SELECT * FROM plaid_items WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as PlaidItem) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<PlaidItem | null> {
    const result = await pool.query(
      'SELECT * FROM plaid_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows.length > 0 ? (result.rows[0] as PlaidItem) : null;
  },

  async findByPlaidItemId(plaidItemId: string): Promise<PlaidItem | null> {
    const result = await pool.query(
      'SELECT * FROM plaid_items WHERE plaid_item_id = $1',
      [plaidItemId]
    );
    return result.rows.length > 0 ? (result.rows[0] as PlaidItem) : null;
  },

  async findByUserId(userId: number): Promise<PlaidItem[]> {
    const result = await pool.query(
      'SELECT * FROM plaid_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows as PlaidItem[];
  },

  async create(data: CreatePlaidItemData): Promise<number> {
    const result = await pool.query(
      `INSERT INTO plaid_items (user_id, plaid_item_id, access_token_encrypted, institution_id, institution_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        data.user_id,
        data.plaid_item_id,
        data.access_token_encrypted,
        data.institution_id || null,
        data.institution_name || null,
      ]
    );
    return result.rows[0].id;
  },

  async updateCursor(id: number, cursor: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE plaid_items SET "cursor" = $1, last_sync_at = NOW() WHERE id = $2',
      [cursor, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async updateStatus(
    id: number,
    status: 'active' | 'error' | 'pending_expiration',
    errorCode?: string,
    errorMessage?: string
  ): Promise<boolean> {
    const result = await pool.query(
      'UPDATE plaid_items SET status = $1, error_code = $2, error_message = $3 WHERE id = $4',
      [status, errorCode || null, errorMessage || null, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async updateStatusByPlaidItemId(
    plaidItemId: string,
    status: 'active' | 'error' | 'pending_expiration',
    errorCode?: string,
    errorMessage?: string
  ): Promise<boolean> {
    const result = await pool.query(
      'UPDATE plaid_items SET status = $1, error_code = $2, error_message = $3 WHERE plaid_item_id = $4',
      [status, errorCode || null, errorMessage || null, plaidItemId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM plaid_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
