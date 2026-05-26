import pool from '../config/database';
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
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as Transaction) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<Transaction | null> {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows.length > 0 ? (result.rows[0] as Transaction) : null;
  },

  async findByPlaidTransactionId(plaidTransactionId: string): Promise<Transaction | null> {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE plaid_transaction_id = $1',
      [plaidTransactionId]
    );
    return result.rows.length > 0 ? (result.rows[0] as Transaction) : null;
  },

  async findByUserId(
    userId: number,
    filters: TransactionFilters = {},
    allowedAccountIds?: number[]
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

    // For partial access: restrict to allowed plaid accounts
    if (allowedAccountIds && allowedAccountIds.length > 0) {
      qb.whereIn('t.plaid_account_id', allowedAccountIds);
    }

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
    const result = await pool.query(query, params);
    return result.rows as TransactionWithCategory[];
  },

  async countByUserId(
    userId: number,
    filters: TransactionFilters = {},
    allowedAccountIds?: number[]
  ): Promise<number> {
    const qb = new SafeQueryBuilder('SELECT COUNT(*) as count FROM transactions t WHERE t.user_id = ?')
      .addParam(userId);

    // For partial access: restrict to allowed plaid accounts
    if (allowedAccountIds && allowedAccountIds.length > 0) {
      qb.whereIn('t.plaid_account_id', allowedAccountIds);
    }

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

    const { query, params } = qb.build();
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  },

  async create(data: CreateTransactionData): Promise<number> {
    const result = await pool.query(
      `INSERT INTO transactions
       (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, plaid_category, pending, is_manual, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
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
    return result.rows[0].id;
  },

  async upsertFromPlaid(data: CreateTransactionData): Promise<number> {
    if (!data.plaid_transaction_id) {
      throw new Error('plaid_transaction_id is required for upsert');
    }

    const existing = await this.findByPlaidTransactionId(data.plaid_transaction_id);

    if (existing) {
      // Update existing - preserve user's category if they've set one
      await pool.query(
        `UPDATE transactions SET
         amount = $1, date = $2, merchant_name = $3, description = $4,
         plaid_category = $5, pending = $6
         WHERE id = $7`,
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
    const result = await pool.query(
      'UPDATE transactions SET category_id = $1 WHERE id = $2 AND user_id = $3',
      [categoryId, id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async update(
    id: number,
    userId: number,
    data: Partial<CreateTransactionData>
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];
    let p = 1;

    if (data.category_id !== undefined) {
      fields.push(`category_id = $${p++}`);
      values.push(data.category_id || null);
    }
    if (data.amount !== undefined) {
      fields.push(`amount = $${p++}`);
      values.push(data.amount);
    }
    if (data.date !== undefined) {
      fields.push(`date = $${p++}`);
      values.push(data.date as string | Date);
    }
    if (data.merchant_name !== undefined) {
      fields.push(`merchant_name = $${p++}`);
      values.push(data.merchant_name || null);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${p++}`);
      values.push(data.description || null);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${p++}`);
      values.push(data.notes || null);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${p++} AND user_id = $${p}`,
      values
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 AND is_manual = TRUE',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByPlaidTransactionId(plaidTransactionId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM transactions WHERE plaid_transaction_id = $1',
      [plaidTransactionId]
    );
    return (result.rowCount ?? 0) > 0;
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
    const result = await pool.query(query, params);
    return result.rowCount ?? 0;
  },

  async getSpentByCategory(
    userId: number,
    categoryId: number,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const result = await pool.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM transactions
       WHERE user_id = $1 AND category_id = $2 AND date >= $3 AND date <= $4 AND amount < 0`,
      [userId, categoryId, startDate, endDate]
    );
    return parseFloat((result.rows[0] as { total: string }).total) || 0;
  },

  async getSpentByCategoryForPeriod(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<{ category_id: number; total: number }[]> {
    const result = await pool.query(
      `SELECT category_id, COALESCE(SUM(ABS(amount)), 0) as total
       FROM transactions
       WHERE user_id = $1 AND date >= $2 AND date <= $3 AND amount < 0 AND category_id IS NOT NULL
       GROUP BY category_id`,
      [userId, startDate, endDate]
    );
    return result.rows.map((row) => ({
      category_id: row.category_id,
      total: parseFloat(row.total) || 0,
    }));
  },

  async getIncomeByCategoryForPeriod(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<{ category_id: number; total: number }[]> {
    const result = await pool.query(
      `SELECT category_id, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = $1 AND date >= $2 AND date <= $3 AND amount > 0 AND category_id IS NOT NULL
       GROUP BY category_id`,
      [userId, startDate, endDate]
    );
    return result.rows.map((row) => ({
      category_id: row.category_id,
      total: parseFloat(row.total) || 0,
    }));
  },
};
