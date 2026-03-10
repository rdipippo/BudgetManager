-- Migration: Replace account_memberships with owner_user_id on users table
-- Run after 006 migration

USE budget_manager;

-- Add owner_user_id to users (NULL for standalone/owner accounts, set for invited members)
ALTER TABLE users
  ADD COLUMN owner_user_id INT NULL AFTER role,
  ADD CONSTRAINT fk_users_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD INDEX idx_owner_user_id (owner_user_id);

-- Table for partial-access members: which plaid accounts they can see
CREATE TABLE IF NOT EXISTS user_allowed_accounts (
  user_id INT NOT NULL,
  plaid_account_id INT NOT NULL,
  PRIMARY KEY (user_id, plaid_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Migrate existing membership data into users table
UPDATE users u
JOIN account_memberships am ON am.member_user_id = u.id
SET u.owner_user_id = am.owner_user_id,
    u.role = am.access_type,
    u.enabled = (am.revoked = FALSE)
WHERE am.revoked = FALSE;

-- Migrate partial access allowed accounts
INSERT IGNORE INTO user_allowed_accounts (user_id, plaid_account_id)
SELECT am.member_user_id, maa.plaid_account_id
FROM account_memberships am
JOIN membership_allowed_accounts maa ON maa.membership_id = am.id
WHERE am.revoked = FALSE;

-- Drop old membership tables
DROP TABLE IF EXISTS membership_allowed_accounts;
DROP TABLE IF EXISTS account_memberships;
