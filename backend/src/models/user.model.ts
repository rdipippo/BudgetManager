import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  role: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface UserPublic {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  role: string;
  enabled: boolean;
  created_at: Date;
}

export const UserModel = {
  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  },

  async create(data: CreateUserData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.email.toLowerCase(),
        data.password_hash,
        data.first_name || null,
        data.last_name || null,
        data.role || 'user',
      ]
    );
    return result.insertId;
  },

  async updatePassword(userId: number, passwordHash: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );
    return result.affectedRows > 0;
  },

  async verifyEmail(userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET email_verified = TRUE WHERE id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  },

  async exists(email: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    return rows.length > 0;
  },

  toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      email_verified: user.email_verified,
      role: user.role,
      enabled: user.enabled,
      created_at: user.created_at,
    };
  },

  async findAll(): Promise<User[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users ORDER BY created_at DESC'
    );
    return rows as User[];
  },

  async updateEnabled(userId: number, enabled: boolean): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET enabled = ? WHERE id = ?',
      [enabled, userId]
    );
    return result.affectedRows > 0;
  },

  async updateRole(userId: number, role: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );
    return result.affectedRows > 0;
  },
};
