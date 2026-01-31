import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Transaction {
  id: number;
  user_id: number;
  plaid_account_id: number | null;
  plaid_transaction_id: string | null;
  category_id: number | null;
  amount: number;
  date: Date;
  merchant_name: string | null;
  description: string | null;
  plaid_category: string | null;
  pending: boolean;
  is_manual: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
}

export interface CreateTransactionData {
  user_id: number;
  plaid_account_id?: number;
  plaid_transaction_id?: string;
  category_id?: number;
  amount: number;
  date: Date | string;
  merchant_name?: string;
  description?: string;
  plaid_category?: string;
  pending?: boolean;
  is_manual?: boolean;
  notes?: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number | null;
  accountId?: number;
  search?: string;
  pending?: boolean;
  uncategorized?: boolean;
  limit?: number;
  offset?: number;
}

export const TransactionModel = {
  async findById(id: number): Promise<Transaction | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as Transaction) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<Transaction | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as Transaction) : null;
  },

  async findByPlaidTransactionId(plaidTransactionId: string): Promise<Transaction | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM transactions WHERE plaid_transaction_id = ?',
      [plaidTransactionId]
    );
    return rows.length > 0 ? (rows[0] as Transaction) : null;
  },

  async findByUserId(
    userId: number,
    filters: TransactionFilters = {}
  ): Promise<TransactionWithCategory[]> {
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params: (string | number | boolean)[] = [userId];

    if (filters.startDate) {
      query += ' AND t.date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND t.date <= ?';
      params.push(filters.endDate);
    }
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === null) {
        query += ' AND t.category_id IS NULL';
      } else {
        query += ' AND t.category_id = ?';
        params.push(filters.categoryId);
      }
    }
    if (filters.uncategorized) {
      query += ' AND t.category_id IS NULL';
    }
    if (filters.accountId) {
      query += ' AND t.plaid_account_id = ?';
      params.push(filters.accountId);
    }
    if (filters.search) {
      query += ' AND (t.merchant_name LIKE ? OR t.description LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }
    if (filters.pending !== undefined) {
      query += ' AND t.pending = ?';
      params.push(filters.pending);
    }

    query += ' ORDER BY t.date DESC, t.id DESC';

    if (filters.limit) {
      query += ` LIMIT ${Math.floor(filters.limit)}`;
      if (filters.offset) {
        query += ` OFFSET ${Math.floor(filters.offset)}`;
      }
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows as TransactionWithCategory[];
  },

  async countByUserId(userId: number, filters: TransactionFilters = {}): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?';
    const params: (string | number | boolean)[] = [userId];

    if (filters.startDate) {
      query += ' AND date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND date <= ?';
      params.push(filters.endDate);
    }
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === null) {
        query += ' AND category_id IS NULL';
      } else {
        query += ' AND category_id = ?';
        params.push(filters.categoryId);
      }
    }
    if (filters.uncategorized) {
      query += ' AND category_id IS NULL';
    }
    if (filters.accountId) {
      query += ' AND plaid_account_id = ?';
      params.push(filters.accountId);
    }
    if (filters.search) {
      query += ' AND (merchant_name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return (rows[0] as { count: number }).count;
  },

  async create(data: CreateTransactionData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO transactions
       (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, plaid_category, pending, is_manual, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.plaid_account_id || null,
        data.plaid_transaction_id || null,
        data.category_id || null,
        data.amount,
        data.date,
        data.merchant_name || null,
        data.description || null,
        data.plaid_category || null,
        data.pending || false,
        data.is_manual || false,
        data.notes || null,
      ]
    );
    return result.insertId;
  },

  async upsertFromPlaid(data: CreateTransactionData): Promise<number> {
    if (!data.plaid_transaction_id) {
      throw new Error('plaid_transaction_id is required for upsert');
    }

    const existing = await this.findByPlaidTransactionId(data.plaid_transaction_id);

    if (existing) {
      // Update existing - preserve user's category if they've set one
      await pool.execute(
        `UPDATE transactions SET
         amount = ?, date = ?, merchant_name = ?, description = ?,
         plaid_category = ?, pending = ?
         WHERE id = ?`,
        [
          data.amount,
          data.date,
          data.merchant_name || null,
          data.description || null,
          data.plaid_category || null,
          data.pending || false,
          existing.id,
        ]
      );
      return existing.id;
    }

    return this.create(data);
  },

  async updateCategory(id: number, userId: number, categoryId: number | null): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE transactions SET category_id = ? WHERE id = ? AND user_id = ?',
      [categoryId, id, userId]
    );
    return result.affectedRows > 0;
  },

  async update(
    id: number,
    userId: number,
    data: Partial<CreateTransactionData>
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];

    if (data.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(data.category_id || null);
    }
    if (data.amount !== undefined) {
      fields.push('amount = ?');
      values.push(data.amount);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.merchant_name !== undefined) {
      fields.push('merchant_name = ?');
      values.push(data.merchant_name || null);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description || null);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes || null);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM transactions WHERE id = ? AND user_id = ? AND is_manual = TRUE',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async deleteByPlaidTransactionId(plaidTransactionId: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM transactions WHERE plaid_transaction_id = ?',
      [plaidTransactionId]
    );
    return result.affectedRows > 0;
  },

  async updateMultiple(
    userId: number,
    transactionIds: number[],
    updates: { category_id?: number | null; notes?: string | null; date?: string }
  ): Promise<number> {
    if (transactionIds.length === 0) return 0;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
    }

    if (fields.length === 0) return 0;

    const placeholders = transactionIds.map(() => '?').join(', ');
    values.push(userId, ...transactionIds);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE transactions SET ${fields.join(', ')} WHERE user_id = ? AND id IN (${placeholders})`,
      values
    );
    return result.affectedRows;
  },

  async getSpentByCategory(
    userId: number,
    categoryId: number,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM transactions
       WHERE user_id = ? AND category_id = ? AND date >= ? AND date <= ? AND amount < 0`,
      [userId, categoryId, startDate, endDate]
    );
    return parseFloat((rows[0] as { total: string }).total) || 0;
  },

  async getSpentByCategoryForPeriod(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<{ category_id: number; total: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT category_id, COALESCE(SUM(ABS(amount)), 0) as total
       FROM transactions
       WHERE user_id = ? AND date >= ? AND date <= ? AND amount < 0 AND category_id IS NOT NULL
       GROUP BY category_id`,
      [userId, startDate, endDate]
    );
    return rows.map((row: RowDataPacket) => ({
      category_id: row.category_id,
      total: parseFloat(row.total) || 0,
    }));
  },

  async getIncomeByCategoryForPeriod(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<{ category_id: number; total: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT category_id, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = ? AND date >= ? AND date <= ? AND amount > 0 AND category_id IS NOT NULL
       GROUP BY category_id`,
      [userId, startDate, endDate]
    );
    return rows.map((row: RowDataPacket) => ({
      category_id: row.category_id,
      total: parseFloat(row.total) || 0,
    }));
  },
};
