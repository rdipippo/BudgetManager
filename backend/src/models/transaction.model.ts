import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { SafeQueryBuilder, buildSetClause } from '../utils';

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
  plaid_category?: string | null;
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
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
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
    const sortFieldMap: Record<string, string> = {
      name: 't.merchant_name',
      date: 't.date',
      category: 'c.name',
      amount: 't.amount',
    };

    const qb = new SafeQueryBuilder(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `).addParam(userId);

    if (filters.startDate) {
      qb.where('t.date >= ?', filters.startDate);
    }
    if (filters.endDate) {
      qb.where('t.date <= ?', filters.endDate);
    }
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === null) {
        qb.whereRaw('t.category_id IS NULL');
      } else {
        qb.where('t.category_id = ?', filters.categoryId);
      }
    }
    if (filters.uncategorized) {
      qb.whereRaw('t.category_id IS NULL');
    }
    if (filters.accountId) {
      qb.where('t.plaid_account_id = ?', filters.accountId);
    }
    if (filters.search) {
      qb.whereLikeAny(['t.merchant_name', 't.description'], filters.search);
    }
    if (filters.pending !== undefined) {
      qb.where('t.pending = ?', filters.pending);
    }

    qb.orderBy(filters.sortField, sortFieldMap, filters.sortDirection, 't.date')
      .thenBy('t.id', 'desc')
      .limit(filters.limit)
      .offset(filters.offset);

    const { query, params } = qb.build();
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows as TransactionWithCategory[];
  },

  async countByUserId(userId: number, filters: TransactionFilters = {}): Promise<number> {
    const qb = new SafeQueryBuilder('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?')
      .addParam(userId);

    if (filters.startDate) {
      qb.where('date >= ?', filters.startDate);
    }
    if (filters.endDate) {
      qb.where('date <= ?', filters.endDate);
    }
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === null) {
        qb.whereRaw('category_id IS NULL');
      } else {
        qb.where('category_id = ?', filters.categoryId);
      }
    }
    if (filters.uncategorized) {
      qb.whereRaw('category_id IS NULL');
    }
    if (filters.accountId) {
      qb.where('plaid_account_id = ?', filters.accountId);
    }
    if (filters.search) {
      qb.whereLikeAny(['merchant_name', 'description'], filters.search);
    }

    const { query, params } = qb.build();
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

    const setClause = buildSetClause(updates, {
      category_id: 'category_id',
      notes: 'notes',
      date: 'date',
    });

    if (!setClause) return 0;

    const qb = new SafeQueryBuilder(`UPDATE transactions SET ${setClause.setClause}`)
      .addParams(setClause.values)
      .where('user_id = ?', userId)
      .whereIn('id', transactionIds);

    const { query, params } = qb.build();
    const [result] = await pool.execute<ResultSetHeader>(query, params);
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
