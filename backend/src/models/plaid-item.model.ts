import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM plaid_items WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as PlaidItem) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<PlaidItem | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM plaid_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as PlaidItem) : null;
  },

  async findByPlaidItemId(plaidItemId: string): Promise<PlaidItem | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM plaid_items WHERE plaid_item_id = ?',
      [plaidItemId]
    );
    return rows.length > 0 ? (rows[0] as PlaidItem) : null;
  },

  async findByUserId(userId: number): Promise<PlaidItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM plaid_items WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows as PlaidItem[];
  },

  async create(data: CreatePlaidItemData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO plaid_items (user_id, plaid_item_id, access_token_encrypted, institution_id, institution_name)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.plaid_item_id,
        data.access_token_encrypted,
        data.institution_id || null,
        data.institution_name || null,
      ]
    );
    return result.insertId;
  },

  async updateCursor(id: number, cursor: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE plaid_items SET cursor = ?, last_sync_at = NOW() WHERE id = ?',
      [cursor, id]
    );
    return result.affectedRows > 0;
  },

  async updateStatus(
    id: number,
    status: 'active' | 'error' | 'pending_expiration',
    errorCode?: string,
    errorMessage?: string
  ): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE plaid_items SET status = ?, error_code = ?, error_message = ? WHERE id = ?',
      [status, errorCode || null, errorMessage || null, id]
    );
    return result.affectedRows > 0;
  },

  async updateStatusByPlaidItemId(
    plaidItemId: string,
    status: 'active' | 'error' | 'pending_expiration',
    errorCode?: string,
    errorMessage?: string
  ): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE plaid_items SET status = ?, error_code = ?, error_message = ? WHERE plaid_item_id = ?',
      [status, errorCode || null, errorMessage || null, plaidItemId]
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM plaid_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },
};
