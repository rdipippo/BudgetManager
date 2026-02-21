#!/usr/bin/env python3
"""
Seed one year of realistic transactions for a family of four.
Accounts: Checking (1), Savings (2), Credit Card (4)
User: 1
Date range: 2025-02-19 to 2026-02-18
Plaid convention: positive = money out (expense), negative = money in (income/credit)
"""

import mysql.connector
import random
import uuid
import calendar
from datetime import date, timedelta

random.seed(42)

conn = mysql.connector.connect(host='localhost', user='root', password='M@Gius18', database='budget_manager')
cur = conn.cursor()

USER_ID       = 1
CHECKING      = 1
SAVINGS       = 2
CREDIT_CARD   = 4

# Category IDs for user 1
C_INCOME      = 1
C_HOUSING     = 2
C_TRANSPORT   = 3
C_FOOD        = 4
C_UTILITIES   = 5
C_HEALTHCARE  = 6
C_ENTERTAIN   = 7
C_SHOPPING    = 8
C_PERSONAL    = 9
C_EDUCATION   = 10
C_SUBS        = 11
C_OTHER       = 12

START = date(2025, 2, 19)
END   = date(2026, 2, 18)

txns = []

def uid():
    return 'gen_' + uuid.uuid4().hex[:24]

def j(amount, pct=0.08):
    """Add realistic jitter to an amount."""
    return round(amount * (1 + random.uniform(-pct, pct)), 2)

def add(account, category, amount, d, merchant, desc=None, plaid_cat=None):
    txns.append((
        USER_ID, account, uid(), category,
        round(float(amount), 2), d,
        merchant, desc or merchant, plaid_cat, 0, 0
    ))

def rand_date(year, month, lo=1, hi=None):
    hi = hi or calendar.monthrange(year, month)[1]
    lo = max(1, lo)
    hi = min(hi, calendar.monthrange(year, month)[1])
    return date(year, month, random.randint(lo, hi))

def in_range(d):
    return START <= d <= END

# ─── Iterate month by month ─────────────────────────────────────────────────

cur_month = date(START.year, START.month, 1)
while cur_month <= END:
    y, m = cur_month.year, cur_month.month
    last = calendar.monthrange(y, m)[1]

    # Helpers to pick valid dates within window
    def rd(lo=1, hi=None):
        hi = hi or last
        d = date(y, m, max(1, min(random.randint(lo, hi), last)))
        return d if in_range(d) else None

    # ── CHECKING ─────────────────────────────────────────────────────────────

    # Bi-weekly payroll: ~1st and ~15th
    for pay_day in [1, 15]:
        d = date(y, m, pay_day)
        if in_range(d):
            add(CHECKING, C_INCOME, -j(4520, 0.015), d,
                'Employer Direct Deposit', 'Payroll Direct Deposit', 'Payroll')

    # Mortgage (1st)
    d = date(y, m, 1)
    if in_range(d):
        add(CHECKING, C_HOUSING, j(2248, 0.005), d,
            'Chase Mortgage', 'Mortgage Payment', 'Mortgage')

    # Monthly credit card payment (28th or last)
    d = date(y, m, min(28, last))
    if in_range(d):
        add(CHECKING, C_OTHER, j(2400, 0.15), d,
            'Chase Credit Card Payment', 'Credit Card Payment', 'Credit Card Payment')

    # Car insurance (15th)
    d = date(y, m, 15)
    if in_range(d):
        add(CHECKING, C_TRANSPORT, j(187, 0.01), d,
            'State Farm', 'Auto Insurance Premium', 'Insurance')

    # Electric bill
    d = rd(5, 10)
    if d:
        elec = j(225, 0.15) if m in (12, 1, 2, 7, 8) else j(148, 0.12)
        add(CHECKING, C_UTILITIES, elec, d, 'Con Edison', 'Electric Bill', 'Utilities')

    # Gas/heating
    d = rd(10, 15)
    if d:
        gas_b = j(195, 0.2) if m in (11, 12, 1, 2, 3) else j(42, 0.2)
        add(CHECKING, C_UTILITIES, gas_b, d, 'National Gas Co', 'Gas & Heating', 'Utilities')

    # Internet
    d = rd(8, 12)
    if d:
        add(CHECKING, C_UTILITIES, 79.99, d, 'Comcast Xfinity', 'Internet Service', 'Utilities')

    # Water/sewer (every other month roughly)
    if m % 2 == 0:
        d = rd(15, 25)
        if d:
            add(CHECKING, C_UTILITIES, j(72, 0.1), d, 'City Water Authority', 'Water & Sewer', 'Utilities')

    # Cell phone family plan
    d = rd(18, 22)
    if d:
        add(CHECKING, C_UTILITIES, 185.00, d, 'Verizon Wireless', 'Family Cell Plan', 'Utilities')

    # Transfer to savings
    d = rd(1, 5)
    if d:
        transfer = j(650, 0.1)
        add(CHECKING, C_OTHER,  transfer, d, 'Online Transfer', 'Transfer to Savings', 'Transfer')
        add(SAVINGS,  C_INCOME, -transfer, d, 'Online Transfer', 'Transfer from Checking', 'Transfer')

    # ── SAVINGS ───────────────────────────────────────────────────────────────

    # Monthly interest (last day)
    d = date(y, m, last)
    if in_range(d):
        add(SAVINGS, C_INCOME, -round(random.uniform(4.20, 9.80), 2), d,
            'Tartan Bank', 'Interest Credit', 'Interest')

    # Occasional large withdrawal (vacation / emergency fund draw)
    if m in (6, 11):
        d = rd(10, 20)
        if d:
            add(SAVINGS, C_OTHER, j(1200, 0.25), d,
                'Online Transfer', 'Withdrawal to Checking', 'Transfer')

    # ── CREDIT CARD ───────────────────────────────────────────────────────────

    # Credit card payment received
    d = date(y, m, min(28, last))
    if in_range(d):
        add(CREDIT_CARD, C_OTHER, -j(2400, 0.15), d,
            'Chase Credit Card Payment', 'Payment - Thank You', 'Credit Card Payment')

    # --- Groceries: 2–3x per week ---
    days_in_window = min(last, END.day if (y == END.year and m == END.month) else last) - \
                     (START.day if (y == START.year and m == START.month) else 1) + 1
    num_grocery = max(1, round(days_in_window / 7 * 2.3))
    used = set()
    grocery_stores = [
        ('Whole Foods Market', 160), ("Trader Joe's", 120), ('Kroger', 130),
        ('Safeway', 125), ('Costco', 210), ('Target', 115), ("Sam's Club", 185),
    ]
    for _ in range(num_grocery):
        d = rd()
        if d and d not in used:
            used.add(d)
            store, base = random.choice(grocery_stores)
            add(CREDIT_CARD, C_FOOD, j(base, 0.22), d, store, 'Grocery Shopping', 'Groceries')

    # --- Restaurants: 8–12x per month ---
    restaurants = [
        ('Chipotle Mexican Grill', 32), ("McDonald's", 24), ('Panera Bread', 42),
        ('Chick-fil-A', 28), ('Olive Garden', 78), ("Chili's Grill & Bar", 68),
        ('Buffalo Wild Wings', 72), ('Pizza Hut', 38), ("Domino's Pizza", 32),
        ('Five Guys', 36), ('Shake Shack', 42), ('Starbucks', 22), ('Dunkin', 14),
        ('IHOP', 48), ("Applebee's", 58), ('Red Lobster', 85), ('Cheesecake Factory', 95),
        ('Texas Roadhouse', 74), ('Outback Steakhouse', 82), ("Denny's", 44),
    ]
    for _ in range(random.randint(8, 12)):
        d = rd()
        if d:
            name, base = random.choice(restaurants)
            add(CREDIT_CARD, C_FOOD, j(base, 0.3), d, name, 'Dining Out', 'Food and Drink')

    # --- Gas: 2–3 fill-ups per month ---
    gas_stations = ['Shell', 'BP', 'ExxonMobil', 'Chevron', 'Marathon Gas', 'Sunoco', 'Speedway']
    for _ in range(random.randint(2, 3)):
        d = rd()
        if d:
            add(CREDIT_CARD, C_TRANSPORT, j(68, 0.2), d, random.choice(gas_stations),
                'Gas Station', 'Gas Stations')

    # --- Subscriptions (fixed monthly) ---
    subs = [
        (3,  15.99, 'Netflix',          'Streaming Subscription'),
        (6,  14.99, 'Spotify',          'Music Streaming'),
        (10, 14.99, 'Amazon Prime',     'Prime Membership'),
        (12, 13.99, 'Disney+',          'Streaming Subscription'),
        (18, 64.99, 'Planet Fitness',   'Gym Membership'),
        (22,  9.99, 'Apple iCloud+',    'Cloud Storage'),
        (25, 17.99, 'Hulu',             'Streaming Subscription'),
        (28,  4.99, 'Google One',       'Cloud Storage'),
    ]
    for day, price, merchant, desc in subs:
        d = date(y, m, min(day, last))
        if in_range(d):
            add(CREDIT_CARD, C_SUBS, price, d, merchant, desc, 'Subscription')

    # --- Shopping: 4–8x per month ---
    shops = [
        ('Amazon', 52), ('Target', 78), ('Walmart', 65), ('TJ Maxx', 68),
        ('HomeGoods', 72), ("Kohl's", 85), ('Macy\'s', 95), ('Old Navy', 74),
        ('Gap', 82), ('Best Buy', 145), ('Home Depot', 112), ("Lowe's", 98),
        ('PetSmart', 62), ('IKEA', 155), ('Bath & Body Works', 42),
    ]
    for _ in range(random.randint(4, 8)):
        d = rd()
        if d:
            name, base = random.choice(shops)
            add(CREDIT_CARD, C_SHOPPING, j(base, 0.45), d, name, 'Shopping', 'Shopping')

    # --- Entertainment: 3–5x per month ---
    venues = [
        ('AMC Theaters', 58), ('Regal Cinemas', 54), ('Dave & Busters', 85),
        ('Main Event', 95), ('Round1 Bowling', 48), ('Topgolf', 110),
        ('Mini Golf', 38), ('Trampoline Park', 72), ('Chuck E Cheese', 65),
        ('Escape Room', 88), ('Laser Tag', 52), ('Putt Putt Golf', 36),
    ]
    for _ in range(random.randint(3, 5)):
        d = rd()
        if d:
            name, base = random.choice(venues)
            add(CREDIT_CARD, C_ENTERTAIN, j(base, 0.35), d, name, 'Entertainment', 'Entertainment')

    # --- Personal Care: 2–4x per month ---
    care = [
        ('Great Clips', 64),   # family haircuts
        ('Sport Clips', 22),
        ('CVS Pharmacy', 34),
        ('Walgreens', 28),
        ('Ulta Beauty', 58),
        ('Sephora', 72),
        ('Nail Salon', 48),
        ('SuperCuts', 18),
    ]
    for _ in range(random.randint(2, 4)):
        d = rd()
        if d:
            name, base = random.choice(care)
            add(CREDIT_CARD, C_PERSONAL, j(base, 0.25), d, name, 'Personal Care', 'Personal Care')

    # --- Healthcare: sporadic ---
    if random.random() < 0.55:
        d = rd()
        if d:
            provider = random.choice([
                ('CVS Pharmacy', 35), ('Walgreens Pharmacy', 28),
                ('Pediatric Associates', 45), ('Family Practice MD', 55),
                ('Urgent Care Center', 125), ('Quest Diagnostics', 48),
                ('Eye Care Associates', 145), ('Orthodontics Associates', 220),
            ])
            add(CREDIT_CARD, C_HEALTHCARE, j(provider[1], 0.3), d, provider[0], 'Healthcare', 'Healthcare')

    # Dental visits (twice a year)
    if m in (3, 9):
        d = rd(5, 25)
        if d:
            add(CREDIT_CARD, C_HEALTHCARE, j(185, 0.2), d,
                'Bright Now! Dental', 'Dental Cleaning x2', 'Dental')

    # --- Education ---
    # Back-to-school shopping in Aug
    if m == 8:
        for _ in range(3):
            d = rd()
            if d:
                store = random.choice(['Staples', 'Office Depot', 'Target', 'Walmart', 'Amazon'])
                add(CREDIT_CARD, C_EDUCATION, j(88, 0.4), d, store, 'Back to School Supplies', 'Education')

    # Kids activities during school year
    if m in (9, 10, 11, 12, 1, 2, 3, 4, 5):
        if random.random() < 0.65:
            d = rd()
            if d:
                activity = random.choice([
                    'Youth Soccer League', 'Piano Lessons', 'Dance Studio',
                    'Swim Academy', 'Little League Registration', 'Karate Dojo',
                    'Art Classes', 'STEM Camp',
                ])
                add(CREDIT_CARD, C_EDUCATION, j(68, 0.2), d, activity, 'Kids Activities', 'Education')

    # Summer camp (June, July)
    if m in (6, 7):
        d = rd(1, 5)
        if d:
            add(CREDIT_CARD, C_EDUCATION, j(480, 0.15), d,
                'Summer Day Camp', 'Summer Camp', 'Education')

    # Advance to next month
    if m == 12:
        cur_month = date(y + 1, 1, 1)
    else:
        cur_month = date(y, m + 1, 1)

# ─── Insert ──────────────────────────────────────────────────────────────────

sql = """
INSERT INTO transactions
  (user_id, plaid_account_id, plaid_transaction_id, category_id,
   amount, date, merchant_name, description, plaid_category, pending, is_manual)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""

cur.executemany(sql, txns)
conn.commit()
print(f"Inserted {cur.rowcount} transactions")

# Quick summary
cur.execute("""
    SELECT pa.name, COUNT(*) as count, SUM(t.amount) as total
    FROM transactions t
    JOIN plaid_accounts pa ON pa.id = t.plaid_account_id
    WHERE t.user_id = %s AND t.is_manual = 0
    GROUP BY pa.name
    ORDER BY pa.name
""", (USER_ID,))
print("\nSummary by account:")
for row in cur.fetchall():
    print(f"  {row[0]:<25} {row[1]:>4} txns   net ${float(row[2]):>10,.2f}")

cur.close()
conn.close()
