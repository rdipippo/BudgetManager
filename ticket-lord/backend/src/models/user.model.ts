import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export type UserRole = 'attendee' | 'host' | 'admin';

export interface User extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  email_verified: boolean;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<User[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<User[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role?: UserRole;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [data.email, data.passwordHash, data.name, data.role || 'attendee']
    );
    return result.insertId;
  },

  async updateEmailVerified(id: number): Promise<void> {
    await pool.query('UPDATE users SET email_verified = TRUE WHERE id = ?', [id]);
  },

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },

  async updateStripeCustomerId(id: number, customerId: string): Promise<void> {
    await pool.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, id]);
  },

  async updateStripeConnectId(id: number, accountId: string): Promise<void> {
    await pool.query('UPDATE users SET stripe_connect_account_id = ? WHERE id = ?', [accountId, id]);
  },

  async updateRole(id: number, role: UserRole): Promise<void> {
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  },

  async updateProfile(id: number, data: { name?: string; avatar_url?: string }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatar_url); }
    if (fields.length === 0) return;
    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  },
};
