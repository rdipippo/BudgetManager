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
  owner_user_id: number | null;
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
  owner_user_id?: number;
}

export interface UserPublic {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  role: string;
  owner_user_id: number | null;
  enabled: boolean;
  created_at: Date;
}

export interface MemberWithUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
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
      `INSERT INTO users (email, password_hash, first_name, last_name, role, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.email.toLowerCase(),
        data.password_hash,
        data.first_name || null,
        data.last_name || null,
        data.role || 'user',
        data.owner_user_id || null,
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
      owner_user_id: user.owner_user_id,
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

  // Find enabled members of an owner's account
  async findMembersByOwner(ownerUserId: number): Promise<MemberWithUser[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, email, first_name, last_name, role, enabled, created_at
       FROM users
       WHERE owner_user_id = ? AND enabled = TRUE
       ORDER BY created_at DESC`,
      [ownerUserId]
    );
    return rows as MemberWithUser[];
  },

  // Check if a user with the given email is already an active member of the owner's account
  async isMemberByEmail(ownerUserId: number, email: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM users WHERE owner_user_id = ? AND email = ? AND enabled = TRUE',
      [ownerUserId, email.toLowerCase()]
    );
    return rows.length > 0;
  },

  // Disable a member (revoke access). Verifies owner to prevent unauthorized revocation.
  async disableMember(memberId: number, ownerUserId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET enabled = FALSE WHERE id = ? AND owner_user_id = ?',
      [memberId, ownerUserId]
    );
    return result.affectedRows > 0;
  },
};

export const UserAllowedAccountsModel = {
  async add(userId: number, plaidAccountId: number): Promise<void> {
    await pool.execute(
      'INSERT IGNORE INTO user_allowed_accounts (user_id, plaid_account_id) VALUES (?, ?)',
      [userId, plaidAccountId]
    );
  },

  async getForUser(userId: number): Promise<number[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT plaid_account_id FROM user_allowed_accounts WHERE user_id = ?',
      [userId]
    );
    return rows.map((r) => r.plaid_account_id);
  },
};
