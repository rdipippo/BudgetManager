-- Migration: Add account balance history table
-- Records daily balance snapshots for each account

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
