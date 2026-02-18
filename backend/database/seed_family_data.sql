-- Seed data: 6 months of financial transactions for a typical family of four
-- Run this after setting up the schema

USE budget_manager;

-- Create a demo user (password is 'Demo123!' hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name, email_verified, role)
VALUES ('demo@family.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.6WxS1cY2cPvKXO', 'John', 'Smith', TRUE, 'user')
ON DUPLICATE KEY UPDATE email = email;

SET @user_id = (SELECT id FROM users WHERE email = 'demo@family.com');

-- Create default categories for the user if they don't exist
INSERT IGNORE INTO categories (user_id, name, color, icon, is_system, is_income) VALUES
(@user_id, 'Income', '#10B981', 'dollar-sign', TRUE, TRUE),
(@user_id, 'Housing', '#4F46E5', 'home', TRUE, FALSE),
(@user_id, 'Transportation', '#F59E0B', 'car', TRUE, FALSE),
(@user_id, 'Food & Dining', '#EF4444', 'utensils', TRUE, FALSE),
(@user_id, 'Utilities', '#6366F1', 'zap', TRUE, FALSE),
(@user_id, 'Healthcare', '#EC4899', 'heart', TRUE, FALSE),
(@user_id, 'Entertainment', '#8B5CF6', 'film', TRUE, FALSE),
(@user_id, 'Shopping', '#14B8A6', 'shopping-bag', TRUE, FALSE),
(@user_id, 'Personal Care', '#F97316', 'user', TRUE, FALSE),
(@user_id, 'Education', '#0EA5E9', 'book', TRUE, FALSE),
(@user_id, 'Subscriptions', '#84CC16', 'credit-card', TRUE, FALSE),
(@user_id, 'Other', '#6B7280', 'more-horizontal', TRUE, FALSE);

-- Get category IDs
SET @cat_income = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Income');
SET @cat_housing = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Housing');
SET @cat_transport = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Transportation');
SET @cat_food = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Food & Dining');
SET @cat_utilities = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Utilities');
SET @cat_health = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Healthcare');
SET @cat_entertainment = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Entertainment');
SET @cat_shopping = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Shopping');
SET @cat_personal = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Personal Care');
SET @cat_education = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Education');
SET @cat_subscriptions = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Subscriptions');
SET @cat_other = (SELECT id FROM categories WHERE user_id = @user_id AND name = 'Other');

-- Clear existing transactions for this user
DELETE FROM transactions WHERE user_id = @user_id;

-- ============================================
-- MONTH 1: August 2025
-- ============================================

-- Income
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_income, 4250.00, '2025-08-01', 'Acme Corporation', 'Salary - John', TRUE),
(@user_id, @cat_income, 3850.00, '2025-08-01', 'TechStart Inc', 'Salary - Sarah', TRUE),
(@user_id, @cat_income, 125.00, '2025-08-15', 'Bank Interest', 'Savings interest', TRUE);

-- Housing
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_housing, -2150.00, '2025-08-01', 'First National Bank', 'Mortgage payment', TRUE),
(@user_id, @cat_housing, -125.00, '2025-08-05', 'State Farm', 'Home insurance', TRUE);

-- Transportation
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_transport, -385.00, '2025-08-03', 'Toyota Financial', 'Car payment - Camry', TRUE),
(@user_id, @cat_transport, -52.40, '2025-08-05', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -48.75, '2025-08-12', 'Chevron', 'Gas', TRUE),
(@user_id, @cat_transport, -55.20, '2025-08-19', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -51.80, '2025-08-26', 'Exxon', 'Gas', TRUE),
(@user_id, @cat_transport, -145.00, '2025-08-15', 'Geico', 'Auto insurance', TRUE);

-- Food & Dining
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_food, -187.45, '2025-08-02', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -156.32, '2025-08-09', 'Whole Foods', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -142.87, '2025-08-16', 'Trader Joes', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -168.54, '2025-08-23', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -95.20, '2025-08-30', 'Safeway', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -65.40, '2025-08-08', 'Olive Garden', 'Family dinner', TRUE),
(@user_id, @cat_food, -42.15, '2025-08-14', 'Chipotle', 'Lunch', TRUE),
(@user_id, @cat_food, -78.90, '2025-08-22', 'Red Lobster', 'Anniversary dinner', TRUE),
(@user_id, @cat_food, -28.50, '2025-08-28', 'Starbucks', 'Coffee runs', TRUE);

-- Utilities
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_utilities, -185.40, '2025-08-10', 'Pacific Gas & Electric', 'Electric bill', TRUE),
(@user_id, @cat_utilities, -68.50, '2025-08-12', 'City Water Dept', 'Water bill', TRUE),
(@user_id, @cat_utilities, -89.99, '2025-08-15', 'Comcast', 'Internet', TRUE),
(@user_id, @cat_utilities, -45.00, '2025-08-18', 'Waste Management', 'Trash service', TRUE);

-- Healthcare
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_health, -350.00, '2025-08-01', 'Blue Cross Blue Shield', 'Health insurance premium', TRUE),
(@user_id, @cat_health, -35.00, '2025-08-08', 'CVS Pharmacy', 'Prescriptions', TRUE),
(@user_id, @cat_health, -25.00, '2025-08-20', 'Dr. Martinez Pediatrics', 'Kids checkup copay', TRUE);

-- Entertainment
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_entertainment, -62.50, '2025-08-10', 'AMC Theaters', 'Family movie night', TRUE),
(@user_id, @cat_entertainment, -45.00, '2025-08-17', 'Chuck E Cheese', 'Kids birthday party', TRUE),
(@user_id, @cat_entertainment, -28.99, '2025-08-24', 'Barnes & Noble', 'Books', TRUE);

-- Shopping
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_shopping, -285.60, '2025-08-05', 'Target', 'Back to school supplies', TRUE),
(@user_id, @cat_shopping, -156.40, '2025-08-12', 'Old Navy', 'Kids clothes', TRUE),
(@user_id, @cat_shopping, -89.99, '2025-08-19', 'Amazon', 'Household items', TRUE);

-- Personal Care
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_personal, -45.00, '2025-08-07', 'Great Clips', 'Haircuts', TRUE),
(@user_id, @cat_personal, -32.50, '2025-08-21', 'Ulta Beauty', 'Personal care items', TRUE);

-- Education
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_education, -150.00, '2025-08-15', 'YMCA', 'Swim lessons - monthly', TRUE),
(@user_id, @cat_education, -85.00, '2025-08-20', 'Music Academy', 'Piano lessons', TRUE);

-- Subscriptions
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_subscriptions, -15.99, '2025-08-01', 'Netflix', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-08-01', 'Disney+', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -10.99, '2025-08-01', 'Spotify Family', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-08-01', 'Amazon Prime', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -12.99, '2025-08-15', 'iCloud Storage', 'Monthly subscription', TRUE);

-- ============================================
-- MONTH 2: September 2025
-- ============================================

-- Income
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_income, 4250.00, '2025-09-01', 'Acme Corporation', 'Salary - John', TRUE),
(@user_id, @cat_income, 3850.00, '2025-09-01', 'TechStart Inc', 'Salary - Sarah', TRUE),
(@user_id, @cat_income, 118.50, '2025-09-15', 'Bank Interest', 'Savings interest', TRUE);

-- Housing
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_housing, -2150.00, '2025-09-01', 'First National Bank', 'Mortgage payment', TRUE);

-- Transportation
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_transport, -385.00, '2025-09-03', 'Toyota Financial', 'Car payment - Camry', TRUE),
(@user_id, @cat_transport, -49.85, '2025-09-04', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -52.10, '2025-09-11', 'Chevron', 'Gas', TRUE),
(@user_id, @cat_transport, -48.95, '2025-09-18', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -54.30, '2025-09-25', 'BP', 'Gas', TRUE),
(@user_id, @cat_transport, -145.00, '2025-09-15', 'Geico', 'Auto insurance', TRUE),
(@user_id, @cat_transport, -89.50, '2025-09-20', 'Jiffy Lube', 'Oil change', TRUE);

-- Food & Dining
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_food, -172.35, '2025-09-01', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -145.80, '2025-09-08', 'Whole Foods', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -158.42, '2025-09-15', 'Trader Joes', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -189.25, '2025-09-22', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -112.60, '2025-09-29', 'Safeway', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -55.80, '2025-09-06', 'Applebees', 'Family dinner', TRUE),
(@user_id, @cat_food, -38.45, '2025-09-13', 'Panera Bread', 'Lunch', TRUE),
(@user_id, @cat_food, -22.75, '2025-09-20', 'Starbucks', 'Coffee runs', TRUE);

-- Utilities
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_utilities, -165.80, '2025-09-10', 'Pacific Gas & Electric', 'Electric bill', TRUE),
(@user_id, @cat_utilities, -72.30, '2025-09-12', 'City Water Dept', 'Water bill', TRUE),
(@user_id, @cat_utilities, -89.99, '2025-09-15', 'Comcast', 'Internet', TRUE),
(@user_id, @cat_utilities, -45.00, '2025-09-18', 'Waste Management', 'Trash service', TRUE);

-- Healthcare
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_health, -350.00, '2025-09-01', 'Blue Cross Blue Shield', 'Health insurance premium', TRUE),
(@user_id, @cat_health, -42.50, '2025-09-10', 'CVS Pharmacy', 'Prescriptions', TRUE),
(@user_id, @cat_health, -150.00, '2025-09-22', 'Dr. Lee Dentistry', 'Dental cleaning', TRUE);

-- Entertainment
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_entertainment, -85.00, '2025-09-07', 'Six Flags', 'Family day trip', TRUE),
(@user_id, @cat_entertainment, -55.00, '2025-09-14', 'Bowling Alley', 'Family bowling', TRUE),
(@user_id, @cat_entertainment, -34.99, '2025-09-21', 'GameStop', 'Video game', TRUE);

-- Shopping
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_shopping, -78.45, '2025-09-05', 'Target', 'Household items', TRUE),
(@user_id, @cat_shopping, -125.80, '2025-09-12', 'Kohls', 'Fall clothes', TRUE),
(@user_id, @cat_shopping, -65.99, '2025-09-26', 'Amazon', 'Various items', TRUE);

-- Personal Care
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_personal, -45.00, '2025-09-08', 'Great Clips', 'Haircuts', TRUE),
(@user_id, @cat_personal, -28.75, '2025-09-22', 'Walgreens', 'Personal care', TRUE);

-- Education
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_education, -150.00, '2025-09-15', 'YMCA', 'Swim lessons - monthly', TRUE),
(@user_id, @cat_education, -85.00, '2025-09-20', 'Music Academy', 'Piano lessons', TRUE),
(@user_id, @cat_education, -125.00, '2025-09-08', 'Soccer Club', 'Fall soccer registration', TRUE);

-- Subscriptions
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_subscriptions, -15.99, '2025-09-01', 'Netflix', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-09-01', 'Disney+', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -10.99, '2025-09-01', 'Spotify Family', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-09-01', 'Amazon Prime', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -12.99, '2025-09-15', 'iCloud Storage', 'Monthly subscription', TRUE);

-- ============================================
-- MONTH 3: October 2025
-- ============================================

-- Income
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_income, 4250.00, '2025-10-01', 'Acme Corporation', 'Salary - John', TRUE),
(@user_id, @cat_income, 3850.00, '2025-10-01', 'TechStart Inc', 'Salary - Sarah', TRUE),
(@user_id, @cat_income, 122.75, '2025-10-15', 'Bank Interest', 'Savings interest', TRUE);

-- Housing
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_housing, -2150.00, '2025-10-01', 'First National Bank', 'Mortgage payment', TRUE),
(@user_id, @cat_housing, -125.00, '2025-10-05', 'State Farm', 'Home insurance', TRUE);

-- Transportation
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_transport, -385.00, '2025-10-03', 'Toyota Financial', 'Car payment - Camry', TRUE),
(@user_id, @cat_transport, -51.20, '2025-10-03', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -48.65, '2025-10-10', 'Chevron', 'Gas', TRUE),
(@user_id, @cat_transport, -53.40, '2025-10-17', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -50.85, '2025-10-24', 'Exxon', 'Gas', TRUE),
(@user_id, @cat_transport, -47.90, '2025-10-31', 'BP', 'Gas', TRUE),
(@user_id, @cat_transport, -145.00, '2025-10-15', 'Geico', 'Auto insurance', TRUE);

-- Food & Dining
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_food, -195.40, '2025-10-04', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -168.25, '2025-10-11', 'Whole Foods', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -152.80, '2025-10-18', 'Trader Joes', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -178.65, '2025-10-25', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -72.30, '2025-10-05', 'Chilis', 'Family dinner', TRUE),
(@user_id, @cat_food, -45.80, '2025-10-12', 'Panda Express', 'Takeout', TRUE),
(@user_id, @cat_food, -125.00, '2025-10-31', 'Party City', 'Halloween party supplies', TRUE),
(@user_id, @cat_food, -25.40, '2025-10-19', 'Starbucks', 'Coffee runs', TRUE);

-- Utilities
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_utilities, -142.50, '2025-10-10', 'Pacific Gas & Electric', 'Electric bill', TRUE),
(@user_id, @cat_utilities, -65.80, '2025-10-12', 'City Water Dept', 'Water bill', TRUE),
(@user_id, @cat_utilities, -89.99, '2025-10-15', 'Comcast', 'Internet', TRUE),
(@user_id, @cat_utilities, -45.00, '2025-10-18', 'Waste Management', 'Trash service', TRUE);

-- Healthcare
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_health, -350.00, '2025-10-01', 'Blue Cross Blue Shield', 'Health insurance premium', TRUE),
(@user_id, @cat_health, -28.50, '2025-10-08', 'CVS Pharmacy', 'Prescriptions', TRUE),
(@user_id, @cat_health, -85.00, '2025-10-22', 'Urgent Care', 'Sick visit copay', TRUE);

-- Entertainment
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_entertainment, -48.00, '2025-10-11', 'Pumpkin Patch', 'Family outing', TRUE),
(@user_id, @cat_entertainment, -65.00, '2025-10-18', 'Haunted House', 'Halloween activity', TRUE),
(@user_id, @cat_entertainment, -32.50, '2025-10-25', 'Spirit Halloween', 'Costumes', TRUE);

-- Shopping
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_shopping, -145.80, '2025-10-08', 'Target', 'Fall decorations', TRUE),
(@user_id, @cat_shopping, -89.99, '2025-10-15', 'Amazon', 'Halloween costumes', TRUE),
(@user_id, @cat_shopping, -112.40, '2025-10-22', 'Walmart', 'Various items', TRUE);

-- Personal Care
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_personal, -45.00, '2025-10-10', 'Great Clips', 'Haircuts', TRUE),
(@user_id, @cat_personal, -35.20, '2025-10-24', 'CVS', 'Personal care items', TRUE);

-- Education
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_education, -150.00, '2025-10-15', 'YMCA', 'Swim lessons - monthly', TRUE),
(@user_id, @cat_education, -85.00, '2025-10-20', 'Music Academy', 'Piano lessons', TRUE),
(@user_id, @cat_education, -45.00, '2025-10-12', 'Scholastic', 'Book fair', TRUE);

-- Subscriptions
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_subscriptions, -15.99, '2025-10-01', 'Netflix', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-10-01', 'Disney+', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -10.99, '2025-10-01', 'Spotify Family', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-10-01', 'Amazon Prime', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -12.99, '2025-10-15', 'iCloud Storage', 'Monthly subscription', TRUE);

-- ============================================
-- MONTH 4: November 2025
-- ============================================

-- Income
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_income, 4250.00, '2025-11-01', 'Acme Corporation', 'Salary - John', TRUE),
(@user_id, @cat_income, 3850.00, '2025-11-01', 'TechStart Inc', 'Salary - Sarah', TRUE),
(@user_id, @cat_income, 128.25, '2025-11-15', 'Bank Interest', 'Savings interest', TRUE),
(@user_id, @cat_income, 2500.00, '2025-11-28', 'Acme Corporation', 'Year-end bonus', TRUE);

-- Housing
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_housing, -2150.00, '2025-11-01', 'First National Bank', 'Mortgage payment', TRUE);

-- Transportation
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_transport, -385.00, '2025-11-03', 'Toyota Financial', 'Car payment - Camry', TRUE),
(@user_id, @cat_transport, -52.80, '2025-11-02', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -49.45, '2025-11-09', 'Chevron', 'Gas', TRUE),
(@user_id, @cat_transport, -55.60, '2025-11-16', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -58.20, '2025-11-23', 'Exxon', 'Gas - Thanksgiving travel', TRUE),
(@user_id, @cat_transport, -52.40, '2025-11-30', 'BP', 'Gas', TRUE),
(@user_id, @cat_transport, -145.00, '2025-11-15', 'Geico', 'Auto insurance', TRUE);

-- Food & Dining
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_food, -165.80, '2025-11-01', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -182.45, '2025-11-08', 'Whole Foods', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -145.30, '2025-11-15', 'Trader Joes', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -285.60, '2025-11-22', 'Costco', 'Thanksgiving groceries', TRUE),
(@user_id, @cat_food, -98.75, '2025-11-29', 'Safeway', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -58.40, '2025-11-07', 'TGIF', 'Family dinner', TRUE),
(@user_id, @cat_food, -35.80, '2025-11-14', 'Subway', 'Lunch', TRUE),
(@user_id, @cat_food, -24.50, '2025-11-21', 'Starbucks', 'Coffee runs', TRUE);

-- Utilities
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_utilities, -158.90, '2025-11-10', 'Pacific Gas & Electric', 'Electric bill', TRUE),
(@user_id, @cat_utilities, -62.40, '2025-11-12', 'City Water Dept', 'Water bill', TRUE),
(@user_id, @cat_utilities, -89.99, '2025-11-15', 'Comcast', 'Internet', TRUE),
(@user_id, @cat_utilities, -45.00, '2025-11-18', 'Waste Management', 'Trash service', TRUE),
(@user_id, @cat_utilities, -125.00, '2025-11-20', 'Gas Company', 'Heating - winter', TRUE);

-- Healthcare
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_health, -350.00, '2025-11-01', 'Blue Cross Blue Shield', 'Health insurance premium', TRUE),
(@user_id, @cat_health, -38.75, '2025-11-10', 'CVS Pharmacy', 'Prescriptions', TRUE),
(@user_id, @cat_health, -45.00, '2025-11-18', 'Dr. Martinez Pediatrics', 'Flu shots', TRUE);

-- Entertainment
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_entertainment, -48.50, '2025-11-08', 'AMC Theaters', 'Family movie', TRUE),
(@user_id, @cat_entertainment, -75.00, '2025-11-15', 'Escape Room', 'Family activity', TRUE),
(@user_id, @cat_entertainment, -42.99, '2025-11-22', 'Board Game Store', 'Thanksgiving games', TRUE);

-- Shopping - Black Friday deals
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_shopping, -89.99, '2025-11-05', 'Target', 'Household items', TRUE),
(@user_id, @cat_shopping, -245.80, '2025-11-28', 'Best Buy', 'Black Friday - electronics', TRUE),
(@user_id, @cat_shopping, -178.45, '2025-11-28', 'Amazon', 'Black Friday deals', TRUE),
(@user_id, @cat_shopping, -156.30, '2025-11-29', 'Kohls', 'Black Friday - clothes', TRUE);

-- Personal Care
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_personal, -45.00, '2025-11-09', 'Great Clips', 'Haircuts', TRUE),
(@user_id, @cat_personal, -42.80, '2025-11-23', 'Sephora', 'Personal care', TRUE);

-- Education
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_education, -150.00, '2025-11-15', 'YMCA', 'Swim lessons - monthly', TRUE),
(@user_id, @cat_education, -85.00, '2025-11-20', 'Music Academy', 'Piano lessons', TRUE);

-- Subscriptions
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_subscriptions, -15.99, '2025-11-01', 'Netflix', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-11-01', 'Disney+', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -10.99, '2025-11-01', 'Spotify Family', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-11-01', 'Amazon Prime', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -12.99, '2025-11-15', 'iCloud Storage', 'Monthly subscription', TRUE);

-- ============================================
-- MONTH 5: December 2025
-- ============================================

-- Income
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_income, 4250.00, '2025-12-01', 'Acme Corporation', 'Salary - John', TRUE),
(@user_id, @cat_income, 3850.00, '2025-12-01', 'TechStart Inc', 'Salary - Sarah', TRUE),
(@user_id, @cat_income, 135.50, '2025-12-15', 'Bank Interest', 'Savings interest', TRUE);

-- Housing
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_housing, -2150.00, '2025-12-01', 'First National Bank', 'Mortgage payment', TRUE),
(@user_id, @cat_housing, -125.00, '2025-12-05', 'State Farm', 'Home insurance', TRUE);

-- Transportation
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_transport, -385.00, '2025-12-03', 'Toyota Financial', 'Car payment - Camry', TRUE),
(@user_id, @cat_transport, -48.90, '2025-12-02', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -52.35, '2025-12-09', 'Chevron', 'Gas', TRUE),
(@user_id, @cat_transport, -55.80, '2025-12-16', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -62.45, '2025-12-23', 'Exxon', 'Gas - Holiday travel', TRUE),
(@user_id, @cat_transport, -48.70, '2025-12-30', 'BP', 'Gas', TRUE),
(@user_id, @cat_transport, -145.00, '2025-12-15', 'Geico', 'Auto insurance', TRUE),
(@user_id, @cat_transport, -485.00, '2025-12-18', 'Discount Tire', 'Winter tires', TRUE);

-- Food & Dining
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_food, -178.45, '2025-12-01', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -165.20, '2025-12-08', 'Whole Foods', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -192.80, '2025-12-15', 'Trader Joes', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -265.40, '2025-12-22', 'Costco', 'Holiday groceries', TRUE),
(@user_id, @cat_food, -125.60, '2025-12-29', 'Safeway', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -95.00, '2025-12-06', 'Olive Garden', 'Holiday dinner out', TRUE),
(@user_id, @cat_food, -48.50, '2025-12-13', 'Cheesecake Factory', 'Family lunch', TRUE),
(@user_id, @cat_food, -32.80, '2025-12-20', 'Starbucks', 'Holiday drinks', TRUE);

-- Utilities
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_utilities, -195.40, '2025-12-10', 'Pacific Gas & Electric', 'Electric bill - holiday lights', TRUE),
(@user_id, @cat_utilities, -58.90, '2025-12-12', 'City Water Dept', 'Water bill', TRUE),
(@user_id, @cat_utilities, -89.99, '2025-12-15', 'Comcast', 'Internet', TRUE),
(@user_id, @cat_utilities, -45.00, '2025-12-18', 'Waste Management', 'Trash service', TRUE),
(@user_id, @cat_utilities, -165.00, '2025-12-20', 'Gas Company', 'Heating - winter', TRUE);

-- Healthcare
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_health, -350.00, '2025-12-01', 'Blue Cross Blue Shield', 'Health insurance premium', TRUE),
(@user_id, @cat_health, -32.40, '2025-12-08', 'CVS Pharmacy', 'Prescriptions', TRUE);

-- Entertainment
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_entertainment, -85.00, '2025-12-07', 'Ice Skating Rink', 'Family ice skating', TRUE),
(@user_id, @cat_entertainment, -65.00, '2025-12-14', 'Nutcracker Ballet', 'Holiday show', TRUE),
(@user_id, @cat_entertainment, -48.50, '2025-12-21', 'AMC Theaters', 'Holiday movie', TRUE);

-- Shopping - Holiday shopping
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_shopping, -325.80, '2025-12-05', 'Amazon', 'Holiday gifts', TRUE),
(@user_id, @cat_shopping, -245.60, '2025-12-10', 'Target', 'Holiday gifts', TRUE),
(@user_id, @cat_shopping, -189.99, '2025-12-12', 'Best Buy', 'Electronics gift', TRUE),
(@user_id, @cat_shopping, -156.40, '2025-12-15', 'Nordstrom', 'Clothing gifts', TRUE),
(@user_id, @cat_shopping, -85.00, '2025-12-18', 'Hallmark', 'Cards & decorations', TRUE),
(@user_id, @cat_shopping, -125.50, '2025-12-20', 'Toys R Us', 'Kids gifts', TRUE);

-- Personal Care
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_personal, -55.00, '2025-12-10', 'Hair Salon', 'Holiday haircuts', TRUE),
(@user_id, @cat_personal, -45.80, '2025-12-22', 'Bath & Body Works', 'Holiday products', TRUE);

-- Education
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_education, -150.00, '2025-12-15', 'YMCA', 'Swim lessons - monthly', TRUE),
(@user_id, @cat_education, -85.00, '2025-12-20', 'Music Academy', 'Piano lessons', TRUE);

-- Subscriptions
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_subscriptions, -15.99, '2025-12-01', 'Netflix', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-12-01', 'Disney+', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -10.99, '2025-12-01', 'Spotify Family', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2025-12-01', 'Amazon Prime', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -12.99, '2025-12-15', 'iCloud Storage', 'Monthly subscription', TRUE);

-- Other
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_other, -150.00, '2025-12-24', 'Charitable Giving', 'Holiday donations', TRUE);

-- ============================================
-- MONTH 6: January 2026
-- ============================================

-- Income
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_income, 4350.00, '2026-01-01', 'Acme Corporation', 'Salary - John (raise)', TRUE),
(@user_id, @cat_income, 3950.00, '2026-01-01', 'TechStart Inc', 'Salary - Sarah (raise)', TRUE),
(@user_id, @cat_income, 142.75, '2026-01-15', 'Bank Interest', 'Savings interest', TRUE);

-- Housing
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_housing, -2150.00, '2026-01-01', 'First National Bank', 'Mortgage payment', TRUE);

-- Transportation
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_transport, -385.00, '2026-01-03', 'Toyota Financial', 'Car payment - Camry', TRUE),
(@user_id, @cat_transport, -49.80, '2026-01-04', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -52.45, '2026-01-11', 'Chevron', 'Gas', TRUE),
(@user_id, @cat_transport, -48.90, '2026-01-18', 'Shell', 'Gas', TRUE),
(@user_id, @cat_transport, -54.20, '2026-01-25', 'Exxon', 'Gas', TRUE),
(@user_id, @cat_transport, -145.00, '2026-01-15', 'Geico', 'Auto insurance', TRUE),
(@user_id, @cat_transport, -75.00, '2026-01-08', 'DMV', 'Vehicle registration', TRUE);

-- Food & Dining
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_food, -158.90, '2026-01-04', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -142.35, '2026-01-11', 'Whole Foods', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -165.80, '2026-01-18', 'Trader Joes', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -172.45, '2026-01-25', 'Costco', 'Weekly groceries', TRUE),
(@user_id, @cat_food, -52.40, '2026-01-10', 'Applebees', 'Family dinner', TRUE),
(@user_id, @cat_food, -38.75, '2026-01-17', 'Panera Bread', 'Lunch', TRUE),
(@user_id, @cat_food, -22.90, '2026-01-24', 'Starbucks', 'Coffee runs', TRUE);

-- Utilities
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_utilities, -185.60, '2026-01-10', 'Pacific Gas & Electric', 'Electric bill', TRUE),
(@user_id, @cat_utilities, -55.40, '2026-01-12', 'City Water Dept', 'Water bill', TRUE),
(@user_id, @cat_utilities, -89.99, '2026-01-15', 'Comcast', 'Internet', TRUE),
(@user_id, @cat_utilities, -45.00, '2026-01-18', 'Waste Management', 'Trash service', TRUE),
(@user_id, @cat_utilities, -178.50, '2026-01-20', 'Gas Company', 'Heating - winter', TRUE);

-- Healthcare
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_health, -365.00, '2026-01-01', 'Blue Cross Blue Shield', 'Health insurance premium (new year)', TRUE),
(@user_id, @cat_health, -42.80, '2026-01-08', 'CVS Pharmacy', 'Prescriptions', TRUE),
(@user_id, @cat_health, -150.00, '2026-01-22', 'Dr. Lee Dentistry', 'Dental cleaning', TRUE);

-- Entertainment
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_entertainment, -55.00, '2026-01-11', 'AMC Theaters', 'Family movie', TRUE),
(@user_id, @cat_entertainment, -42.00, '2026-01-18', 'Bowling Alley', 'Family bowling', TRUE);

-- Shopping - Post-holiday sales
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_shopping, -125.40, '2026-01-02', 'Target', 'Post-holiday clearance', TRUE),
(@user_id, @cat_shopping, -89.99, '2026-01-08', 'Amazon', 'Household items', TRUE),
(@user_id, @cat_shopping, -78.50, '2026-01-20', 'Kohls', 'Winter clothes sale', TRUE);

-- Personal Care
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_personal, -45.00, '2026-01-12', 'Great Clips', 'Haircuts', TRUE),
(@user_id, @cat_personal, -65.00, '2026-01-25', 'Gym', 'New year gym membership', TRUE);

-- Education
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_education, -150.00, '2026-01-15', 'YMCA', 'Swim lessons - monthly', TRUE),
(@user_id, @cat_education, -85.00, '2026-01-20', 'Music Academy', 'Piano lessons', TRUE),
(@user_id, @cat_education, -135.00, '2026-01-10', 'Basketball League', 'Winter basketball registration', TRUE);

-- Subscriptions
INSERT INTO transactions (user_id, category_id, amount, date, merchant_name, description, is_manual) VALUES
(@user_id, @cat_subscriptions, -15.99, '2026-01-01', 'Netflix', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2026-01-01', 'Disney+', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -10.99, '2026-01-01', 'Spotify Family', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -14.99, '2026-01-01', 'Amazon Prime', 'Monthly subscription', TRUE),
(@user_id, @cat_subscriptions, -12.99, '2026-01-15', 'iCloud Storage', 'Monthly subscription', TRUE);

-- ============================================
-- Create budgets for the user
-- ============================================

DELETE FROM budgets WHERE user_id = @user_id;

INSERT INTO budgets (user_id, category_id, amount, period_type, start_day, is_active) VALUES
(@user_id, @cat_income, 8500.00, 'monthly', 1, TRUE),
(@user_id, @cat_housing, 2300.00, 'monthly', 1, TRUE),
(@user_id, @cat_transport, 900.00, 'monthly', 1, TRUE),
(@user_id, @cat_food, 1200.00, 'monthly', 1, TRUE),
(@user_id, @cat_utilities, 500.00, 'monthly', 1, TRUE),
(@user_id, @cat_health, 450.00, 'monthly', 1, TRUE),
(@user_id, @cat_entertainment, 250.00, 'monthly', 1, TRUE),
(@user_id, @cat_shopping, 400.00, 'monthly', 1, TRUE),
(@user_id, @cat_personal, 150.00, 'monthly', 1, TRUE),
(@user_id, @cat_education, 400.00, 'monthly', 1, TRUE),
(@user_id, @cat_subscriptions, 100.00, 'monthly', 1, TRUE),
(@user_id, @cat_other, 200.00, 'monthly', 1, TRUE);

-- Summary
SELECT 'Data seeded successfully!' AS status;
SELECT COUNT(*) AS total_transactions FROM transactions WHERE user_id = @user_id;
SELECT
  DATE_FORMAT(date, '%Y-%m') AS month,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS expenses,
  SUM(amount) AS net
FROM transactions
WHERE user_id = @user_id
GROUP BY DATE_FORMAT(date, '%Y-%m')
ORDER BY month;
