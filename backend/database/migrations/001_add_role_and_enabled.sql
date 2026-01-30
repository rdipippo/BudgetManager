use budget_manager;

-- Migration: Add role and enabled columns to users table
-- Run this migration against your existing database

-- Add role column (defaults to 'user')
-- Valid roles: 'user', 'admin', 'super_admin'
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';

-- Add enabled column (defaults to TRUE)
ALTER TABLE users ADD COLUMN enabled BOOLEAN DEFAULT TRUE;

-- Add index on role for faster admin queries
CREATE INDEX idx_role ON users(role);

-- Set rjdipippo@gmail.com as super_admin (can manage other admins)
UPDATE users SET role = 'super_admin' WHERE email = 'rjdipippo@gmail.com';
