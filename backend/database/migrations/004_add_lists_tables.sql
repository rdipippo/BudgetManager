-- Migration: Add lists tables for general-purpose user lists
-- Run after 003_add_user_preferences.sql

USE budget_manager;

-- User lists (shopping lists, todo lists, wish lists, etc.)
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

-- Items within a list
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
