-- Migration: Add user_preferences table
-- Run this on existing databases to add the user preferences feature

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
