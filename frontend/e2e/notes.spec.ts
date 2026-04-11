import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// ─── Constants ───────────────────────────────────────────────────────────────

const API = 'http://localhost:5000/api';
const RUN_ID = Date.now();
const OWNER_EMAIL = `e2e-notes-owner-${RUN_ID}@test.com`;
const OWNER_PASSWORD = 'TestOwner123!';
const MEMBER_EMAIL = `e2e-notes-member-${RUN_ID}@test.com`;
const MEMBER_PASSWORD = 'TestMember123!';
const PARTIAL_EMAIL = `e2e-notes-partial-${RUN_ID}@test.com`;

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

async function createInvitationAndAccept(
  request: APIRequestContext,
  ownerAccessToken: string,
  inviteeEmail: string,
  inviteePassword: string,
  accessType: 'full' | 'partial' | 'advisor' = 'full',
  firstName = 'Member',
  lastName = 'User'
): Promise<{ userId: number; accessToken: string; refreshToken: string }> {
  // Create invitation token via test helper
  const invRes = await request.post(`${API}/test/create-invitation-token`, {
    headers: { Authorization: `Bearer ${ownerAccessToken}` },
    data: { email: inviteeEmail, accessType },
  });
  expect(invRes.ok(), `create-invitation-token failed: ${await invRes.text()}`).toBeTruthy();
  const { token } = await invRes.json();

  // Accept invitation
  const acceptRes = await request.post(`${API}/invitations/accept`, {
    data: { token, password: inviteePassword, firstName, lastName },
  });
  expect(acceptRes.ok(), `accept invitation failed: ${await acceptRes.text()}`).toBeTruthy();

  // Log in as the new member
  const loginRes = await request.post(`${API}/auth/login`, {
    data: { email: inviteeEmail, password: inviteePassword },
  });
  expect(loginRes.ok(), `member login failed: ${await loginRes.text()}`).toBeTruthy();
  const { accessToken, refreshToken, user } = await loginRes.json();
  return { userId: user.id, accessToken, refreshToken };
}

async function createNote(
  request: APIRequestContext,
  ownerUserId: number,
  authorUserId: number,
  body: string,
  opts: {
    entityType?: 'plaid_account' | 'category' | 'monthly_budget';
    entityId?: number;
    year?: number;
    month?: number;
  } = {}
): Promise<{ id: number }> {
  const res = await request.post(`${API}/test/create-note`, {
    data: {
      ownerUserId,
      authorUserId,
      entityType: opts.entityType ?? 'monthly_budget',
      entityId: opts.entityId ?? 0,
      body,
      year: opts.year ?? new Date().getFullYear(),
      month: opts.month ?? new Date().getMonth() + 1,
    },
  });
  expect(res.ok(), `create-note failed: ${await res.text()}`).toBeTruthy();
  const { note } = await res.json();
  return note;
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

async function cleanupUser(request: APIRequestContext, email: string) {
  await request.delete(`${API}/test/cleanup-user`, { data: { email } });
}

// Open the notes modal from the budgets screen month nav
async function openBudgetNotesModal(page: Page) {
  await page.getByRole('button', { name: /notes/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

// ─── Shared state ─────────────────────────────────────────────────────────────

let ownerUserId: number;
let ownerAccessToken: string;
let ownerRefreshToken: string;
let memberUserId: number;
let memberAccessToken: string;
let memberRefreshToken: string;

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Notes Feature', () => {
  test.beforeAll(async ({ request }) => {
    const owner = await createVerifiedUser(request, OWNER_EMAIL, OWNER_PASSWORD, 'Alice', 'Owner');
    ownerUserId = owner.userId;
    ownerAccessToken = owner.accessToken;
    ownerRefreshToken = owner.refreshToken;

    const member = await createInvitationAndAccept(
      request,
      ownerAccessToken,
      MEMBER_EMAIL,
      MEMBER_PASSWORD,
      'full',
      'Bob',
      'Member'
    );
    memberUserId = member.userId;
    memberAccessToken = member.accessToken;
    memberRefreshToken = member.refreshToken;
  });

  test.afterAll(async ({ request }) => {
    await cleanupUser(request, OWNER_EMAIL);
    await cleanupUser(request, MEMBER_EMAIL);
    await cleanupUser(request, PARTIAL_EMAIL);
  });

  // ── BudgetsScreen entry point ─────────────────────────────────────────────

  test.describe('Budgets screen', () => {
    test('shows "Notes" button in the month navigation bar', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');

      await expect(page.getByRole('button', { name: /notes/i }).first()).toBeVisible();
    });

    test('clicking Notes opens a modal titled with the current month', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');

      await openBudgetNotesModal(page);

      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();
      await expect(page.getByRole('dialog')).toContainText(`${monthName} ${year}`);
    });

    test('shows empty state when no notes exist', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      await expect(page.getByText(/no notes yet/i)).toBeVisible();
    });

    test('Post button is disabled when compose textarea is empty', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      await expect(page.getByRole('button', { name: /post/i })).toBeDisabled();
    });

    test('Post button becomes enabled when text is entered', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      await page.getByPlaceholder(/write a note/i).fill('Hello team!');
      await expect(page.getByRole('button', { name: /post/i })).toBeEnabled();
    });

    test('posting a note adds it to the thread', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      await page.getByPlaceholder(/write a note/i).fill('Budget looks tight this month.');
      await page.getByRole('button', { name: /post/i }).click();

      await expect(page.getByText('Budget looks tight this month.')).toBeVisible();
      await expect(page.getByText(/you/i).first()).toBeVisible();
      // Compose area should be cleared after posting
      await expect(page.getByPlaceholder(/write a note/i)).toHaveValue('');
    });

    test('closing the modal hides it', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      await page.getByRole('button', { name: '×' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  // ── CategoriesScreen entry point ──────────────────────────────────────────

  test.describe('Categories screen', () => {
    let categoryId: number;

    test.beforeAll(async ({ request }) => {
      const cat = await createCategory(request, ownerAccessToken, `E2E Notes Cat ${RUN_ID}`);
      categoryId = cat.id;
    });

    test('each category row has a notes icon button', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/categories');

      // At least one notes icon button should be visible
      const notesBtns = page.locator('.notes-icon-btn');
      await expect(notesBtns.first()).toBeVisible();
    });

    test('clicking notes icon opens modal with category name', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/categories');

      await page.locator('.notes-icon-btn').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText(`E2E Notes Cat ${RUN_ID}`);
    });

    test('can post a note on a category', async ({ page }) => {
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/categories');

      await page.locator('.notes-icon-btn').first().click();
      await page.getByPlaceholder(/write a note/i).fill('Category note here.');
      await page.getByRole('button', { name: /post/i }).click();

      await expect(page.getByText('Category note here.')).toBeVisible();
    });
  });

  // ── Multi-user note sharing ───────────────────────────────────────────────

  test.describe('Multi-user note sharing', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    test('owner posts a note; member sees it in the thread', async ({ page, request }) => {
      await createNote(request, ownerUserId, ownerUserId, 'Hi from the owner!', { year, month });

      await setAuthTokens(page, memberAccessToken, memberRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      await expect(page.getByText('Hi from the owner!')).toBeVisible();
      // Should show the owner's name, not "You"
      await expect(page.getByText('Alice Owner')).toBeVisible();
    });

    test('member posts a reply; owner sees it', async ({ page, request }) => {
      // Member posts via UI
      await setAuthTokens(page, memberAccessToken, memberRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);
      await page.getByPlaceholder(/write a note/i).fill('Reply from member.');
      await page.getByRole('button', { name: /post/i }).click();
      await expect(page.getByText('Reply from member.')).toBeVisible();

      // Owner opens modal and sees both notes
      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);
      await expect(page.getByText('Reply from member.')).toBeVisible();
      await expect(page.getByText('Bob Member')).toBeVisible();
    });

    test('member only sees Edit/Delete on their own notes, not on owner notes', async ({
      page,
      request,
    }) => {
      const ownerNote = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Owner-only-note-${RUN_ID}`,
        { year, month }
      );
      const memberNote = await createNote(
        request,
        ownerUserId,
        memberUserId,
        `Member-only-note-${RUN_ID}`,
        { year, month }
      );

      await setAuthTokens(page, memberAccessToken, memberRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      // Owner's note row should NOT show Edit/Delete
      const ownerNoteEl = page.locator('.note-item').filter({ hasText: `Owner-only-note-${RUN_ID}` });
      await expect(ownerNoteEl).toBeVisible();
      await expect(ownerNoteEl.getByRole('button', { name: /edit/i })).not.toBeVisible();
      await expect(ownerNoteEl.getByRole('button', { name: /delete/i })).not.toBeVisible();

      // Member's own note should show Edit and Delete
      const memberNoteEl = page.locator('.note-item').filter({ hasText: `Member-only-note-${RUN_ID}` });
      await expect(memberNoteEl).toBeVisible();
      await expect(memberNoteEl.getByRole('button', { name: /edit/i })).toBeVisible();
      await expect(memberNoteEl.getByRole('button', { name: /delete/i })).toBeVisible();
    });

    test('full-access member sees Delete on the owner note (can delete any)', async ({
      page,
      request,
    }) => {
      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Full-delete-test-${RUN_ID}`,
        { year, month }
      );

      await setAuthTokens(page, memberAccessToken, memberRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      const noteEl = page.locator('.note-item').filter({ hasText: `Full-delete-test-${RUN_ID}` });
      await expect(noteEl.getByRole('button', { name: /delete/i })).toBeVisible();
    });

    test('partial member does NOT see Delete on the owner note', async ({ page, request }) => {
      const partial = await createInvitationAndAccept(
        request,
        ownerAccessToken,
        PARTIAL_EMAIL,
        'TestPartial123!',
        'partial',
        'Carol',
        'Partial'
      );

      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Partial-delete-test-${RUN_ID}`,
        { year, month }
      );

      await setAuthTokens(page, partial.accessToken, partial.refreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      const noteEl = page.locator('.note-item').filter({ hasText: `Partial-delete-test-${RUN_ID}` });
      await expect(noteEl).toBeVisible();
      await expect(noteEl.getByRole('button', { name: /delete/i })).not.toBeVisible();
    });
  });

  // ── Edit a note ───────────────────────────────────────────────────────────

  test.describe('Edit note', () => {
    const now = new Date();

    test('clicking Edit shows an inline textarea pre-filled with the body', async ({
      page,
      request,
    }) => {
      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Edit-me-${RUN_ID}`,
        { year: now.getFullYear(), month: now.getMonth() + 1 }
      );

      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      const noteEl = page.locator('.note-item').filter({ hasText: `Edit-me-${RUN_ID}` });
      await noteEl.getByRole('button', { name: /edit/i }).click();

      await expect(noteEl.locator('.note-edit-textarea')).toBeVisible();
      await expect(noteEl.locator('.note-edit-textarea')).toHaveValue(`Edit-me-${RUN_ID}`);
    });

    test('saving an edit updates the body and shows the "(edited)" badge', async ({
      page,
      request,
    }) => {
      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Before-edit-${RUN_ID}`,
        { year: now.getFullYear(), month: now.getMonth() + 1 }
      );

      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      const noteEl = page.locator('.note-item').filter({ hasText: `Before-edit-${RUN_ID}` });
      await noteEl.getByRole('button', { name: /edit/i }).click();
      await noteEl.locator('.note-edit-textarea').fill(`After-edit-${RUN_ID}`);
      await noteEl.getByRole('button', { name: /save/i }).click();

      await expect(page.getByText(`After-edit-${RUN_ID}`)).toBeVisible();
      await expect(page.getByText('edited')).toBeVisible();
    });

    test('cancelling an edit restores the original body', async ({ page, request }) => {
      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Cancel-edit-${RUN_ID}`,
        { year: now.getFullYear(), month: now.getMonth() + 1 }
      );

      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      const noteEl = page.locator('.note-item').filter({ hasText: `Cancel-edit-${RUN_ID}` });
      await noteEl.getByRole('button', { name: /edit/i }).click();
      await noteEl.locator('.note-edit-textarea').fill('Something else entirely');
      await noteEl.getByRole('button', { name: /cancel/i }).click();

      await expect(page.getByText(`Cancel-edit-${RUN_ID}`)).toBeVisible();
      await expect(noteEl.locator('.note-edit-textarea')).not.toBeVisible();
    });
  });

  // ── Delete a note ─────────────────────────────────────────────────────────

  test.describe('Delete note', () => {
    const now = new Date();

    test('deleting a note removes it from the thread', async ({ page, request }) => {
      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Delete-me-${RUN_ID}`,
        { year: now.getFullYear(), month: now.getMonth() + 1 }
      );

      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      const noteEl = page.locator('.note-item').filter({ hasText: `Delete-me-${RUN_ID}` });
      await expect(noteEl).toBeVisible();

      // Accept the confirmation dialog
      page.once('dialog', (dialog) => dialog.accept());
      await noteEl.getByRole('button', { name: /delete/i }).click();

      await expect(page.getByText(`Delete-me-${RUN_ID}`)).not.toBeVisible();
    });

    test('dismissing the delete confirmation keeps the note', async ({ page, request }) => {
      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Keep-me-${RUN_ID}`,
        { year: now.getFullYear(), month: now.getMonth() + 1 }
      );

      await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
      await page.goto('/budgets');
      await openBudgetNotesModal(page);

      const noteEl = page.locator('.note-item').filter({ hasText: `Keep-me-${RUN_ID}` });
      page.once('dialog', (dialog) => dialog.dismiss());
      await noteEl.getByRole('button', { name: /delete/i }).click();

      await expect(page.getByText(`Keep-me-${RUN_ID}`)).toBeVisible();
    });
  });

  // ── API-level tests ───────────────────────────────────────────────────────

  test.describe('API access control', () => {
    test('GET /api/notes without auth returns 401', async ({ request }) => {
      const res = await request.get(`${API}/notes?entityType=monthly_budget&entityId=0&year=2026&month=1`);
      expect(res.status()).toBe(401);
    });

    test('POST /api/notes without auth returns 401', async ({ request }) => {
      const res = await request.post(`${API}/notes`, {
        data: { entityType: 'monthly_budget', entityId: 0, body: 'test', year: 2026, month: 1 },
      });
      expect(res.status()).toBe(401);
    });

    test('POST /api/notes with invalid entityType returns 400', async ({ request }) => {
      const res = await request.post(`${API}/notes`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: { entityType: 'invalid_type', entityId: 0, body: 'test', year: 2026, month: 1 },
      });
      expect(res.status()).toBe(400);
    });

    test('POST /api/notes with empty body returns 400', async ({ request }) => {
      const res = await request.post(`${API}/notes`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: { entityType: 'monthly_budget', entityId: 0, body: '   ', year: 2026, month: 1 },
      });
      expect(res.status()).toBe(400);
    });

    test('POST /api/notes with body over 2000 chars returns 400', async ({ request }) => {
      const res = await request.post(`${API}/notes`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: {
          entityType: 'monthly_budget',
          entityId: 0,
          body: 'x'.repeat(2001),
          year: 2026,
          month: 1,
        },
      });
      expect(res.status()).toBe(400);
    });

    test('PUT /api/notes/:id by a non-author returns 403', async ({ request }) => {
      // Owner creates a note
      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Non-author-edit-${RUN_ID}`,
        { year: 2026, month: 1 }
      );

      // Member (full access) tries to edit it — should fail since edit is author-only
      const res = await request.put(`${API}/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${memberAccessToken}` },
        data: { body: 'hacked' },
      });
      expect(res.status()).toBe(403);
    });

    test('DELETE /api/notes/:id by a partial member for another user note returns 403', async ({
      request,
    }) => {
      const partial = await createInvitationAndAccept(
        request,
        ownerAccessToken,
        `e2e-notes-partial2-${RUN_ID}@test.com`,
        'TestPartial123!',
        'partial',
        'Dave',
        'Partial'
      );

      const note = await createNote(
        request,
        ownerUserId,
        ownerUserId,
        `Partial-cant-delete-${RUN_ID}`,
        { year: 2026, month: 1 }
      );

      const res = await request.delete(`${API}/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${partial.accessToken}` },
      });
      expect(res.status()).toBe(403);

      await cleanupUser(request, `e2e-notes-partial2-${RUN_ID}@test.com`);
    });

    test('GET /api/notes returns notes for the correct month', async ({ request }) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await createNote(request, ownerUserId, ownerUserId, `Month-filter-${RUN_ID}`, {
        year,
        month,
      });

      const res = await request.get(
        `${API}/notes?entityType=monthly_budget&entityId=0&year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${ownerAccessToken}` } }
      );
      expect(res.ok()).toBeTruthy();
      const { notes } = await res.json();
      expect(Array.isArray(notes)).toBeTruthy();
      expect(notes.some((n: { body: string }) => n.body === `Month-filter-${RUN_ID}`)).toBeTruthy();
    });

    test('GET /api/notes for a different month does not include current-month notes', async ({
      request,
    }) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const otherMonth = month === 12 ? 1 : month + 1;
      const otherYear = month === 12 ? year + 1 : year;

      await createNote(request, ownerUserId, ownerUserId, `Current-month-note-${RUN_ID}`, {
        year,
        month,
      });

      const res = await request.get(
        `${API}/notes?entityType=monthly_budget&entityId=0&year=${otherYear}&month=${otherMonth}`,
        { headers: { Authorization: `Bearer ${ownerAccessToken}` } }
      );
      expect(res.ok()).toBeTruthy();
      const { notes } = await res.json();
      expect(notes.some((n: { body: string }) => n.body === `Current-month-note-${RUN_ID}`)).toBeFalsy();
    });

    test('POST /api/notes returns 201 with the new note including author fields', async ({
      request,
    }) => {
      const res = await request.post(`${API}/notes`, {
        headers: { Authorization: `Bearer ${ownerAccessToken}` },
        data: {
          entityType: 'monthly_budget',
          entityId: 0,
          body: 'API-created note',
          year: 2026,
          month: 6,
        },
      });
      expect(res.status()).toBe(201);
      const { note } = await res.json();
      expect(note.body).toBe('API-created note');
      expect(note.author_email).toBe(OWNER_EMAIL.toLowerCase());
      expect(note.edited_at).toBeNull();
    });
  });
});
