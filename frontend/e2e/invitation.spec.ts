import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// ─── Constants ───────────────────────────────────────────────────────────────

const API = 'http://localhost:5000/api';
const RUN_ID = Date.now();
const OWNER_EMAIL = `e2e-owner-${RUN_ID}@test.com`;
const OWNER_PASSWORD = 'TestOwner123!';
const INVITEE_EMAIL = `e2e-invitee-${RUN_ID}@test.com`;
const INVITEE_PASSWORD = 'TestInvitee123!';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Injects auth tokens into localStorage so the app treats the page as logged in. */
async function setAuthTokens(page: Page, accessToken: string, refreshToken: string) {
  // Must be on the origin before touching localStorage
  await page.goto('/');
  await page.evaluate(
    ({ at, rt }) => {
      localStorage.setItem('accessToken', at);
      localStorage.setItem('refreshToken', rt);
    },
    { at: accessToken, rt: refreshToken }
  );
}

/** Creates a verified test user via the test endpoint and returns their auth tokens. */
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

/** Creates an invitation and returns the raw token (no email sent). */
async function createInvitationToken(
  request: APIRequestContext,
  ownerAccessToken: string,
  inviteeEmail: string,
  accessType: 'full' | 'partial' | 'advisor' = 'full'
): Promise<{ token: string; invitationId: number }> {
  const res = await request.post(`${API}/test/create-invitation-token`, {
    headers: { Authorization: `Bearer ${ownerAccessToken}` },
    data: { email: inviteeEmail, accessType },
  });
  expect(res.ok(), `create-invitation-token failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

/** Deletes a user by email (cascades to all related data). */
async function cleanupUser(request: APIRequestContext, email: string) {
  await request.delete(`${API}/test/cleanup-user`, { data: { email } });
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Invitation Feature', () => {
  let ownerAccessToken: string;
  let ownerRefreshToken: string;

  test.beforeAll(async ({ request }) => {
    const owner = await createVerifiedUser(request, OWNER_EMAIL, OWNER_PASSWORD, 'Alice', 'Owner');
    ownerAccessToken = owner.accessToken;
    ownerRefreshToken = owner.refreshToken;
  });

  test.afterAll(async ({ request }) => {
    await cleanupUser(request, OWNER_EMAIL);
    await cleanupUser(request, INVITEE_EMAIL);
  });

  // ── Invitations screen layout ─────────────────────────────────────────────

  test('shows three tabs and invite form on /invitations', async ({ page }) => {
    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');

    await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pending' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Members' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Invitation' })).toBeVisible();
  });

  test('shows all three access type options', async ({ page }) => {
    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');

    await expect(page.getByText('Full Access')).toBeVisible();
    await expect(page.getByText('Partial Access')).toBeVisible();
    await expect(page.getByText('Financial Advisor')).toBeVisible();
  });

  // ── Send invitation — validation ──────────────────────────────────────────

  test('shows error when submitting with empty email', async ({ page }) => {
    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');

    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('shows error when email format is invalid', async ({ page }) => {
    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');

    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test('shows error when partial access is selected but no accounts chosen', async ({ page }) => {
    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');

    await page.getByLabel('Email Address').fill(INVITEE_EMAIL);
    // Select "Partial Access"
    await page.getByText('Partial Access').click();
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText(/select at least one account/i)).toBeVisible();
  });

  // ── Send invitation — happy path ──────────────────────────────────────────

  test('sends a full-access invitation and shows success message', async ({ page }) => {
    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');

    await page.getByLabel('Email Address').fill(INVITEE_EMAIL);
    // Full Access is selected by default
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText(/invitation sent successfully/i)).toBeVisible();
    // Email field should be cleared after success
    await expect(page.getByLabel('Email Address')).toHaveValue('');
  });

  test('shows error when inviting an email that is already a member', async ({
    page,
    request,
  }) => {
    // Accept the previously sent invitation so the user becomes a member
    const { token } = await createInvitationToken(
      request,
      ownerAccessToken,
      `e2e-duplicate-${RUN_ID}@test.com`
    );
    await request.post(`${API}/invitations/accept`, {
      data: {
        token,
        password: INVITEE_PASSWORD,
        firstName: 'Dupe',
        lastName: 'Member',
      },
    });

    // Now try to invite the same email again via the UI
    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');
    await page.getByLabel('Email Address').fill(`e2e-duplicate-${RUN_ID}@test.com`);
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText(/already a member/i)).toBeVisible();

    // Cleanup duplicate member
    await cleanupUser(request, `e2e-duplicate-${RUN_ID}@test.com`);
  });

  // ── Pending invitations tab ───────────────────────────────────────────────

  test('shows pending invitation in the Pending tab', async ({ page, request }) => {
    const pendingEmail = `e2e-pending-${RUN_ID}@test.com`;
    // Create invitation via test API (no email sent)
    await createInvitationToken(request, ownerAccessToken, pendingEmail, 'advisor');

    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');
    await page.getByRole('button', { name: 'Pending' }).click();

    await expect(page.getByText(pendingEmail)).toBeVisible();
    await expect(page.getByText('Financial Advisor')).toBeVisible();

    // Cleanup — invitation will be deleted when owner is deleted in afterAll
  });

  test('shows empty state when there are no pending invitations', async ({ page, request }) => {
    // Create a fresh owner with no invitations
    const freshOwner = await createVerifiedUser(
      request,
      `e2e-fresh-owner-${RUN_ID}@test.com`,
      OWNER_PASSWORD
    );

    await setAuthTokens(page, freshOwner.accessToken, freshOwner.refreshToken);
    await page.goto('/invitations');
    await page.getByRole('button', { name: 'Pending' }).click();

    await expect(page.getByText('No pending invitations.')).toBeVisible();

    await cleanupUser(request, `e2e-fresh-owner-${RUN_ID}@test.com`);
  });

  // ── Revoke invitation ─────────────────────────────────────────────────────

  test('removes invitation from list after revoking it', async ({ page, request }) => {
    const revokeEmail = `e2e-revoke-${RUN_ID}@test.com`;
    await createInvitationToken(request, ownerAccessToken, revokeEmail);

    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');
    await page.getByRole('button', { name: 'Pending' }).click();

    // Find the row for this email and click Revoke
    const row = page.locator('.list-item').filter({ hasText: revokeEmail });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Revoke' }).click();

    await expect(row).not.toBeVisible();
  });

  // ── Accept invitation page ────────────────────────────────────────────────

  test('shows error for an invalid invitation token', async ({ page }) => {
    await page.goto('/accept-invitation?token=totally-invalid-token-xyz');

    await expect(page.getByText(/not found|expired|invalid/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  });

  test('shows invitation details (owner name, email, access level) on accept page', async ({
    page,
    request,
  }) => {
    const { token } = await createInvitationToken(
      request,
      ownerAccessToken,
      INVITEE_EMAIL,
      'advisor'
    );

    await page.goto(`/accept-invitation?token=${token}`);

    await expect(page.getByText('Alice Owner')).toBeVisible();
    await expect(page.getByText(INVITEE_EMAIL)).toBeVisible();
    await expect(page.getByText('Financial Advisor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account & Accept' })).toBeVisible();
  });

  test('shows password validation errors on accept page', async ({ page, request }) => {
    const { token } = await createInvitationToken(
      request,
      ownerAccessToken,
      `e2e-weakpwd-${RUN_ID}@test.com`,
      'full'
    );

    await page.goto(`/accept-invitation?token=${token}`);

    // Submit without filling password
    await page.getByRole('button', { name: 'Create Account & Accept' }).click();
    await expect(page.getByText(/password is required/i)).toBeVisible();

    // Too short
    await page.getByLabel('Password').first().fill('short');
    await page.getByRole('button', { name: 'Create Account & Accept' }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();

    // Missing uppercase
    await page.getByLabel('Password').first().fill('alllowercase1!');
    await page.getByRole('button', { name: 'Create Account & Accept' }).click();
    await expect(page.getByText(/uppercase/i)).toBeVisible();
  });

  test('shows error when passwords do not match on accept page', async ({ page, request }) => {
    const { token } = await createInvitationToken(
      request,
      ownerAccessToken,
      `e2e-mismatch-${RUN_ID}@test.com`,
      'full'
    );

    await page.goto(`/accept-invitation?token=${token}`);

    await page.getByLabel('Password').first().fill('ValidPass1!');
    await page.getByLabel('Confirm Password').fill('DifferentPass1!');
    await page.getByRole('button', { name: 'Create Account & Accept' }).click();

    await expect(page.getByText(/passwords must match/i)).toBeVisible();
  });

  test('accepts invitation, creates account, and redirects to dashboard', async ({
    page,
    request,
  }) => {
    const { token } = await createInvitationToken(
      request,
      ownerAccessToken,
      INVITEE_EMAIL,
      'full'
    );

    await page.goto(`/accept-invitation?token=${token}`);

    await page.getByLabel('First Name').fill('Bob');
    await page.getByLabel('Last Name').fill('Invitee');
    await page.getByLabel('Password').first().fill(INVITEE_PASSWORD);
    await page.getByLabel('Confirm Password').fill(INVITEE_PASSWORD);
    await page.getByRole('button', { name: 'Create Account & Accept' }).click();

    await expect(page.getByText(/account has been created|welcome/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Dashboard' })).toBeVisible();
  });

  test('shows error when re-using an already-accepted invitation token', async ({
    page,
    request,
  }) => {
    const alreadyUsedEmail = `e2e-used-token-${RUN_ID}@test.com`;
    const { token } = await createInvitationToken(
      request,
      ownerAccessToken,
      alreadyUsedEmail,
      'full'
    );

    // Accept the invitation via API
    await request.post(`${API}/invitations/accept`, {
      data: { token, password: INVITEE_PASSWORD },
    });

    // Now try to load the accept page with the used token
    await page.goto(`/accept-invitation?token=${token}`);

    await expect(page.getByText(/already been used|expired/i)).toBeVisible();

    await cleanupUser(request, alreadyUsedEmail);
  });

  // ── Members tab ───────────────────────────────────────────────────────────

  test('shows accepted member in the Members tab', async ({ page, request }) => {
    // INVITEE_EMAIL should have accepted the invitation in the earlier test.
    // If that test ran, the member exists. We'll also check the members API directly.
    const membersRes = await request.get(`${API}/invitations/members`, {
      headers: { Authorization: `Bearer ${ownerAccessToken}` },
    });
    const { members } = await membersRes.json();
    // At least one member should exist (the INVITEE_EMAIL user who accepted above)
    expect(members.length).toBeGreaterThan(0);

    await setAuthTokens(page, ownerAccessToken, ownerRefreshToken);
    await page.goto('/invitations');
    await page.getByRole('button', { name: 'Members' }).click();

    // The member list should be visible (not the empty state)
    await expect(page.getByText('No members have joined yet.')).not.toBeVisible();
    await expect(page.locator('.list-container')).toBeVisible();
  });

  test('shows empty state in Members tab when no members have joined', async ({
    page,
    request,
  }) => {
    const noMembersOwner = await createVerifiedUser(
      request,
      `e2e-no-members-${RUN_ID}@test.com`,
      OWNER_PASSWORD
    );

    await setAuthTokens(page, noMembersOwner.accessToken, noMembersOwner.refreshToken);
    await page.goto('/invitations');
    await page.getByRole('button', { name: 'Members' }).click();

    await expect(page.getByText('No members have joined yet.')).toBeVisible();

    await cleanupUser(request, `e2e-no-members-${RUN_ID}@test.com`);
  });

  // ── Remove member ─────────────────────────────────────────────────────────

  test('removes member from list after clicking Remove', async ({ page, request }) => {
    const removableEmail = `e2e-removable-${RUN_ID}@test.com`;
    const removableOwner = await createVerifiedUser(
      request,
      `e2e-remove-owner-${RUN_ID}@test.com`,
      OWNER_PASSWORD,
      'Remove',
      'Owner'
    );

    // Create and accept an invitation so there is a member to remove
    const { token } = await createInvitationToken(
      request,
      removableOwner.accessToken,
      removableEmail,
      'advisor'
    );
    await request.post(`${API}/invitations/accept`, {
      data: { token, password: INVITEE_PASSWORD, firstName: 'To', lastName: 'Remove' },
    });

    await setAuthTokens(page, removableOwner.accessToken, removableOwner.refreshToken);
    await page.goto('/invitations');
    await page.getByRole('button', { name: 'Members' }).click();

    const memberRow = page.locator('.list-item').first();
    await expect(memberRow).toBeVisible();
    await memberRow.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('No members have joined yet.')).toBeVisible();

    await cleanupUser(request, `e2e-remove-owner-${RUN_ID}@test.com`);
    await cleanupUser(request, removableEmail);
  });

  // ── Access control ────────────────────────────────────────────────────────

  test('redirects unauthenticated users away from /invitations', async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/invitations');

    // Should end up on the login page
    await expect(page).toHaveURL(/\/login/);
  });
});
