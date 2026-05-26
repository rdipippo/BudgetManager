import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// ─── Constants ───────────────────────────────────────────────────────────────

const API = 'http://localhost:5000/api';
const RUN_ID = Date.now();
const OWNER_EMAIL = `e2e-goals-owner-${RUN_ID}@test.com`;
const OWNER_PASSWORD = 'TestOwner123!';
const OTHER_EMAIL = `e2e-goals-other-${RUN_ID}@test.com`;
const OTHER_PASSWORD = 'TestOther123!';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setAuthTokens(page: Page, accessToken: string, refreshToken: string) {
  await page.goto('/');
  await page.evaluate(
    ({ at, rt }) => {
      localStorage.setItem('accessToken', at);
      localStorage.setItem('refreshToken', rt);
    },
    { at: accessToken, rt: refreshToken }
  );
}

async function createVerifiedUser(
  request: APIRequestContext,
  email: string,
  password: string,
  firstName = 'Test',
  lastName = 'User'
): Promise<{ userId: number; accessToken: string; refreshToken: string }> {
  const res = await request.post(`${API}/test/create-verified-user`, {
    data: { email, password, firstName, lastName },
  });
  expect(res.ok(), `create-verified-user failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function createPlaidAccount(
  request: APIRequestContext,
  userId: number,
  opts: {
    type?: 'depository' | 'credit';
    name?: string;
    mask?: string;
    currentBalance?: number;
    institutionName?: string;
  } = {}
): Promise<{ plaidItemId: number; plaidAccountId: number }> {
  const res = await request.post(`${API}/test/create-plaid-account`, {
    data: { userId, ...opts },
  });
  expect(res.ok(), `create-plaid-account failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function setAccountBalance(
  request: APIRequestContext,
  plaidAccountId: number,
  currentBalance: number
): Promise<void> {
  const res = await request.post(`${API}/test/set-account-balance`, {
    data: { plaidAccountId, currentBalance },
  });
  expect(res.ok(), `set-account-balance failed: ${await res.text()}`).toBeTruthy();
}

async function createTransaction(
  request: APIRequestContext,
  userId: number,
  data: {
    plaidAccountId?: number;
    categoryId: number;
    amount: number;
    date?: string;
    merchantName?: string;
  }
): Promise<{ transactionId: number }> {
  const res = await request.post(`${API}/test/create-transaction`, {
    data: { userId, ...data },
  });
  expect(res.ok(), `create-transaction failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function createCategory(
  request: APIRequestContext,
  accessToken: string,
  name: string
): Promise<{ id: number }> {
  const res = await request.post(`${API}/categories`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name, color: '#6366F1', isIncome: false },
  });
  expect(res.ok(), `create-category failed: ${await res.text()}`).toBeTruthy();
  const { category } = await res.json();
  return category;
}

async function createGoal(
  request: APIRequestContext,
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ id: number; goal_type: string }> {
  const res = await request.post(`${API}/goals`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: body,
  });
  expect(res.ok(), `create-goal failed: ${await res.text()}`).toBeTruthy();
  const { goal } = await res.json();
  return goal;
}

async function cleanupUser(request: APIRequestContext, email: string) {
  await request.delete(`${API}/test/cleanup-user`, { data: { email } });
}

// ─── Shared state ─────────────────────────────────────────────────────────────

let ownerUserId: number;
let ownerAccessToken: string;
let ownerRefreshToken: string;
let otherUserId: number;
let otherAccessToken: string;

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Goals Feature', () => {
  test.beforeAll(async ({ request }) => {
    const owner = await createVerifiedUser(request, OWNER_EMAIL, OWNER_PASSWORD, 'Gail', 'Owner');
    ownerUserId = owner.userId;
    ownerAccessToken = owner.accessToken;
    ownerRefreshToken = owner.refreshToken;

    const other = await createVerifiedUser(request, OTHER_EMAIL, OTHER_PASSWORD, 'Other', 'User');
    otherUserId = other.userId;
    otherAccessToken = other.accessToken;
  });

  test.afterAll(async ({ request }) => {
    await cleanupUser(request, OWNER_EMAIL);
    await cleanupUser(request, OTHER_EMAIL);
  });

  // ── GoalsScreen empty state and navigation ────────────────────────────────

  test.describe('GoalsScreen empty state', () => {
    test('shows empty state when user has no goals', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/goals');

      await expect(page.getByRole('heading', { name: 'Goals' })).toBeVisible();
      await expect(page.getByText(/No Goals Yet/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /create goal/i })).toBeVisible();
    });

    test('clicking the "+" button opens the Create Goal modal', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/goals');

      await page.getByRole('button', { name: '+', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText(/Create Goal/i);
    });

    test('Create button is disabled when required fields are missing', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/goals');

      await page.getByRole('button', { name: '+', exact: true }).click();
      await expect(page.getByRole('button', { name: /^create$/i })).toBeDisabled();
    });
  });

  // ── Create save_balance goal via UI ──────────────────────────────────────

  test.describe('Create save_balance goal (UI)', () => {
    let plaidAccountId: number;

    test.beforeAll(async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, {
        type: 'depository',
        name: `Savings UI ${RUN_ID}`,
        mask: '1111',
        currentBalance: 500,
        institutionName: 'TestBank',
      });
      plaidAccountId = acct.plaidAccountId;
    });

    test('creates a savings goal and shows it on the goals list', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/goals');

      await page.getByRole('button', { name: '+', exact: true }).click();
      const dialog = page.getByRole('dialog');

      const goalName = `UI Savings ${RUN_ID}`;
      await dialog.getByPlaceholder(/Emergency Fund/i).fill(goalName);
      // goal type defaults to save_balance
      await dialog.locator('select').nth(1).selectOption(String(plaidAccountId));
      await dialog.getByPlaceholder('0.00').first().fill('1000');
      await dialog.getByPlaceholder('0.00').nth(1).fill('500');

      await expect(dialog.getByRole('button', { name: /^create$/i })).toBeEnabled();
      await dialog.getByRole('button', { name: /^create$/i }).click();

      await expect(page.getByText(goalName)).toBeVisible();
      await expect(page.getByText('Save Balance')).toBeVisible();
    });
  });

  // ── Goal detail screen ────────────────────────────────────────────────────

  test.describe('Goal detail screen', () => {
    let plaidAccountId: number;
    let goalId: number;

    test.beforeAll(async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, {
        type: 'depository',
        name: `Savings Detail ${RUN_ID}`,
        currentBalance: 750,
      });
      plaidAccountId = acct.plaidAccountId;
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Detail Goal ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId,
        targetAmount: 1500,
        baselineAmount: 0,
        targetDate: '2030-12-31',
      });
      goalId = goal.id;
    });

    test('shows goal name, current value, target, progress, and target date', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto(`/goals/${goalId}`);

      await expect(page.getByRole('heading', { name: `Detail Goal ${RUN_ID}` })).toBeVisible();
      await expect(page.getByText(/Saved/i)).toBeVisible();
      await expect(page.getByText(/Target/i).first()).toBeVisible();
      // 750 / 1500 = 50%
      await expect(page.getByText(/50% toward goal/i)).toBeVisible();
      await expect(page.getByText(/Target Date/i)).toBeVisible();
    });

    test('shows the progress history chart once a snapshot is recorded', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto(`/goals/${goalId}`);
      // The detail GET endpoint snapshots progress for active goals
      await expect(page.getByRole('heading', { name: /Progress History/i })).toBeVisible();
    });

    test('back button returns to /goals', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto(`/goals/${goalId}`);
      await page.locator('.back-button').click();
      await expect(page).toHaveURL(/\/goals$/);
    });

    test('deleting a goal removes it and navigates back', async ({ page, request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, {
        type: 'depository',
        name: `Delete Acct ${RUN_ID}`,
        currentBalance: 100,
      });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Delete Me ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        targetAmount: 500,
        baselineAmount: 0,
      });

      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto(`/goals/${goal.id}`);

      page.once('dialog', (d) => d.accept());
      await page.locator('.delete-button').click();

      await expect(page).toHaveURL(/\/goals$/);
      await expect(page.getByText(`Delete Me ${RUN_ID}`)).not.toBeVisible();
    });
  });

  // ── Progress computation per goal type (via API) ──────────────────────────

  test.describe('Progress computation', () => {
    test('save_balance: progress = (current - baseline) / (target - baseline)', async ({
      request,
    }) => {
      const acct = await createPlaidAccount(request, ownerUserId, {
        type: 'depository',
        name: `SB ${RUN_ID}`,
        currentBalance: 250,
      });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `SB calc ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        baselineAmount: 0,
        targetAmount: 1000,
      });

      const detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      const { goal: g } = await detail.json();
      expect(Number(g.currentValue)).toBe(250);
      expect(Number(g.progressPercent)).toBeCloseTo(25, 1);
      expect(g.isComplete).toBe(false);

      await setAccountBalance(request, acct.plaidAccountId, 1000);
      const detail2 = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      const { goal: g2 } = await detail2.json();
      expect(Number(g2.currentValue)).toBe(1000);
      expect(Number(g2.progressPercent)).toBeCloseTo(100, 1);
      expect(g2.isComplete).toBe(true);
    });

    test('pay_off_credit: aggregates balances across credit accounts and reports owed', async ({
      request,
    }) => {
      const a = await createPlaidAccount(request, ownerUserId, {
        type: 'credit',
        name: `CC1 ${RUN_ID}`,
        currentBalance: 1500,
      });
      const b = await createPlaidAccount(request, ownerUserId, {
        type: 'credit',
        name: `CC2 ${RUN_ID}`,
        currentBalance: 500,
      });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Payoff ${RUN_ID}`,
        goalType: 'pay_off_credit',
        creditAccountIds: [a.plaidAccountId, b.plaidAccountId],
        baselineTotal: 2000,
        targetBalance: 0,
      });

      const detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      const { goal: g } = await detail.json();
      expect(Number(g.currentValue)).toBe(2000);
      expect(Number(g.progressPercent)).toBeCloseTo(0, 1);
      expect(g.isComplete).toBe(false);

      // Pay them off
      await setAccountBalance(request, a.plaidAccountId, 0);
      await setAccountBalance(request, b.plaidAccountId, 0);
      const detail2 = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      const { goal: g2 } = await detail2.json();
      expect(Number(g2.currentValue)).toBe(0);
      expect(g2.isComplete).toBe(true);
      expect(Number(g2.progressPercent)).toBeCloseTo(100, 1);
    });

    test('reduce_spending (fixed): tracks current-month spend toward (baseline - reduction)', async ({
      request,
    }) => {
      const cat = await createCategory(request, ownerAccessToken, `Reduce-cat ${RUN_ID}`);
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Reduce ${RUN_ID}`,
        goalType: 'reduce_spending',
        categoryId: cat.id,
        reductionType: 'fixed',
        reductionAmount: 100,
        baselineAmount: 400,
      });

      // No transactions yet → currentValue = 0
      let detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      let { goal: g } = await detail.json();
      expect(Number(g.currentValue)).toBe(0);
      // 0 spent against (baseline - target = 100) reduction goal → 100% reduced
      expect(g.isComplete).toBe(true);

      // Add a $250 expense (negative amount = spend) in this month
      const today = new Date().toISOString().slice(0, 10);
      await createTransaction(request, ownerUserId, {
        categoryId: cat.id,
        amount: -250,
        date: today,
      });

      detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      ({ goal: g } = await detail.json());
      expect(Number(g.currentValue)).toBeCloseTo(250, 2);
      // Still under target spend of 300 → complete
      expect(g.isComplete).toBe(true);

      // Push spend over the limit
      await createTransaction(request, ownerUserId, {
        categoryId: cat.id,
        amount: -100,
        date: today,
      });
      detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      ({ goal: g } = await detail.json());
      expect(Number(g.currentValue)).toBeCloseTo(350, 2);
      expect(g.isComplete).toBe(false);
    });

    test('spend_target: progress = current / target, complete at >= target', async ({
      request,
    }) => {
      const cat = await createCategory(request, ownerAccessToken, `SpendTgt-cat ${RUN_ID}`);
      const goal = await createGoal(request, ownerAccessToken, {
        name: `SpendTgt ${RUN_ID}`,
        goalType: 'spend_target',
        categoryId: cat.id,
        targetAmount: 200,
      });

      let detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      let { goal: g } = await detail.json();
      expect(Number(g.currentValue)).toBe(0);
      expect(Number(g.progressPercent)).toBe(0);

      const today = new Date().toISOString().slice(0, 10);
      await createTransaction(request, ownerUserId, {
        categoryId: cat.id,
        amount: -100,
        date: today,
      });
      detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      ({ goal: g } = await detail.json());
      expect(Number(g.currentValue)).toBeCloseTo(100, 2);
      expect(Number(g.progressPercent)).toBeCloseTo(50, 1);
      expect(g.isComplete).toBe(false);

      await createTransaction(request, ownerUserId, {
        categoryId: cat.id,
        amount: -100,
        date: today,
      });
      detail = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      ({ goal: g } = await detail.json());
      expect(g.isComplete).toBe(true);
    });
  });

  // ── Update goal ───────────────────────────────────────────────────────────

  test.describe('Update goal', () => {
    test('PUT /goals/:id can rename a goal', async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, {
        type: 'depository',
        currentBalance: 50,
      });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Rename Me ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        baselineAmount: 0,
        targetAmount: 100,
      });

      const res = await request.put(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: { name: `Renamed ${RUN_ID}` },
      });
      expect(res.ok()).toBeTruthy();

      const get = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      const { goal: g } = await get.json();
      expect(g.name).toBe(`Renamed ${RUN_ID}`);
    });

    test('PUT /goals/:id can swap the credit account list on a payoff goal', async ({
      request,
    }) => {
      const a = await createPlaidAccount(request, ownerUserId, {
        type: 'credit',
        currentBalance: 100,
      });
      const b = await createPlaidAccount(request, ownerUserId, {
        type: 'credit',
        currentBalance: 400,
      });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Payoff Update ${RUN_ID}`,
        goalType: 'pay_off_credit',
        creditAccountIds: [a.plaidAccountId],
        baselineTotal: 100,
        targetBalance: 0,
      });

      const res = await request.put(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: { creditAccountIds: [b.plaidAccountId], baselineTotal: 400 },
      });
      expect(res.ok()).toBeTruthy();

      const get = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      const { goal: g } = await get.json();
      expect(g.credit_account_ids).toEqual([b.plaidAccountId]);
      expect(Number(g.currentValue)).toBe(400);
    });

    test('PUT /goals/:id with isActive=false deactivates the goal', async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, {
        type: 'depository',
        currentBalance: 0,
      });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Deactivate ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        baselineAmount: 0,
        targetAmount: 100,
      });

      const res = await request.put(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: { isActive: false },
      });
      expect(res.ok()).toBeTruthy();

      const get = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      const { goal: g } = await get.json();
      expect(g.is_active).toBe(false);
    });
  });

  // ── API access control & validation ───────────────────────────────────────

  test.describe('API access control & validation', () => {
    test('GET /api/goals without auth returns 401', async ({ request }) => {
      const res = await request.get(`${API}/goals`);
      expect(res.status()).toBe(401);
    });

    test('POST /api/goals without auth returns 401', async ({ request }) => {
      const res = await request.post(`${API}/goals`, {
        data: { name: 'x', goalType: 'save_balance' },
      });
      expect(res.status()).toBe(401);
    });

    test('POST /api/goals with invalid goalType returns 400', async ({ request }) => {
      const res = await request.post(`${API}/goals`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: { name: 'bogus', goalType: 'not_a_real_type' },
      });
      expect(res.status()).toBe(400);
    });

    test('POST /api/goals with empty name returns 400', async ({ request }) => {
      const res = await request.post(`${API}/goals`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: { name: '   ', goalType: 'save_balance' },
      });
      expect(res.status()).toBe(400);
    });

    test('POST save_balance without an account returns 400', async ({ request }) => {
      const res = await request.post(`${API}/goals`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: {
          name: 'no-account',
          goalType: 'save_balance',
          targetAmount: 100,
          baselineAmount: 0,
        },
      });
      expect(res.status()).toBe(400);
    });

    test('POST save_balance with non-positive target returns 400', async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, { type: 'depository' });
      const res = await request.post(`${API}/goals`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: {
          name: 'zero target',
          goalType: 'save_balance',
          plaidAccountId: acct.plaidAccountId,
          targetAmount: 0,
          baselineAmount: 0,
        },
      });
      expect(res.status()).toBe(400);
    });

    test('POST pay_off_credit without credit accounts returns 400', async ({ request }) => {
      const res = await request.post(`${API}/goals`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: {
          name: 'no credit accounts',
          goalType: 'pay_off_credit',
          baselineTotal: 1000,
          targetBalance: 0,
        },
      });
      expect(res.status()).toBe(400);
    });

    test('POST reduce_spending with reductionType=percent over 100 returns 400', async ({
      request,
    }) => {
      const cat = await createCategory(request, ownerAccessToken, `Validate-cat ${RUN_ID}`);
      const res = await request.post(`${API}/goals`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: {
          name: 'over 100',
          goalType: 'reduce_spending',
          categoryId: cat.id,
          reductionType: 'percent',
          reductionAmount: 150,
          baselineAmount: 100,
        },
      });
      expect(res.status()).toBe(400);
    });

    test('POST reduce_spending with another user\'s category returns 400', async ({ request }) => {
      const otherCat = await createCategory(request, otherAccessToken, `OtherCat ${RUN_ID}`);
      const res = await request.post(`${API}/goals`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: {
          name: 'wrong-user-category',
          goalType: 'reduce_spending',
          categoryId: otherCat.id,
          reductionType: 'fixed',
          reductionAmount: 10,
          baselineAmount: 100,
        },
      });
      expect(res.status()).toBe(400);
    });

    test('GET /api/goals/:id for another user\'s goal returns 404', async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, { type: 'depository' });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Owned ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        baselineAmount: 0,
        targetAmount: 100,
      });
      const res = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${otherAccessToken}` },
      });
      expect(res.status()).toBe(404);
    });

    test('PUT /api/goals/:id for another user\'s goal returns 404', async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, { type: 'depository' });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `PutGuard ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        baselineAmount: 0,
        targetAmount: 100,
      });
      const res = await request.put(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${otherAccessToken}` },
        data: { name: 'hacked' },
      });
      expect(res.status()).toBe(404);
    });

    test('DELETE /api/goals/:id for another user\'s goal returns 404', async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, { type: 'depository' });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `DelGuard ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        baselineAmount: 0,
        targetAmount: 100,
      });
      const res = await request.delete(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${otherAccessToken}` },
      });
      expect(res.status()).toBe(404);
    });

    test('GET /api/goals returns goals only for the authenticated user', async ({ request }) => {
      const res = await request.get(`${API}/goals`, {
        headers: { Authorization: `Bearer ${otherAccessToken}` },
      });
      expect(res.ok()).toBeTruthy();
      const { goals } = await res.json();
      expect(Array.isArray(goals)).toBeTruthy();
      // The "other" user has no goals — none of the goals created above should appear
      for (const g of goals) {
        expect(g.user_id).toBe(otherUserId);
      }
    });

    test('GET /api/goals/:id returns enriched fields and progress array', async ({ request }) => {
      const acct = await createPlaidAccount(request, ownerUserId, {
        type: 'depository',
        currentBalance: 100,
      });
      const goal = await createGoal(request, ownerAccessToken, {
        name: `Enrich ${RUN_ID}`,
        goalType: 'save_balance',
        plaidAccountId: acct.plaidAccountId,
        baselineAmount: 0,
        targetAmount: 200,
      });

      const res = await request.get(`${API}/goals/${goal.id}`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.goal).toMatchObject({
        id: goal.id,
        goal_type: 'save_balance',
        is_active: true,
      });
      expect(body.goal.currentValue).toBeDefined();
      expect(body.goal.progressPercent).toBeDefined();
      expect(body.goal.isComplete).toBeDefined();
      expect(Array.isArray(body.progress)).toBeTruthy();
    });
  });
});
