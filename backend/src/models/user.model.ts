import pool from '../config/database';

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
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  },

  async create(data: CreateUserData): Promise<number> {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, owner_user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        data.email.toLowerCase(),
        data.password_hash,
        data.first_name || null,
        data.last_name || null,
        data.role || 'user',
        data.owner_user_id || null,
      ]
    );
    return result.rows[0].id;
  },

  async updatePassword(userId: number, passwordHash: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async verifyEmail(userId: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET email_verified = TRUE WHERE id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async exists(email: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows.length > 0;
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
    const result = await pool.query(
      'SELECT * FROM users ORDER BY created_at DESC'
    );
    return result.rows as User[];
  },

  async updateEnabled(userId: number, enabled: boolean): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET enabled = $1 WHERE id = $2',
      [enabled, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async updateRole(userId: number, role: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // Find enabled members of an owner's account
  async findMembersByOwner(ownerUserId: number): Promise<MemberWithUser[]> {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, enabled, created_at
       FROM users
       WHERE owner_user_id = $1 AND enabled = TRUE
       ORDER BY created_at DESC`,
      [ownerUserId]
    );
    return result.rows as MemberWithUser[];
  },

  // Check if a user with the given email is already an active member of the owner's account
  async isMemberByEmail(ownerUserId: number, email: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE owner_user_id = $1 AND email = $2 AND enabled = TRUE',
      [ownerUserId, email.toLowerCase()]
    );
    return result.rows.length > 0;
  },

  // Disable a member (revoke access). Verifies owner to prevent unauthorized revocation.
  async disableMember(memberId: number, ownerUserId: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET enabled = FALSE WHERE id = $1 AND owner_user_id = $2',
      [memberId, ownerUserId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
