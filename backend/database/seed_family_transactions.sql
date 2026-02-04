-- Seed data: 6 months of transactions for a typical American family of four
-- Run this after schema.sql and migrations

USE budget_manager;

-- Assuming user_id = 1 exists. Adjust if needed.
SET @user_id = 1;

-- Create categories if they don't exist
INSERT IGNORE INTO categories (user_id, name, color, icon, is_income) VALUES
(@user_id, 'Groceries', '#10B981', 'shopping-cart', FALSE),
(@user_id, 'Dining Out', '#F59E0B', 'utensils', FALSE),
(@user_id, 'Gas & Fuel', '#EF4444', 'fuel', FALSE),
(@user_id, 'Utilities', '#6366F1', 'zap', FALSE),
(@user_id, 'Entertainment', '#8B5CF6', 'film', FALSE),
(@user_id, 'Shopping', '#EC4899', 'shopping-bag', FALSE),
(@user_id, 'Healthcare', '#14B8A6', 'heart', FALSE),
(@user_id, 'Transportation', '#F97316', 'car', FALSE),
(@user_id, 'Housing', '#3B82F6', 'home', FALSE),
(@user_id, 'Insurance', '#64748B', 'shield', FALSE),
(@user_id, 'Kids & Family', '#A855F7', 'users', FALSE),
(@user_id, 'Subscriptions', '#06B6D4', 'credit-card', FALSE),
(@user_id, 'Personal Care', '#F472B6', 'user', FALSE),
(@user_id, 'Education', '#22C55E', 'book', FALSE),
(@user_id, 'Salary', '#10B981', 'dollar-sign', TRUE),
(@user_id, 'Other Income', '#059669', 'plus-circle', TRUE);

-- Get category IDs (use LIMIT 1 to handle potential duplicates)
SET @cat_groceries = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Groceries' LIMIT 1);
SET @cat_dining = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Dining Out' LIMIT 1);
SET @cat_gas = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Gas & Fuel' LIMIT 1);
SET @cat_utilities = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Utilities' LIMIT 1);
SET @cat_entertainment = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Entertainment' LIMIT 1);
SET @cat_shopping = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Shopping' LIMIT 1);
SET @cat_healthcare = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Healthcare' LIMIT 1);
SET @cat_transportation = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Transportation' LIMIT 1);
SET @cat_housing = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Housing' LIMIT 1);
SET @cat_insurance = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Insurance' LIMIT 1);
SET @cat_kids = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Kids & Family' LIMIT 1);
SET @cat_subscriptions = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Subscriptions' LIMIT 1);
SET @cat_personal = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Personal Care' LIMIT 1);
SET @cat_education = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Education' LIMIT 1);
SET @cat_salary = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Salary' LIMIT 1);
SET @cat_other_income = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Other Income' LIMIT 1);

-- Create dummy Plaid item and accounts
INSERT INTO plaid_items (user_id, plaid_item_id, access_token_encrypted, institution_id, institution_name, status)
VALUES (@user_id, 'dummy_item_001', 'encrypted_dummy_token', 'ins_dummy', 'First National Bank', 'active')
ON DUPLICATE KEY UPDATE institution_name = 'First National Bank';

SET @plaid_item_id = (SELECT id FROM plaid_items WHERE plaid_item_id = 'dummy_item_001' LIMIT 1);

INSERT INTO plaid_accounts (plaid_item_id, plaid_account_id, name, official_name, type, subtype, mask, current_balance, available_balance)
VALUES
(@plaid_item_id, 'dummy_checking_001', 'Checking', 'Primary Checking Account', 'depository', 'checking', '4521', 5420.50, 5320.50),
(@plaid_item_id, 'dummy_savings_001', 'Savings', 'High Yield Savings', 'depository', 'savings', '7832', 15000.00, 15000.00),
(@plaid_item_id, 'dummy_credit_001', 'Credit Card', 'Rewards Credit Card', 'credit', 'credit card', '9012', -2340.00, 7660.00)
ON DUPLICATE KEY UPDATE current_balance = VALUES(current_balance);

SET @acct_checking = (SELECT id FROM plaid_accounts WHERE plaid_account_id = 'dummy_checking_001' LIMIT 1);
SET @acct_credit = (SELECT id FROM plaid_accounts WHERE plaid_account_id = 'dummy_credit_001' LIMIT 1);

-- Insert 6 months of transactions (September 2025 - February 2026)
-- Using negative amounts for expenses, positive for income

-- ============================================
-- RECURRING MONTHLY TRANSACTIONS (all 6 months)
-- ============================================

-- Salary (1st and 15th of each month) - $4,500 per paycheck
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
-- September 2025
(@user_id, @acct_checking, 'sal_2025_09_01', @cat_salary, 4500.00, '2025-09-01', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
(@user_id, @acct_checking, 'sal_2025_09_15', @cat_salary, 4500.00, '2025-09-15', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
-- October 2025
(@user_id, @acct_checking, 'sal_2025_10_01', @cat_salary, 4500.00, '2025-10-01', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
(@user_id, @acct_checking, 'sal_2025_10_15', @cat_salary, 4500.00, '2025-10-15', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
-- November 2025
(@user_id, @acct_checking, 'sal_2025_11_01', @cat_salary, 4500.00, '2025-11-01', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
(@user_id, @acct_checking, 'sal_2025_11_15', @cat_salary, 4500.00, '2025-11-15', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
-- December 2025
(@user_id, @acct_checking, 'sal_2025_12_01', @cat_salary, 4500.00, '2025-12-01', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
(@user_id, @acct_checking, 'sal_2025_12_15', @cat_salary, 4500.00, '2025-12-15', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
-- January 2026
(@user_id, @acct_checking, 'sal_2026_01_01', @cat_salary, 4500.00, '2026-01-01', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
(@user_id, @acct_checking, 'sal_2026_01_15', @cat_salary, 4500.00, '2026-01-15', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE),
-- February 2026
(@user_id, @acct_checking, 'sal_2026_02_01', @cat_salary, 4500.00, '2026-02-01', 'ACME Corp', 'Direct Deposit - Payroll', FALSE, FALSE);

-- Mortgage/Rent ($2,200/month on the 1st)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'mort_2025_09', @cat_housing, -2200.00, '2025-09-01', 'First Mortgage Co', 'Monthly Mortgage Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'mort_2025_10', @cat_housing, -2200.00, '2025-10-01', 'First Mortgage Co', 'Monthly Mortgage Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'mort_2025_11', @cat_housing, -2200.00, '2025-11-01', 'First Mortgage Co', 'Monthly Mortgage Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'mort_2025_12', @cat_housing, -2200.00, '2025-12-01', 'First Mortgage Co', 'Monthly Mortgage Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'mort_2026_01', @cat_housing, -2200.00, '2026-01-01', 'First Mortgage Co', 'Monthly Mortgage Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'mort_2026_02', @cat_housing, -2200.00, '2026-02-01', 'First Mortgage Co', 'Monthly Mortgage Payment', FALSE, FALSE);

-- Car Payment ($450/month on the 10th)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'car_2025_09', @cat_transportation, -450.00, '2025-09-10', 'Toyota Financial', 'Auto Loan Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'car_2025_10', @cat_transportation, -450.00, '2025-10-10', 'Toyota Financial', 'Auto Loan Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'car_2025_11', @cat_transportation, -450.00, '2025-11-10', 'Toyota Financial', 'Auto Loan Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'car_2025_12', @cat_transportation, -450.00, '2025-12-10', 'Toyota Financial', 'Auto Loan Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'car_2026_01', @cat_transportation, -450.00, '2026-01-10', 'Toyota Financial', 'Auto Loan Payment', FALSE, FALSE),
(@user_id, @acct_checking, 'car_2026_02', @cat_transportation, -450.00, '2026-02-03', 'Toyota Financial', 'Auto Loan Payment', FALSE, FALSE);

-- Auto Insurance ($165/month)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'ins_auto_2025_09', @cat_insurance, -165.00, '2025-09-05', 'State Farm Insurance', 'Auto Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_auto_2025_10', @cat_insurance, -165.00, '2025-10-05', 'State Farm Insurance', 'Auto Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_auto_2025_11', @cat_insurance, -165.00, '2025-11-05', 'State Farm Insurance', 'Auto Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_auto_2025_12', @cat_insurance, -165.00, '2025-12-05', 'State Farm Insurance', 'Auto Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_auto_2026_01', @cat_insurance, -165.00, '2026-01-05', 'State Farm Insurance', 'Auto Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_auto_2026_02', @cat_insurance, -165.00, '2026-02-03', 'State Farm Insurance', 'Auto Insurance Premium', FALSE, FALSE);

-- Health Insurance ($380/month)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'ins_health_2025_09', @cat_insurance, -380.00, '2025-09-01', 'Blue Cross Blue Shield', 'Health Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_health_2025_10', @cat_insurance, -380.00, '2025-10-01', 'Blue Cross Blue Shield', 'Health Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_health_2025_11', @cat_insurance, -380.00, '2025-11-01', 'Blue Cross Blue Shield', 'Health Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_health_2025_12', @cat_insurance, -380.00, '2025-12-01', 'Blue Cross Blue Shield', 'Health Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_health_2026_01', @cat_insurance, -380.00, '2026-01-01', 'Blue Cross Blue Shield', 'Health Insurance Premium', FALSE, FALSE),
(@user_id, @acct_checking, 'ins_health_2026_02', @cat_insurance, -380.00, '2026-02-01', 'Blue Cross Blue Shield', 'Health Insurance Premium', FALSE, FALSE);

-- Utilities - Electric ($120-180/month)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'elec_2025_09', @cat_utilities, -185.00, '2025-09-15', 'City Power & Light', 'Electric Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'elec_2025_10', @cat_utilities, -142.00, '2025-10-15', 'City Power & Light', 'Electric Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'elec_2025_11', @cat_utilities, -128.00, '2025-11-15', 'City Power & Light', 'Electric Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'elec_2025_12', @cat_utilities, -165.00, '2025-12-15', 'City Power & Light', 'Electric Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'elec_2026_01', @cat_utilities, -178.00, '2026-01-15', 'City Power & Light', 'Electric Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'elec_2026_02', @cat_utilities, -172.00, '2026-02-03', 'City Power & Light', 'Electric Bill', FALSE, FALSE);

-- Utilities - Gas ($60-120/month)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'gas_util_2025_09', @cat_utilities, -45.00, '2025-09-18', 'City Gas Company', 'Natural Gas Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'gas_util_2025_10', @cat_utilities, -52.00, '2025-10-18', 'City Gas Company', 'Natural Gas Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'gas_util_2025_11', @cat_utilities, -78.00, '2025-11-18', 'City Gas Company', 'Natural Gas Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'gas_util_2025_12', @cat_utilities, -115.00, '2025-12-18', 'City Gas Company', 'Natural Gas Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'gas_util_2026_01', @cat_utilities, -125.00, '2026-01-18', 'City Gas Company', 'Natural Gas Bill', FALSE, FALSE),
(@user_id, @acct_checking, 'gas_util_2026_02', @cat_utilities, -118.00, '2026-02-03', 'City Gas Company', 'Natural Gas Bill', FALSE, FALSE);

-- Internet ($85/month)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'inet_2025_09', @cat_utilities, -85.00, '2025-09-08', 'Comcast Xfinity', 'Internet Service', FALSE, FALSE),
(@user_id, @acct_checking, 'inet_2025_10', @cat_utilities, -85.00, '2025-10-08', 'Comcast Xfinity', 'Internet Service', FALSE, FALSE),
(@user_id, @acct_checking, 'inet_2025_11', @cat_utilities, -85.00, '2025-11-08', 'Comcast Xfinity', 'Internet Service', FALSE, FALSE),
(@user_id, @acct_checking, 'inet_2025_12', @cat_utilities, -85.00, '2025-12-08', 'Comcast Xfinity', 'Internet Service', FALSE, FALSE),
(@user_id, @acct_checking, 'inet_2026_01', @cat_utilities, -85.00, '2026-01-08', 'Comcast Xfinity', 'Internet Service', FALSE, FALSE),
(@user_id, @acct_checking, 'inet_2026_02', @cat_utilities, -85.00, '2026-02-03', 'Comcast Xfinity', 'Internet Service', FALSE, FALSE);

-- Phone Bill ($140/month for family plan)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'phone_2025_09', @cat_utilities, -140.00, '2025-09-12', 'Verizon Wireless', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_checking, 'phone_2025_10', @cat_utilities, -140.00, '2025-10-12', 'Verizon Wireless', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_checking, 'phone_2025_11', @cat_utilities, -140.00, '2025-11-12', 'Verizon Wireless', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_checking, 'phone_2025_12', @cat_utilities, -140.00, '2025-12-12', 'Verizon Wireless', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_checking, 'phone_2026_01', @cat_utilities, -140.00, '2026-01-12', 'Verizon Wireless', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_checking, 'phone_2026_02', @cat_utilities, -140.00, '2026-02-03', 'Verizon Wireless', 'Family Plan', FALSE, FALSE);

-- Subscriptions - Netflix ($15.99)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'netflix_2025_09', @cat_subscriptions, -15.99, '2025-09-03', 'Netflix', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'netflix_2025_10', @cat_subscriptions, -15.99, '2025-10-03', 'Netflix', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'netflix_2025_11', @cat_subscriptions, -15.99, '2025-11-03', 'Netflix', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'netflix_2025_12', @cat_subscriptions, -15.99, '2025-12-03', 'Netflix', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'netflix_2026_01', @cat_subscriptions, -15.99, '2026-01-03', 'Netflix', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'netflix_2026_02', @cat_subscriptions, -15.99, '2026-02-03', 'Netflix', 'Monthly Subscription', FALSE, FALSE);

-- Subscriptions - Disney+ ($13.99)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'disney_2025_09', @cat_subscriptions, -13.99, '2025-09-07', 'Disney Plus', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'disney_2025_10', @cat_subscriptions, -13.99, '2025-10-07', 'Disney Plus', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'disney_2025_11', @cat_subscriptions, -13.99, '2025-11-07', 'Disney Plus', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'disney_2025_12', @cat_subscriptions, -13.99, '2025-12-07', 'Disney Plus', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'disney_2026_01', @cat_subscriptions, -13.99, '2026-01-07', 'Disney Plus', 'Monthly Subscription', FALSE, FALSE),
(@user_id, @acct_credit, 'disney_2026_02', @cat_subscriptions, -13.99, '2026-02-03', 'Disney Plus', 'Monthly Subscription', FALSE, FALSE);

-- Subscriptions - Spotify Family ($16.99)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'spotify_2025_09', @cat_subscriptions, -16.99, '2025-09-14', 'Spotify', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_credit, 'spotify_2025_10', @cat_subscriptions, -16.99, '2025-10-14', 'Spotify', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_credit, 'spotify_2025_11', @cat_subscriptions, -16.99, '2025-11-14', 'Spotify', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_credit, 'spotify_2025_12', @cat_subscriptions, -16.99, '2025-12-14', 'Spotify', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_credit, 'spotify_2026_01', @cat_subscriptions, -16.99, '2026-01-14', 'Spotify', 'Family Plan', FALSE, FALSE),
(@user_id, @acct_credit, 'spotify_2026_02', @cat_subscriptions, -16.99, '2026-02-03', 'Spotify', 'Family Plan', FALSE, FALSE);

-- Amazon Prime ($14.99)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'prime_2025_09', @cat_subscriptions, -14.99, '2025-09-20', 'Amazon Prime', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_credit, 'prime_2025_10', @cat_subscriptions, -14.99, '2025-10-20', 'Amazon Prime', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_credit, 'prime_2025_11', @cat_subscriptions, -14.99, '2025-11-20', 'Amazon Prime', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_credit, 'prime_2025_12', @cat_subscriptions, -14.99, '2025-12-20', 'Amazon Prime', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_credit, 'prime_2026_01', @cat_subscriptions, -14.99, '2026-01-20', 'Amazon Prime', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_credit, 'prime_2026_02', @cat_subscriptions, -14.99, '2026-02-03', 'Amazon Prime', 'Monthly Membership', FALSE, FALSE);

-- Gym Membership ($49.99)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'gym_2025_09', @cat_personal, -49.99, '2025-09-01', 'Planet Fitness', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_checking, 'gym_2025_10', @cat_personal, -49.99, '2025-10-01', 'Planet Fitness', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_checking, 'gym_2025_11', @cat_personal, -49.99, '2025-11-01', 'Planet Fitness', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_checking, 'gym_2025_12', @cat_personal, -49.99, '2025-12-01', 'Planet Fitness', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_checking, 'gym_2026_01', @cat_personal, -49.99, '2026-01-01', 'Planet Fitness', 'Monthly Membership', FALSE, FALSE),
(@user_id, @acct_checking, 'gym_2026_02', @cat_personal, -49.99, '2026-02-01', 'Planet Fitness', 'Monthly Membership', FALSE, FALSE);

-- ============================================
-- VARIABLE MONTHLY TRANSACTIONS
-- ============================================

-- GROCERIES (weekly shopping ~$200-300/week)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
-- September 2025
(@user_id, @acct_credit, 'groc_2025_09_01', @cat_groceries, -245.67, '2025-09-02', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_09_02', @cat_groceries, -189.34, '2025-09-09', 'Walmart Supercenter', 'Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_09_03', @cat_groceries, -267.89, '2025-09-16', 'Costco', 'Bulk Shopping', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_09_04', @cat_groceries, -198.45, '2025-09-23', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_09_05', @cat_groceries, -78.23, '2025-09-28', 'Trader Joes', 'Specialty Items', FALSE, FALSE),
-- October 2025
(@user_id, @acct_credit, 'groc_2025_10_01', @cat_groceries, -234.56, '2025-10-04', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_10_02', @cat_groceries, -312.78, '2025-10-11', 'Costco', 'Bulk Shopping', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_10_03', @cat_groceries, -178.90, '2025-10-18', 'Walmart Supercenter', 'Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_10_04', @cat_groceries, -256.34, '2025-10-25', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
-- November 2025
(@user_id, @acct_credit, 'groc_2025_11_01', @cat_groceries, -223.45, '2025-11-01', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_11_02', @cat_groceries, -189.67, '2025-11-08', 'Walmart Supercenter', 'Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_11_03', @cat_groceries, -345.89, '2025-11-15', 'Costco', 'Thanksgiving Prep', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_11_04', @cat_groceries, -156.78, '2025-11-22', 'Kroger', 'Thanksgiving Items', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_11_05', @cat_groceries, -89.34, '2025-11-26', 'Whole Foods', 'Thanksgiving Turkey', FALSE, FALSE),
-- December 2025
(@user_id, @acct_credit, 'groc_2025_12_01', @cat_groceries, -267.89, '2025-12-03', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_12_02', @cat_groceries, -198.45, '2025-12-10', 'Walmart Supercenter', 'Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_12_03', @cat_groceries, -389.23, '2025-12-17', 'Costco', 'Holiday Shopping', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2025_12_04', @cat_groceries, -145.67, '2025-12-23', 'Kroger', 'Christmas Dinner', FALSE, FALSE),
-- January 2026
(@user_id, @acct_credit, 'groc_2026_01_01', @cat_groceries, -234.56, '2026-01-03', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2026_01_02', @cat_groceries, -178.90, '2026-01-10', 'Walmart Supercenter', 'Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2026_01_03', @cat_groceries, -298.45, '2026-01-17', 'Costco', 'Bulk Shopping', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2026_01_04', @cat_groceries, -212.34, '2026-01-24', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2026_01_05', @cat_groceries, -167.89, '2026-01-31', 'Trader Joes', 'Specialty Items', FALSE, FALSE),
-- February 2026
(@user_id, @acct_credit, 'groc_2026_02_01', @cat_groceries, -245.67, '2026-02-01', 'Kroger', 'Weekly Groceries', FALSE, FALSE),
(@user_id, @acct_credit, 'groc_2026_02_02', @cat_groceries, -189.34, '2026-02-03', 'Walmart Supercenter', 'Groceries', FALSE, FALSE);

-- GAS & FUEL (every 1-2 weeks, $45-65 per fill-up)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
-- September 2025
(@user_id, @acct_credit, 'fuel_2025_09_01', @cat_gas, -52.34, '2025-09-03', 'Shell', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_09_02', @cat_gas, -48.67, '2025-09-12', 'Exxon', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_09_03', @cat_gas, -55.89, '2025-09-21', 'Chevron', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_09_04', @cat_gas, -51.23, '2025-09-29', 'Shell', 'Gas', FALSE, FALSE),
-- October 2025
(@user_id, @acct_credit, 'fuel_2025_10_01', @cat_gas, -49.78, '2025-10-05', 'BP', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_10_02', @cat_gas, -54.56, '2025-10-15', 'Shell', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_10_03', @cat_gas, -47.89, '2025-10-24', 'Exxon', 'Gas', FALSE, FALSE),
-- November 2025
(@user_id, @acct_credit, 'fuel_2025_11_01', @cat_gas, -53.45, '2025-11-02', 'Shell', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_11_02', @cat_gas, -58.67, '2025-11-12', 'Chevron', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_11_03', @cat_gas, -62.34, '2025-11-25', 'Shell', 'Thanksgiving Travel', FALSE, FALSE),
-- December 2025
(@user_id, @acct_credit, 'fuel_2025_12_01', @cat_gas, -51.23, '2025-12-04', 'Exxon', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_12_02', @cat_gas, -56.78, '2025-12-14', 'Shell', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2025_12_03', @cat_gas, -64.56, '2025-12-23', 'BP', 'Holiday Travel', FALSE, FALSE),
-- January 2026
(@user_id, @acct_credit, 'fuel_2026_01_01', @cat_gas, -49.89, '2026-01-04', 'Shell', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2026_01_02', @cat_gas, -52.34, '2026-01-15', 'Exxon', 'Gas', FALSE, FALSE),
(@user_id, @acct_credit, 'fuel_2026_01_03', @cat_gas, -48.67, '2026-01-26', 'Chevron', 'Gas', FALSE, FALSE),
-- February 2026
(@user_id, @acct_credit, 'fuel_2026_02_01', @cat_gas, -54.23, '2026-02-02', 'Shell', 'Gas', FALSE, FALSE);

-- DINING OUT (2-4 times per week)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
-- September 2025
(@user_id, @acct_credit, 'dining_2025_09_01', @cat_dining, -45.67, '2025-09-05', 'Olive Garden', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_09_02', @cat_dining, -32.45, '2025-09-08', 'Chipotle', 'Lunch', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_09_03', @cat_dining, -78.90, '2025-09-13', 'Outback Steakhouse', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_09_04', @cat_dining, -28.34, '2025-09-17', 'Panera Bread', 'Lunch', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_09_05', @cat_dining, -56.78, '2025-09-21', 'Red Lobster', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_09_06', @cat_dining, -18.45, '2025-09-24', 'McDonalds', 'Kids Meal', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_09_07', @cat_dining, -42.56, '2025-09-28', 'Applebees', 'Family Dinner', FALSE, FALSE),
-- October 2025
(@user_id, @acct_credit, 'dining_2025_10_01', @cat_dining, -65.89, '2025-10-03', 'Texas Roadhouse', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_10_02', @cat_dining, -24.56, '2025-10-07', 'Subway', 'Lunch', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_10_03', @cat_dining, -89.34, '2025-10-12', 'Cheesecake Factory', 'Birthday Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_10_04', @cat_dining, -35.67, '2025-10-18', 'Buffalo Wild Wings', 'Football Night', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_10_05', @cat_dining, -52.34, '2025-10-24', 'Chilis', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_10_06', @cat_dining, -15.89, '2025-10-28', 'Taco Bell', 'Quick Dinner', FALSE, FALSE),
-- November 2025
(@user_id, @acct_credit, 'dining_2025_11_01', @cat_dining, -48.90, '2025-11-02', 'IHOP', 'Family Breakfast', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_11_02', @cat_dining, -34.56, '2025-11-08', 'Five Guys', 'Lunch', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_11_03', @cat_dining, -72.34, '2025-11-14', 'Red Robin', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_11_04', @cat_dining, -28.90, '2025-11-21', 'Wendys', 'Quick Lunch', FALSE, FALSE),
-- December 2025
(@user_id, @acct_credit, 'dining_2025_12_01', @cat_dining, -125.67, '2025-12-06', 'Capital Grille', 'Holiday Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_12_02', @cat_dining, -45.89, '2025-12-12', 'Cracker Barrel', 'Family Lunch', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_12_03', @cat_dining, -38.45, '2025-12-18', 'Chick-fil-A', 'Quick Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2025_12_04', @cat_dining, -98.67, '2025-12-26', 'Maggianos', 'Post-Christmas Dinner', FALSE, FALSE),
-- January 2026
(@user_id, @acct_credit, 'dining_2026_01_01', @cat_dining, -42.34, '2026-01-04', 'Olive Garden', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2026_01_02', @cat_dining, -28.90, '2026-01-10', 'Chipotle', 'Lunch', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2026_01_03', @cat_dining, -56.78, '2026-01-17', 'TGI Fridays', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2026_01_04', @cat_dining, -34.56, '2026-01-24', 'Panera Bread', 'Lunch', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2026_01_05', @cat_dining, -67.89, '2026-01-30', 'Carrabas', 'Date Night', FALSE, FALSE),
-- February 2026
(@user_id, @acct_credit, 'dining_2026_02_01', @cat_dining, -52.34, '2026-02-01', 'Longhorn Steakhouse', 'Family Dinner', FALSE, FALSE),
(@user_id, @acct_credit, 'dining_2026_02_02', @cat_dining, -24.56, '2026-02-03', 'Qdoba', 'Lunch', FALSE, FALSE);

-- COFFEE SHOPS
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'coffee_2025_09_01', @cat_dining, -6.45, '2025-09-04', 'Starbucks', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_09_02', @cat_dining, -5.89, '2025-09-11', 'Starbucks', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_09_03', @cat_dining, -7.23, '2025-09-18', 'Dunkin', 'Coffee & Donuts', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_10_01', @cat_dining, -6.78, '2025-10-02', 'Starbucks', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_10_02', @cat_dining, -5.45, '2025-10-16', 'Dunkin', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_11_01', @cat_dining, -7.89, '2025-11-05', 'Starbucks', 'Pumpkin Spice Latte', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_11_02', @cat_dining, -6.34, '2025-11-19', 'Starbucks', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_12_01', @cat_dining, -8.45, '2025-12-08', 'Starbucks', 'Holiday Drink', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2025_12_02', @cat_dining, -6.12, '2025-12-22', 'Dunkin', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2026_01_01', @cat_dining, -6.78, '2026-01-06', 'Starbucks', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2026_01_02', @cat_dining, -5.89, '2026-01-20', 'Starbucks', 'Coffee', FALSE, FALSE),
(@user_id, @acct_credit, 'coffee_2026_02_01', @cat_dining, -7.23, '2026-02-03', 'Starbucks', 'Coffee', FALSE, FALSE);

-- ENTERTAINMENT
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
-- Movies
(@user_id, @acct_credit, 'movies_2025_09', @cat_entertainment, -68.00, '2025-09-14', 'AMC Theatres', 'Family Movie Night', FALSE, FALSE),
(@user_id, @acct_credit, 'movies_2025_10', @cat_entertainment, -72.50, '2025-10-19', 'Regal Cinemas', 'Movie & Snacks', FALSE, FALSE),
(@user_id, @acct_credit, 'movies_2025_12', @cat_entertainment, -85.00, '2025-12-21', 'AMC Theatres', 'Star Wars Premiere', FALSE, FALSE),
(@user_id, @acct_credit, 'movies_2026_01', @cat_entertainment, -64.00, '2026-01-11', 'Regal Cinemas', 'Family Movie', FALSE, FALSE),
-- Bowling
(@user_id, @acct_credit, 'bowling_2025_09', @cat_entertainment, -78.45, '2025-09-21', 'Lucky Strike Bowling', 'Family Bowling', FALSE, FALSE),
(@user_id, @acct_credit, 'bowling_2025_11', @cat_entertainment, -82.34, '2025-11-16', 'Main Event', 'Kids Birthday Party', FALSE, FALSE),
-- Mini Golf/Arcade
(@user_id, @acct_credit, 'arcade_2025_10', @cat_entertainment, -65.00, '2025-10-26', 'Dave & Busters', 'Family Fun', FALSE, FALSE),
(@user_id, @acct_credit, 'arcade_2026_01', @cat_entertainment, -58.90, '2026-01-18', 'Chuck E Cheese', 'Kids Day Out', FALSE, FALSE),
-- Other Entertainment
(@user_id, @acct_credit, 'ent_2025_09', @cat_entertainment, -145.00, '2025-09-07', 'Six Flags', 'Theme Park', FALSE, FALSE),
(@user_id, @acct_credit, 'ent_2025_10', @cat_entertainment, -35.00, '2025-10-31', 'Halloween Store', 'Costumes', FALSE, FALSE),
(@user_id, @acct_credit, 'ent_2025_12', @cat_entertainment, -89.00, '2025-12-15', 'Zoo Lights', 'Holiday Event', FALSE, FALSE),
(@user_id, @acct_credit, 'ent_2026_02', @cat_entertainment, -120.00, '2026-02-02', 'Indoor Waterpark', 'Family Day Trip', FALSE, FALSE);

-- SHOPPING (Amazon, Target, etc.)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
-- Amazon
(@user_id, @acct_credit, 'amzn_2025_09_01', @cat_shopping, -45.67, '2025-09-06', 'Amazon', 'Household Items', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2025_09_02', @cat_shopping, -89.34, '2025-09-19', 'Amazon', 'School Supplies', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2025_10_01', @cat_shopping, -156.78, '2025-10-08', 'Amazon', 'Electronics', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2025_10_02', @cat_shopping, -34.56, '2025-10-22', 'Amazon', 'Books', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2025_11_01', @cat_shopping, -234.89, '2025-11-29', 'Amazon', 'Black Friday Deals', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2025_12_01', @cat_shopping, -345.67, '2025-12-10', 'Amazon', 'Christmas Gifts', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2025_12_02', @cat_shopping, -178.90, '2025-12-18', 'Amazon', 'Last Minute Gifts', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2026_01_01', @cat_shopping, -67.89, '2026-01-08', 'Amazon', 'Returns & New Items', FALSE, FALSE),
(@user_id, @acct_credit, 'amzn_2026_02_01', @cat_shopping, -45.23, '2026-02-02', 'Amazon', 'Household Items', FALSE, FALSE),
-- Target
(@user_id, @acct_credit, 'target_2025_09', @cat_shopping, -123.45, '2025-09-10', 'Target', 'Back to School', FALSE, FALSE),
(@user_id, @acct_credit, 'target_2025_10', @cat_shopping, -89.67, '2025-10-14', 'Target', 'Halloween Decor', FALSE, FALSE),
(@user_id, @acct_credit, 'target_2025_11', @cat_shopping, -156.34, '2025-11-25', 'Target', 'Black Friday', FALSE, FALSE),
(@user_id, @acct_credit, 'target_2025_12', @cat_shopping, -234.56, '2025-12-08', 'Target', 'Christmas Shopping', FALSE, FALSE),
(@user_id, @acct_credit, 'target_2026_01', @cat_shopping, -78.90, '2026-01-12', 'Target', 'Clearance Items', FALSE, FALSE),
-- Walmart
(@user_id, @acct_credit, 'walmart_2025_09', @cat_shopping, -67.89, '2025-09-15', 'Walmart', 'Household Items', FALSE, FALSE),
(@user_id, @acct_credit, 'walmart_2025_11', @cat_shopping, -145.67, '2025-11-28', 'Walmart', 'Black Friday Electronics', FALSE, FALSE),
(@user_id, @acct_credit, 'walmart_2025_12', @cat_shopping, -89.34, '2025-12-20', 'Walmart', 'Stocking Stuffers', FALSE, FALSE);

-- KIDS & FAMILY
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
-- School Related
(@user_id, @acct_checking, 'school_2025_09_01', @cat_kids, -285.00, '2025-09-02', 'Lincoln Elementary', 'School Fees', FALSE, FALSE),
(@user_id, @acct_checking, 'school_2025_09_02', @cat_kids, -145.00, '2025-09-05', 'School Pictures Inc', 'School Photos', FALSE, FALSE),
(@user_id, @acct_credit, 'school_2025_10', @cat_kids, -75.00, '2025-10-15', 'Book Fair', 'School Book Fair', FALSE, FALSE),
(@user_id, @acct_checking, 'school_2025_12', @cat_kids, -35.00, '2025-12-12', 'Lincoln Elementary', 'Holiday Party', FALSE, FALSE),
(@user_id, @acct_checking, 'school_2026_01', @cat_kids, -120.00, '2026-01-15', 'Lincoln Elementary', 'Field Trip', FALSE, FALSE),
-- Sports/Activities
(@user_id, @acct_checking, 'sports_2025_09', @cat_kids, -175.00, '2025-09-08', 'YMCA', 'Soccer Registration', FALSE, FALSE),
(@user_id, @acct_checking, 'sports_2025_10', @cat_kids, -85.00, '2025-10-05', 'Dicks Sporting Goods', 'Soccer Cleats', FALSE, FALSE),
(@user_id, @acct_checking, 'sports_2025_11', @cat_kids, -150.00, '2025-11-03', 'YMCA', 'Basketball Registration', FALSE, FALSE),
(@user_id, @acct_checking, 'sports_2026_01', @cat_kids, -125.00, '2026-01-06', 'Swim School', 'Swimming Lessons', FALSE, FALSE),
-- Babysitter/Childcare
(@user_id, @acct_checking, 'sitter_2025_09', @cat_kids, -80.00, '2025-09-20', 'Sarah B', 'Babysitter', FALSE, FALSE),
(@user_id, @acct_checking, 'sitter_2025_10', @cat_kids, -100.00, '2025-10-25', 'Sarah B', 'Date Night Sitter', FALSE, FALSE),
(@user_id, @acct_checking, 'sitter_2025_12', @cat_kids, -150.00, '2025-12-24', 'Sarah B', 'Christmas Eve Sitter', FALSE, FALSE),
(@user_id, @acct_checking, 'sitter_2026_01', @cat_kids, -80.00, '2026-01-28', 'Sarah B', 'Babysitter', FALSE, FALSE);

-- HEALTHCARE
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'health_2025_09', @cat_healthcare, -35.00, '2025-09-09', 'CVS Pharmacy', 'Prescriptions', FALSE, FALSE),
(@user_id, @acct_checking, 'health_2025_10_01', @cat_healthcare, -45.00, '2025-10-03', 'Dr Smith Pediatrics', 'Well Child Visit Copay', FALSE, FALSE),
(@user_id, @acct_credit, 'health_2025_10_02', @cat_healthcare, -28.45, '2025-10-15', 'Walgreens', 'Cold Medicine', FALSE, FALSE),
(@user_id, @acct_checking, 'health_2025_11', @cat_healthcare, -125.00, '2025-11-12', 'City Dental', 'Dental Cleaning', FALSE, FALSE),
(@user_id, @acct_credit, 'health_2025_12', @cat_healthcare, -42.67, '2025-12-05', 'CVS Pharmacy', 'Prescriptions', FALSE, FALSE),
(@user_id, @acct_checking, 'health_2026_01_01', @cat_healthcare, -45.00, '2026-01-08', 'Family Medicine', 'Annual Physical Copay', FALSE, FALSE),
(@user_id, @acct_credit, 'health_2026_01_02', @cat_healthcare, -156.78, '2026-01-22', 'LensCrafters', 'New Glasses', FALSE, FALSE),
(@user_id, @acct_credit, 'health_2026_02', @cat_healthcare, -35.00, '2026-02-01', 'CVS Pharmacy', 'Prescriptions', FALSE, FALSE);

-- PERSONAL CARE
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'hair_2025_09', @cat_personal, -45.00, '2025-09-12', 'Great Clips', 'Haircuts x2', FALSE, FALSE),
(@user_id, @acct_credit, 'hair_2025_10', @cat_personal, -85.00, '2025-10-18', 'Salon Blu', 'Haircut & Color', FALSE, FALSE),
(@user_id, @acct_credit, 'hair_2025_11', @cat_personal, -45.00, '2025-11-08', 'Great Clips', 'Haircuts x2', FALSE, FALSE),
(@user_id, @acct_credit, 'hair_2025_12', @cat_personal, -95.00, '2025-12-19', 'Salon Blu', 'Holiday Hair', FALSE, FALSE),
(@user_id, @acct_credit, 'hair_2026_01', @cat_personal, -45.00, '2026-01-16', 'Great Clips', 'Haircuts x2', FALSE, FALSE),
(@user_id, @acct_credit, 'personal_2025_10', @cat_personal, -34.56, '2025-10-08', 'Bath & Body Works', 'Personal Care Items', FALSE, FALSE),
(@user_id, @acct_credit, 'personal_2025_12', @cat_personal, -67.89, '2025-12-11', 'Ulta Beauty', 'Gifts', FALSE, FALSE);

-- EDUCATION
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'edu_2025_09', @cat_education, -29.99, '2025-09-08', 'Kumon', 'Math Tutoring', FALSE, FALSE),
(@user_id, @acct_credit, 'edu_2025_10', @cat_education, -29.99, '2025-10-08', 'Kumon', 'Math Tutoring', FALSE, FALSE),
(@user_id, @acct_credit, 'edu_2025_11', @cat_education, -29.99, '2025-11-08', 'Kumon', 'Math Tutoring', FALSE, FALSE),
(@user_id, @acct_credit, 'edu_2025_12', @cat_education, -29.99, '2025-12-08', 'Kumon', 'Math Tutoring', FALSE, FALSE),
(@user_id, @acct_credit, 'edu_2026_01', @cat_education, -29.99, '2026-01-08', 'Kumon', 'Math Tutoring', FALSE, FALSE),
(@user_id, @acct_credit, 'edu_2026_02', @cat_education, -29.99, '2026-02-03', 'Kumon', 'Math Tutoring', FALSE, FALSE);

-- TRANSPORTATION (Car Maintenance)
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_credit, 'car_maint_2025_09', @cat_transportation, -65.00, '2025-09-22', 'Jiffy Lube', 'Oil Change', FALSE, FALSE),
(@user_id, @acct_credit, 'car_maint_2025_10', @cat_transportation, -42.00, '2025-10-28', 'Discount Tire', 'Tire Rotation', FALSE, FALSE),
(@user_id, @acct_credit, 'car_maint_2025_11', @cat_transportation, -245.00, '2025-11-15', 'Firestone', 'Brake Service', FALSE, FALSE),
(@user_id, @acct_credit, 'car_maint_2025_12', @cat_transportation, -65.00, '2025-12-28', 'Jiffy Lube', 'Oil Change', FALSE, FALSE),
(@user_id, @acct_credit, 'car_maint_2026_01', @cat_transportation, -580.00, '2026-01-25', 'Discount Tire', 'New Tires x4', FALSE, FALSE);

-- MISCELLANEOUS INCOME
INSERT INTO transactions (user_id, plaid_account_id, plaid_transaction_id, category_id, amount, date, merchant_name, description, pending, is_manual) VALUES
(@user_id, @acct_checking, 'income_2025_10', @cat_other_income, 250.00, '2025-10-15', 'Facebook Marketplace', 'Sold Old Furniture', FALSE, FALSE),
(@user_id, @acct_checking, 'income_2025_12', @cat_other_income, 150.00, '2025-12-25', 'Gift', 'Christmas Money from Grandparents', FALSE, FALSE),
(@user_id, @acct_checking, 'income_2026_01', @cat_other_income, 75.00, '2026-01-05', 'Ebay', 'Sold Old Electronics', FALSE, FALSE);

-- Summary of what was inserted
SELECT 'Categories created' as Item, COUNT(*) as Count FROM categories WHERE user_id = @user_id
UNION ALL
SELECT 'Plaid Items created', COUNT(*) FROM plaid_items WHERE user_id = @user_id
UNION ALL
SELECT 'Plaid Accounts created', COUNT(*) FROM plaid_accounts WHERE plaid_item_id = @plaid_item_id
UNION ALL
SELECT 'Transactions created', COUNT(*) FROM transactions WHERE user_id = @user_id;
