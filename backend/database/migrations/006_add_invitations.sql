-- Migration: Add user invitation and membership tables
-- Run after 005 migration

USE budget_manager;

-- Account invitations (pending invitations sent by account owners)
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

-- For partial access invitations: which plaid accounts the invitee will be able to see
CREATE TABLE IF NOT EXISTS invitation_allowed_accounts (
  invitation_id INT NOT NULL,
  plaid_account_id INT NOT NULL,
  PRIMARY KEY (invitation_id, plaid_account_id),
  FOREIGN KEY (invitation_id) REFERENCES account_invitations(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Active memberships (created when an invitation is accepted)
CREATE TABLE IF NOT EXISTS account_memberships (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner_user_id INT NOT NULL,
  member_user_id INT NOT NULL,
  access_type ENUM('full', 'partial', 'advisor') NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_owner_member (owner_user_id, member_user_id),
  INDEX idx_owner_user_id (owner_user_id),
  INDEX idx_member_user_id (member_user_id)
) ENGINE=InnoDB;

-- For partial access memberships: which plaid accounts the member can see
CREATE TABLE IF NOT EXISTS membership_allowed_accounts (
  membership_id INT NOT NULL,
  plaid_account_id INT NOT NULL,
  PRIMARY KEY (membership_id, plaid_account_id),
  FOREIGN KEY (membership_id) REFERENCES account_memberships(id) ON DELETE CASCADE,
  FOREIGN KEY (plaid_account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
