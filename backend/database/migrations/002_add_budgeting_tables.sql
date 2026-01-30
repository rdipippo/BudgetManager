-- Migration: Add budgeting tables
-- Run after schema.sql and 001_add_role_and_enabled.sql

USE budget_manager;

-- Categories for transactions
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

-- Plaid Items (linked bank connections)
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

-- Plaid Accounts (bank accounts under an item)
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

-- Transactions (from Plaid and manual)
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

-- Categorization Rules (user-defined)
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

-- Learned Patterns (from user categorizations)
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

-- Budgets (monthly spending limits per category)
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

-- Plaid Webhook Log (for debugging/audit)
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
