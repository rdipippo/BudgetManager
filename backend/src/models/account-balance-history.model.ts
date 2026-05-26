import pool from '../config/database';

export interface AccountBalanceHistory {
  plaid_account_id: number;
  current_balance: number | null;
  available_balance: number | null;
  date: string;
}

export const AccountBalanceHistoryModel = {
  async record(
    accountId: number,
    currentBalance: number | null,
    availableBalance: number | null
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      `INSERT INTO account_balance_history (plaid_account_id, current_balance, available_balance, date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (plaid_account_id, date) DO UPDATE SET
         current_balance = EXCLUDED.current_balance,
         available_balance = EXCLUDED.available_balance,
         recorded_at = NOW()`,
      [accountId, currentBalance, availableBalance, today]
    );
  },

  async findByAccountIds(
    accountIds: number[],
    days: number
  ): Promise<AccountBalanceHistory[]> {
    if (accountIds.length === 0) return [];
    const result = await pool.query(
      `SELECT plaid_account_id, TO_CHAR(date, 'YYYY-MM-DD') AS date, current_balance, available_balance
       FROM account_balance_history
       WHERE plaid_account_id = ANY($1::int[])
         AND date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
       ORDER BY plaid_account_id, date ASC`,
      [accountIds, days]
    );
    return result.rows as AccountBalanceHistory[];
  },
};
