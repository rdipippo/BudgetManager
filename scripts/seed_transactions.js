#!/usr/bin/env node
/**
 * Seed one year of realistic transactions for a family of four.
 * Accounts: Checking (1), Savings (2), Credit Card (4)  |  User: 1
 * Date range: 2025-02-19 – 2026-02-18
 * Plaid convention: positive = money out (expense), negative = money in
 */

const mysql = require('/root/BudgetManager/backend/node_modules/mysql2/promise');
const crypto = require('crypto');

const CFG = {
  host: 'localhost', user: 'root', password: 'M@Gius18', database: 'budget_manager',
};

const USER_ID = 1, CHECKING = 1, SAVINGS = 2, CC = 4;
const C = { INCOME:1, HOUSING:2, TRANSPORT:3, FOOD:4, UTILITIES:5,
            HEALTHCARE:6, ENTERTAIN:7, SHOPPING:8, PERSONAL:9,
            EDUCATION:10, SUBS:11, OTHER:12 };

const START = new Date('2025-02-19');
const END   = new Date('2026-02-18');

let seed = 42;
function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
function rnd(lo, hi) { return Math.floor(rand() * (hi - lo + 1)) + lo; }
function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
function j(amount, pct = 0.08) { return Math.round(amount * (1 + (rand() - 0.5) * 2 * pct) * 100) / 100; }
function uid() { return 'gen_' + crypto.randomBytes(12).toString('hex'); }

function lastDay(y, m) { return new Date(y, m, 0).getDate(); }  // m is 1-based

function inRange(d) { return d >= START && d <= END; }

function mkDate(y, m, day) {
  const ld = lastDay(y, m);
  return new Date(y, m - 1, Math.max(1, Math.min(day, ld)));
}

function rd(y, m, lo = 1, hi = null) {
  const ld = lastDay(y, m);
  hi = hi || ld;
  const d = mkDate(y, m, rnd(lo, hi));
  return inRange(d) ? d : null;
}

function fmt(d) { return d.toISOString().slice(0, 10); }

const txns = [];
function add(account, cat, amount, d, merchant, desc, plaidCat) {
  if (!d) return;
  txns.push([USER_ID, account, uid(), cat, amount, fmt(d), merchant, desc || merchant, plaidCat, 0, 0]);
}

// ── iterate month by month ───────────────────────────────────────────────────

let curYear = START.getFullYear(), curMonth = START.getMonth() + 1; // 1-based

while (true) {
  const y = curYear, m = curMonth;
  const cutoff = new Date(y, m - 1, 1);
  if (cutoff > END) break;

  // ── CHECKING ──────────────────────────────────────────────────────────────

  // Bi-weekly payroll
  for (const day of [1, 15]) {
    const d = mkDate(y, m, day);
    if (inRange(d)) add(CHECKING, C.INCOME, -j(4520, 0.015), d, 'Employer Direct Deposit', 'Payroll Direct Deposit', 'Payroll');
  }

  // Mortgage
  { const d = mkDate(y, m, 1); if (inRange(d)) add(CHECKING, C.HOUSING, j(2248, 0.005), d, 'Chase Mortgage', 'Mortgage Payment', 'Mortgage'); }

  // Credit card payment from checking
  { const d = mkDate(y, m, Math.min(28, lastDay(y, m))); if (inRange(d)) add(CHECKING, C.OTHER, j(2400, 0.15), d, 'Chase Credit Card Payment', 'Credit Card Payment', 'Credit Card Payment'); }

  // Car insurance
  { const d = mkDate(y, m, 15); if (inRange(d)) add(CHECKING, C.TRANSPORT, j(187, 0.01), d, 'State Farm', 'Auto Insurance Premium', 'Insurance'); }

  // Electric
  { const d = rd(y, m, 5, 10); const elec = [12,1,2,7,8].includes(m) ? j(228, 0.15) : j(148, 0.12); add(CHECKING, C.UTILITIES, elec, d, 'Con Edison', 'Electric Bill', 'Utilities'); }

  // Gas/heating
  { const d = rd(y, m, 10, 15); const gas = [11,12,1,2,3].includes(m) ? j(195, 0.2) : j(42, 0.2); add(CHECKING, C.UTILITIES, gas, d, 'National Gas Co', 'Gas & Heating Bill', 'Utilities'); }

  // Internet
  { const d = rd(y, m, 8, 12); add(CHECKING, C.UTILITIES, 79.99, d, 'Comcast Xfinity', 'Internet Service', 'Utilities'); }

  // Water/sewer (bi-monthly)
  if (m % 2 === 0) { const d = rd(y, m, 15, 25); add(CHECKING, C.UTILITIES, j(72, 0.1), d, 'City Water Authority', 'Water & Sewer Bill', 'Utilities'); }

  // Cell phone
  { const d = rd(y, m, 18, 22); add(CHECKING, C.UTILITIES, 185.00, d, 'Verizon Wireless', 'Family Cell Plan', 'Utilities'); }

  // Transfer to savings
  {
    const d = rd(y, m, 1, 5);
    const amount = j(650, 0.1);
    add(CHECKING, C.OTHER,  amount,  d, 'Online Transfer', 'Transfer to Savings', 'Transfer');
    add(SAVINGS,  C.INCOME, -amount, d, 'Online Transfer', 'Transfer from Checking', 'Transfer');
  }

  // ── SAVINGS ───────────────────────────────────────────────────────────────

  // Monthly interest
  { const d = mkDate(y, m, lastDay(y, m)); if (inRange(d)) add(SAVINGS, C.INCOME, -j(6.5, 0.4), d, 'Tartan Bank', 'Interest Credit', 'Interest'); }

  // Occasional large withdrawal (vacation / emergency draw)
  if ([6, 11].includes(m)) {
    const d = rd(y, m, 10, 20);
    add(SAVINGS, C.OTHER, j(1200, 0.25), d, 'Online Transfer', 'Savings Withdrawal', 'Transfer');
  }

  // ── CREDIT CARD ───────────────────────────────────────────────────────────

  // Payment received on CC
  { const d = mkDate(y, m, Math.min(28, lastDay(y, m))); if (inRange(d)) add(CC, C.OTHER, -j(2400, 0.15), d, 'Chase Credit Card Payment', 'Payment - Thank You', 'Credit Card Payment'); }

  // Groceries: ~2.3x/week
  const winStart = (y === START.getFullYear() && m === START.getMonth()+1) ? START.getDate() : 1;
  const winEnd   = (y === END.getFullYear()   && m === END.getMonth()+1)   ? END.getDate()   : lastDay(y, m);
  const numGrocery = Math.max(1, Math.round((winEnd - winStart + 1) / 7 * 2.3));
  const grocers = [
    ['Whole Foods Market', 162], ["Trader Joe's", 122], ['Kroger', 134],
    ['Safeway', 128], ['Costco', 215], ['Target', 118], ["Sam's Club", 188],
  ];
  const usedDays = new Set();
  for (let i = 0; i < numGrocery; i++) {
    const d = rd(y, m, winStart, winEnd);
    const key = d && fmt(d);
    if (d && !usedDays.has(key)) {
      usedDays.add(key);
      const [store, base] = pick(grocers);
      add(CC, C.FOOD, j(base, 0.22), d, store, 'Grocery Shopping', 'Groceries');
    }
  }

  // Restaurants: 8–12/month
  const restaurants = [
    ['Chipotle Mexican Grill', 32], ["McDonald's", 24], ['Panera Bread', 42],
    ['Chick-fil-A', 28], ['Olive Garden', 78], ["Chili's Grill & Bar", 68],
    ['Buffalo Wild Wings', 72], ["Pizza Hut", 38], ["Domino's Pizza", 32],
    ['Five Guys', 36], ['Shake Shack', 42], ['Starbucks', 22], ['Dunkin', 14],
    ['IHOP', 48], ["Applebee's", 58], ['Red Lobster', 85], ['Cheesecake Factory', 95],
    ['Texas Roadhouse', 74], ['Outback Steakhouse', 82], ["Denny's", 44],
  ];
  for (let i = 0; i < rnd(8, 12); i++) {
    const d = rd(y, m); if (!d) continue;
    const [name, base] = pick(restaurants);
    add(CC, C.FOOD, j(base, 0.3), d, name, 'Dining Out', 'Food and Drink');
  }

  // Gas: 2–3 fill-ups/month
  const stations = ['Shell', 'BP', 'ExxonMobil', 'Chevron', 'Marathon Gas', 'Sunoco', 'Speedway'];
  for (let i = 0; i < rnd(2, 3); i++) {
    const d = rd(y, m); if (!d) continue;
    add(CC, C.TRANSPORT, j(68, 0.2), d, pick(stations), 'Gas Station', 'Gas Stations');
  }

  // Subscriptions (fixed monthly dates)
  const subs = [
    [3,  15.99, 'Netflix',        'Streaming Subscription'],
    [6,  14.99, 'Spotify',        'Music Streaming'],
    [10, 14.99, 'Amazon Prime',   'Prime Membership'],
    [12, 13.99, 'Disney+',        'Streaming Subscription'],
    [18, 64.99, 'Planet Fitness', 'Gym Membership'],
    [22,  9.99, 'Apple iCloud+',  'Cloud Storage'],
    [25, 17.99, 'Hulu',           'Streaming Subscription'],
    [28,  4.99, 'Google One',     'Cloud Storage'],
  ];
  for (const [day, price, merchant, desc] of subs) {
    const d = mkDate(y, m, day);
    if (inRange(d)) add(CC, C.SUBS, price, d, merchant, desc, 'Subscription');
  }

  // Shopping: 4–8/month
  const shops = [
    ['Amazon', 52], ['Target', 78], ['Walmart', 65], ['TJ Maxx', 68],
    ['HomeGoods', 72], ["Kohl's", 85], ["Macy's", 95], ['Old Navy', 74],
    ['Gap', 82], ['Best Buy', 145], ['Home Depot', 112], ["Lowe's", 98],
    ['PetSmart', 62], ['Bath & Body Works', 42],
  ];
  for (let i = 0; i < rnd(4, 8); i++) {
    const d = rd(y, m); if (!d) continue;
    const [name, base] = pick(shops);
    add(CC, C.SHOPPING, j(base, 0.45), d, name, 'Shopping', 'Shopping');
  }

  // Entertainment: 3–5/month
  const venues = [
    ['AMC Theaters', 58], ['Regal Cinemas', 54], ['Dave & Busters', 85],
    ['Main Event', 95], ['Round1 Bowling', 48], ['Topgolf', 110],
    ['Mini Golf', 38], ['Trampoline Park', 72], ['Chuck E Cheese', 65],
    ['Escape Room', 88], ['Laser Tag', 52],
  ];
  for (let i = 0; i < rnd(3, 5); i++) {
    const d = rd(y, m); if (!d) continue;
    const [name, base] = pick(venues);
    add(CC, C.ENTERTAIN, j(base, 0.35), d, name, 'Entertainment', 'Entertainment');
  }

  // Personal care: 2–4/month
  const care = [
    ['Great Clips', 64], ['Sport Clips', 22], ['CVS Pharmacy', 34],
    ['Walgreens', 28], ['Ulta Beauty', 58], ['Sephora', 72],
    ['Nail Salon', 48], ['SuperCuts', 18],
  ];
  for (let i = 0; i < rnd(2, 4); i++) {
    const d = rd(y, m); if (!d) continue;
    const [name, base] = pick(care);
    add(CC, C.PERSONAL, j(base, 0.25), d, name, 'Personal Care', 'Personal Care');
  }

  // Healthcare: sporadic ~55% chance
  if (rand() < 0.55) {
    const d = rd(y, m); if (d) {
      const providers = [
        ['CVS Pharmacy', 35], ['Walgreens Pharmacy', 28],
        ['Pediatric Associates', 45], ['Family Practice MD', 55],
        ['Urgent Care Center', 125], ['Quest Diagnostics', 48],
        ['Eye Care Associates', 145], ['Orthodontics Associates', 220],
      ];
      const [name, base] = pick(providers);
      add(CC, C.HEALTHCARE, j(base, 0.3), d, name, 'Healthcare', 'Healthcare');
    }
  }

  // Dental (March & September)
  if ([3, 9].includes(m)) {
    const d = rd(y, m, 5, 25);
    add(CC, C.HEALTHCARE, j(185, 0.2), d, 'Bright Now! Dental', 'Dental Cleaning', 'Dental');
  }

  // Back-to-school (August)
  if (m === 8) {
    for (let i = 0; i < 3; i++) {
      const d = rd(y, m); if (!d) continue;
      const store = pick(['Staples', 'Office Depot', 'Target', 'Walmart', 'Amazon']);
      add(CC, C.EDUCATION, j(88, 0.4), d, store, 'Back to School Supplies', 'Education');
    }
  }

  // Kids activities during school year
  if ([9,10,11,12,1,2,3,4,5].includes(m) && rand() < 0.65) {
    const d = rd(y, m);
    const activity = pick([
      'Youth Soccer League', 'Piano Lessons', 'Dance Studio',
      'Swim Academy', 'Little League Registration', 'Karate Dojo',
      'Art Classes', 'STEM Camp',
    ]);
    add(CC, C.EDUCATION, j(68, 0.2), d, activity, 'Kids Activities', 'Education');
  }

  // Summer camp (June, July)
  if ([6, 7].includes(m)) {
    const d = rd(y, m, 1, 5);
    add(CC, C.EDUCATION, j(480, 0.15), d, 'Summer Day Camp', 'Summer Camp', 'Education');
  }

  // Advance month
  if (m === 12) { curYear++; curMonth = 1; }
  else { curMonth++; }
}

// ── Insert ────────────────────────────────────────────────────────────────────

(async () => {
  const db = await mysql.createConnection(CFG);

  const sql = `INSERT INTO transactions
    (user_id, plaid_account_id, plaid_transaction_id, category_id,
     amount, date, merchant_name, description, plaid_category, pending, is_manual)
    VALUES ?`;

  const [result] = await db.query(sql, [txns]);
  console.log(`Inserted ${result.affectedRows} transactions`);

  // Summary
  const [rows] = await db.query(`
    SELECT pa.name, COUNT(*) AS cnt, SUM(t.amount) AS net
    FROM transactions t
    JOIN plaid_accounts pa ON pa.id = t.plaid_account_id
    WHERE t.user_id = ? AND t.is_manual = 0
    GROUP BY pa.name ORDER BY pa.name`, [USER_ID]);

  console.log('\nSummary by account:');
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(26)} ${String(r.cnt).padStart(4)} txns   net $${Number(r.net).toLocaleString('en-US', {minimumFractionDigits:2})}`);
  }

  await db.end();
})().catch(err => { console.error(err); process.exit(1); });
