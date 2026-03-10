-- Budget Manager Database Schema
-- MySQL 8.0+
-- Full schema — apply this to a fresh database instead of running migrations.

CREATE DATABASE IF NOT EXISTS budget_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE budget_manager;

-- ─── Users ────────────────────────────────────────────────────────────────────
-- role: 'user' | 'admin' | 'super_admin' for standalone accounts;
--       'full' | 'partial' | 'advisor' for invited members
-- owner_user_id: NULL for standalone/owner accounts; owner's id for invited members
-- enabled: FALSE to revoke a member's access without deleting their account
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user',
  owner_user_id INT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at),
  INDEX idx_role (role),
  INDEX idx_owner_user_id (owner_user_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Auth tokens ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- ─── User preferences ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  transaction_columns JSON DEFAULT ('["name", "date", "category", "amount"]'),
  transaction_sort_field VARCHAR(50) DEFAULT 'date',
  transaction_sort_direction ENUM('asc', 'desc') DEFAULT 'desc',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ─── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  parent_id INT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  icon VARCHAR(50) DEFAULT 'tag',
  is_system BOOLEAN DEFAULT FALSE,
  is_income BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id),
  UNIQUE INDEX idx_user_category_name (user_id, name, parent_id)
) ENGINE=InnoDB;

-- ─── Plaid ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plaid_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plaid_item_id VARCHAR(255) NOT NULL,
  access_token_encrypted VARCHAR(512) NOT NULL,
  institution_id VARCHAR(100),
  institution_name VARCHAR(255),
  status ENUM('active', 'error', 'pending_expiration') DEFAULT 'active',
  consent_expiration_time TIMESTAMP NULL,
  last_sync_at TIMESTAMP NULL,
  `cursor` TEXT NULL,
  error_code VARCHAR(100) NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_plaid_item_id (plaid_item_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plaid_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plaid_item_id INT NOT NULL,
  plaid_account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  official_name VARCHAR(255),
  type VARCHAR(50),
  subtype VARCHAR(50),
  mask VARCHAR(10),
  current_balance DECIMAL(15, 2),
  available_balance DECIMAL(15, 2),
  currency_code VARCHAR(10) DEFAULT 'USD',
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plaid_item_id) REFERENCES plaid_items(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_plaid_account_id (plaid_account_id),
  INDEX idx_plaid_item_id (plaid_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plaid_webhook_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  webhook_type VARCHAR(50) NOT NULL,
  webhook_code VARCHAR(50) NOT NULL,
  plaid_item_id VARCHAR(255),
  payload JSON,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plaid_item_id (plaid_item_id),
  INDEX idx_webhook_type (webhook_type, webhook_code),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_balance_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plaid_account_id INT NOT NULL,
  current_balance DECIMAL(15, 2),
  available_balance DECIMAL(15, 2),
  date DATE NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_account_date (plaid_account_id, date),
  INDEX idx_date (date)
) ENGINE=InnoDB;

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plaid_account_id INT NULL,
  plaid_transaction_id VARCHAR(255) NULL,
  category_id INT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  merchant_name VARCHAR(255),
  description VARCHAR(500),
  plaid_category VARCHAR(255),
  pending BOOLEAN DEFAULT FALSE,
  is_manual BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE INDEX idx_plaid_transaction_id (plaid_transaction_id),
  INDEX idx_user_id (user_id),
  INDEX idx_category_id (category_id),
  INDEX idx_date (date),
  INDEX idx_user_date (user_id, date),
  INDEX idx_merchant_name (merchant_name(100))
) ENGINE=InnoDB;

-- ─── Budgets & rules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  period_type ENUM('monthly') DEFAULT 'monthly',
  start_day INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_category (user_id, category_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorization_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  match_type ENUM('merchant', 'description', 'amount_range', 'combined') NOT NULL,
  merchant_pattern VARCHAR(255) NULL,
  description_pattern VARCHAR(255) NULL,
  amount_min DECIMAL(15, 2) NULL,
  amount_max DECIMAL(15, 2) NULL,
  is_exact_match BOOLEAN DEFAULT FALSE,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_category_id (category_id),
  INDEX idx_priority (user_id, priority DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS learned_patterns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  pattern_type ENUM('merchant', 'description') NOT NULL,
  pattern_value VARCHAR(255) NOT NULL,
  confidence_score DECIMAL(3, 2) DEFAULT 1.00,
  match_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_pattern_lookup (user_id, pattern_type, pattern_value),
  UNIQUE INDEX idx_unique_pattern (user_id, pattern_type, pattern_value)
) ENGINE=InnoDB;

-- ─── Lists ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366F1',
  icon VARCHAR(50) DEFAULT 'list',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_lists_user_id (user_id),
  UNIQUE INDEX idx_user_list_name (user_id, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS list_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  list_id INT NOT NULL,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_list_items_list_id (list_id, sort_order),
  INDEX idx_list_items_user_id (user_id)
) ENGINE=InnoDB;

-- ─── Invitations ──────────────────────────────────────────────────────────────
-- Pending invitations sent by account owners
CREATE TABLE IF NOT EXISTS account_invitations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner_user_id INT NOT NULL,
  invitee_email VARCHAR(255) NOT NULL,
  access_type ENUM('full', 'partial', 'advisor') NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_token_hash (token_hash),
  INDEX idx_owner_user_id (owner_user_id),
  INDEX idx_invitee_email (invitee_email),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Allowed plaid accounts for partial-access invitations.
-- active = FALSE while invitation is pending; set to TRUE when invitation is accepted.
CREATE TABLE IF NOT EXISTS invitation_allowed_accounts (
  invitation_id INT NOT NULL,
  plaid_account_id INT NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (invitation_id, plaid_account_id),
  FOREIGN KEY (invitation_id) REFERENCES account_invitations(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Maintenance ──────────────────────────────────────────────────────────────
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS cleanup_expired_tokens()
BEGIN
  DELETE FROM email_verification_tokens WHERE expires_at < NOW();
  DELETE FROM password_reset_tokens WHERE expires_at < NOW();
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
END //
DELIMITER ;
