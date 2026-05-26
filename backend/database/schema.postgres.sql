-- Budget Manager Database Schema
-- PostgreSQL (Supabase)
-- Full schema — apply this to a fresh database instead of running migrations.

-- ─── Auto-update trigger function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Users ────────────────────────────────────────────────────────────────────
-- role: 'user' | 'admin' | 'super_admin' for standalone accounts;
--       'full' | 'partial' | 'advisor' for invited members
-- owner_user_id: NULL for standalone/owner accounts; owner's id for invited members
-- enabled: FALSE to revoke a member's access without deleting their account
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user',
  owner_user_id INTEGER NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_owner_user_id ON users(owner_user_id);
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ─── Auth tokens ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ─── User preferences ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER UNIQUE NOT NULL,
  transaction_columns JSONB DEFAULT '["name", "date", "category", "amount"]',
  transaction_sort_field VARCHAR(50) DEFAULT 'date',
  transaction_sort_direction VARCHAR(4) DEFAULT 'desc' CHECK (transaction_sort_direction IN ('asc', 'desc')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE TRIGGER set_timestamp_user_preferences BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ─── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  parent_id INTEGER NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  icon VARCHAR(50) DEFAULT 'tag',
  is_system BOOLEAN DEFAULT FALSE,
  is_income BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name, parent_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE TRIGGER set_timestamp_categories BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ─── Plaid ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plaid_items (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  plaid_item_id VARCHAR(255) NOT NULL,
  access_token_encrypted VARCHAR(512) NOT NULL,
  institution_id VARCHAR(100),
  institution_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'error', 'pending_expiration')),
  consent_expiration_time TIMESTAMPTZ NULL,
  last_sync_at TIMESTAMPTZ NULL,
  "cursor" TEXT NULL,
  error_code VARCHAR(100) NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plaid_item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plaid_items_user ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);
CREATE TRIGGER set_timestamp_plaid_items BEFORE UPDATE ON plaid_items FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS plaid_accounts (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  plaid_item_id INTEGER NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plaid_account_id),
  FOREIGN KEY (plaid_item_id) REFERENCES plaid_items(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item ON plaid_accounts(plaid_item_id);
CREATE TRIGGER set_timestamp_plaid_accounts BEFORE UPDATE ON plaid_accounts FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS plaid_webhook_log (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  webhook_type VARCHAR(50) NOT NULL,
  webhook_code VARCHAR(50) NOT NULL,
  plaid_item_id VARCHAR(255),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plaid_webhook_log_item ON plaid_webhook_log(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_webhook_log_type ON plaid_webhook_log(webhook_type, webhook_code);
CREATE INDEX IF NOT EXISTS idx_plaid_webhook_log_created ON plaid_webhook_log(created_at);

CREATE TABLE IF NOT EXISTS account_balance_history (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  plaid_account_id INTEGER NOT NULL,
  current_balance DECIMAL(15, 2),
  available_balance DECIMAL(15, 2),
  date DATE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plaid_account_id, date),
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_account_balance_history_date ON account_balance_history(date);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  plaid_account_id INTEGER NULL,
  plaid_transaction_id VARCHAR(255) NULL,
  category_id INTEGER NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  merchant_name VARCHAR(255),
  description VARCHAR(500),
  plaid_category VARCHAR(255),
  pending BOOLEAN DEFAULT FALSE,
  is_manual BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plaid_transaction_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_name);
CREATE TRIGGER set_timestamp_transactions BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ─── Budgets & rules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  period_type VARCHAR(10) DEFAULT 'monthly' CHECK (period_type IN ('monthly')),
  start_day INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE TRIGGER set_timestamp_budgets BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS categorization_rules (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('merchant', 'description', 'amount_range', 'combined')),
  merchant_pattern VARCHAR(255) NULL,
  description_pattern VARCHAR(255) NULL,
  amount_min DECIMAL(15, 2) NULL,
  amount_max DECIMAL(15, 2) NULL,
  is_exact_match BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user ON categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_category ON categorization_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_priority ON categorization_rules(user_id, priority DESC);
CREATE TRIGGER set_timestamp_categorization_rules BEFORE UPDATE ON categorization_rules FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS learned_patterns (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('merchant', 'description')),
  pattern_value VARCHAR(255) NOT NULL,
  confidence_score DECIMAL(3, 2) DEFAULT 1.00,
  match_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pattern_type, pattern_value),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_user ON learned_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_lookup ON learned_patterns(user_id, pattern_type, pattern_value);
CREATE TRIGGER set_timestamp_learned_patterns BEFORE UPDATE ON learned_patterns FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ─── Lists ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366F1',
  icon VARCHAR(50) DEFAULT 'list',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lists_user ON lists(user_id);
CREATE TRIGGER set_timestamp_lists BEFORE UPDATE ON lists FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS list_items (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  list_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_list_items_user ON list_items(user_id);
CREATE TRIGGER set_timestamp_list_items BEFORE UPDATE ON list_items FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ─── Invitations ──────────────────────────────────────────────────────────────
-- Pending invitations sent by account owners
CREATE TABLE IF NOT EXISTS account_invitations (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  owner_user_id INTEGER NOT NULL,
  invitee_email VARCHAR(255) NOT NULL,
  access_type VARCHAR(10) NOT NULL CHECK (access_type IN ('full', 'partial', 'advisor')),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (token_hash),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_account_invitations_owner ON account_invitations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_account_invitations_email ON account_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_account_invitations_expires ON account_invitations(expires_at);

-- Allowed plaid accounts for partial-access invitations.
-- active = FALSE while invitation is pending; set to TRUE when invitation is accepted.
CREATE TABLE IF NOT EXISTS invitation_allowed_accounts (
  invitation_id INTEGER NOT NULL,
  plaid_account_id INTEGER NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (invitation_id, plaid_account_id),
  FOREIGN KEY (invitation_id) REFERENCES account_invitations(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
);

-- ─── Notes ───────────────────────────────────────────────────────────────────
-- Shared notes between account members, attachable to a plaid_account,
-- category, or monthly budget period.
CREATE TABLE IF NOT EXISTS notes (
  id             INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  owner_user_id  INTEGER NOT NULL,           -- owner's account (scopes data to all members)
  author_user_id INTEGER NOT NULL,           -- the actual logged-in user who wrote it
  entity_type    VARCHAR(20) NOT NULL CHECK (entity_type IN ('plaid_account', 'category', 'monthly_budget')),
  entity_id      INTEGER NOT NULL DEFAULT 0, -- plaid_account or category id; 0 for monthly_budget
  budget_year    SMALLINT NULL,              -- set only for entity_type = 'monthly_budget'
  budget_month   SMALLINT NULL,              -- 1–12, set only for entity_type = 'monthly_budget'
  body           TEXT NOT NULL,
  edited_at      TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (owner_user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(owner_user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_budget ON notes(owner_user_id, budget_year, budget_month);
CREATE TRIGGER set_timestamp_notes BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ─── Goals ────────────────────────────────────────────────────────────────────
-- goal_type drives which fields are meaningful:
--   save_balance     → plaid_account_id, baseline_amount, target_amount
--   pay_off_credit   → goal_credit_accounts (junction), baseline_total, target_balance
--   reduce_spending  → category_id, baseline_amount, reduction_type, reduction_amount
--   spend_target     → category_id, target_amount
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  goal_type VARCHAR(20) NOT NULL
    CHECK (goal_type IN ('save_balance','pay_off_credit','reduce_spending','spend_target')),
  plaid_account_id INTEGER NULL,
  category_id INTEGER NULL,
  target_amount DECIMAL(15, 2) NULL,
  baseline_amount DECIMAL(15, 2) NULL,
  target_balance DECIMAL(15, 2) NULL,
  baseline_total DECIMAL(15, 2) NULL,
  reduction_type VARCHAR(10) NULL CHECK (reduction_type IN ('fixed','percent')),
  reduction_amount DECIMAL(15, 2) NULL,
  target_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(user_id, goal_type);
CREATE TRIGGER set_timestamp_goals BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS goal_credit_accounts (
  goal_id INTEGER NOT NULL,
  plaid_account_id INTEGER NOT NULL,
  PRIMARY KEY (goal_id, plaid_account_id),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goal_credit_accounts_account ON goal_credit_accounts(plaid_account_id);

CREATE TABLE IF NOT EXISTS goal_progress (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  goal_id INTEGER NOT NULL,
  recorded_date DATE NOT NULL,
  current_value DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (goal_id, recorded_date),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON goal_progress(goal_id, recorded_date);

-- ─── Maintenance ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verification_tokens WHERE expires_at < NOW();
  DELETE FROM password_reset_tokens WHERE expires_at < NOW();
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
