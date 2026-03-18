-- ============================================================
-- Ticket Lord Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS ticket_lord CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ticket_lord;

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE users (
  id                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email                     VARCHAR(255) NOT NULL UNIQUE,
  password_hash             VARCHAR(255) NOT NULL,
  name                      VARCHAR(100) NOT NULL,
  role                      ENUM('attendee', 'host', 'admin') NOT NULL DEFAULT 'attendee',
  email_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id        VARCHAR(255) NULL,
  stripe_connect_account_id VARCHAR(255) NULL,
  avatar_url                VARCHAR(500) NULL,
  created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Tokens
-- ============================================================
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE verification_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  type        ENUM('email_verification', 'password_reset') NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Events
-- ============================================================
CREATE TABLE events (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  host_id       INT UNSIGNED NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  category      ENUM('music','sports','arts','food','business','technology','education','other') NOT NULL DEFAULT 'other',
  venue_name    VARCHAR(200) NOT NULL,
  venue_address VARCHAR(300) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  country       VARCHAR(100) NOT NULL DEFAULT 'US',
  latitude      DECIMAL(10,8) NULL,
  longitude     DECIMAL(11,8) NULL,
  start_date    DATETIME NOT NULL,
  end_date      DATETIME NOT NULL,
  image_url     VARCHAR(500) NULL,
  status        ENUM('draft','published','cancelled','completed') NOT NULL DEFAULT 'draft',
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,
  online_url    VARCHAR(500) NULL,
  max_attendees INT UNSIGNED NULL,
  tags          VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_host (host_id),
  INDEX idx_status (status),
  INDEX idx_start_date (start_date),
  INDEX idx_category (category),
  INDEX idx_city (city),
  FULLTEXT idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Ticket Types
-- ============================================================
CREATE TABLE ticket_types (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id      INT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT NULL,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity      INT UNSIGNED NOT NULL,
  quantity_sold INT UNSIGNED NOT NULL DEFAULT 0,
  sale_start    DATETIME NULL,
  sale_end      DATETIME NULL,
  max_per_order INT UNSIGNED NOT NULL DEFAULT 10,
  min_per_order INT UNSIGNED NOT NULL DEFAULT 1,
  is_visible    BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_event (event_id),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Orders
-- ============================================================
CREATE TABLE orders (
  id                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                   INT UNSIGNED NOT NULL,
  event_id                  INT UNSIGNED NOT NULL,
  total_amount              INT NOT NULL COMMENT 'Amount in cents',
  platform_fee              INT NOT NULL DEFAULT 0 COMMENT 'Fee in cents',
  status                    ENUM('pending','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id  VARCHAR(255) NULL UNIQUE,
  stripe_charge_id          VARCHAR(255) NULL,
  refund_id                 VARCHAR(255) NULL,
  notes                     TEXT NULL,
  created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
  INDEX idx_user (user_id),
  INDEX idx_event (event_id),
  INDEX idx_status (status),
  INDEX idx_payment_intent (stripe_payment_intent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL,
  ticket_type_id  INT UNSIGNED NOT NULL,
  quantity        INT UNSIGNED NOT NULL,
  unit_price      INT NOT NULL COMMENT 'Price per ticket in cents at time of purchase',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Tickets (individual admission tickets)
-- ============================================================
CREATE TABLE tickets (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL,
  order_item_id   INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  event_id        INT UNSIGNED NOT NULL,
  ticket_type_id  INT UNSIGNED NOT NULL,
  ticket_number   VARCHAR(20) NOT NULL UNIQUE,
  qr_code         MEDIUMTEXT NOT NULL COMMENT 'Base64 encoded QR code data URL',
  status          ENUM('valid','used','cancelled','refunded') NOT NULL DEFAULT 'valid',
  checked_in_at   DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  INDEX idx_user (user_id),
  INDEX idx_event (event_id),
  INDEX idx_order (order_id),
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Seed: Admin user (password: Admin1234!)
-- Update password before deploying to production
-- ============================================================
INSERT INTO users (email, password_hash, name, role, email_verified)
VALUES (
  'admin@ticketlord.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgdi6UdHVV4E.Rh4yI3f4a',
  'Ticket Lord Admin',
  'admin',
  TRUE
);
