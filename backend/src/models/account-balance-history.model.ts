import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

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
    await pool.execute(
      `INSERT INTO account_balance_history (plaid_account_id, current_balance, available_balance, date)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_balance = VALUES(current_balance),
         available_balance = VALUES(available_balance),
         recorded_at = CURRENT_TIMESTAMP`,
      [accountId, currentBalance, availableBalance, today]
    );
  },

  async findByAccountIds(
    accountIds: number[],
    days: number
  ): Promise<AccountBalanceHistory[]> {
    if (accountIds.length === 0) return [];
    const placeholders = accountIds.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT plaid_account_id, DATE_FORMAT(date, '%Y-%m-%d') AS date, current_balance, available_balance
       FROM account_balance_history
       WHERE plaid_account_id IN (${placeholders})
         AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY plaid_account_id, date ASC`,
      [...accountIds, days]
    );
    return rows as AccountBalanceHistory[];
  },
};
