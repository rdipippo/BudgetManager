import { PlaidService } from './plaid.service';
import { EncryptionService } from './encryption.service';
import { PlaidItemModel, PlaidAccountModel, TransactionModel, AccountBalanceHistoryModel } from '../models';
import { Transaction as PlaidTransaction } from 'plaid';
import { config } from '../config';

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  errors: string[];
}

export interface RefreshResult extends SyncResult {
  /** True if Plaid accepted the on-demand refresh request. */
  refreshed: boolean;
  /**
   * If the refresh attempt failed, the Plaid error code (e.g.
   * `PRODUCTS_NOT_SUPPORTED`, `PRODUCT_NOT_READY`) or a generic message.
   * Refresh failures are non-fatal — the sync still runs and may return
   * cached transactions.
   */
  refreshError: string | null;
  /** Number of /transactions/sync polling attempts that ran. */
  syncAttempts: number;
  /**
   * Sandbox-only. True if we fell back to `/sandbox/transactions/create` after
   * `/transactions/refresh` produced no new data. Lets the UI tell the user
   * that the new transaction they're seeing was injected, not pulled from a
   * real (mock) bank.
   */
  sandboxInjected: boolean;
  /** Plaid error code if the sandbox-create fallback failed (best-effort). */
  sandboxError: string | null;
}

// `/transactions/refresh` is asynchronous on Plaid's side — it acks the
// request and runs the upstream pull in the background. To pick up the new
// data without webhooks we have to poll `/transactions/sync` until either
// new transactions arrive or we give up.
//
// Plaid's Sandbox `user_transactions_dynamic` user reliably produces new
// transactions on refresh, but the upstream "fetch" can take several
// seconds — especially on the first refresh of an Item. These knobs are
// tuned to give Sandbox enough time without making the synchronous
// HTTP response feel hung.
const INITIAL_REFRESH_WAIT_MS = 4000;
const SYNC_POLL_INTERVAL_MS = 2000;
const MAX_SYNC_ATTEMPTS = 5;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const formatDate = (d: Date): string => d.toISOString().slice(0, 10);

// Generates one deterministic-but-varying mock transaction for the
// `/sandbox/transactions/create` fallback. The amount is small and the
// description is timestamped so repeated refresh presses produce visibly
// distinct transactions.
const buildSandboxMockTransaction = () => {
  const now = new Date();
  const amount = Math.round((5 + Math.random() * 45) * 100) / 100; // $5–$50
  return {
    amount, // Plaid: positive = outflow
    date_posted: formatDate(now),
    date_transacted: formatDate(now),
    description: `Sandbox refresh test ${now.toISOString().slice(11, 19)}`,
    iso_currency_code: 'USD',
  };
};

export const TransactionSyncService = {
  async syncItem(itemId: number, userId: number): Promise<SyncResult> {
    const result: SyncResult = {
      added: 0,
      modified: 0,
      removed: 0,
      errors: [],
    };

    try {
      const item = await PlaidItemModel.findByIdAndUser(itemId, userId);
      if (!item) {
        result.errors.push('Item not found');
        return result;
      }

      const accessToken = EncryptionService.decrypt(item.access_token_encrypted);
      let cursor = item.cursor || undefined;
      let hasMore = true;

      // Get account mapping
      const accounts = await PlaidAccountModel.findByPlaidItemId(itemId);
      const accountMap = new Map(accounts.map((a) => [a.plaid_account_id, a.id]));
      console.log(
        `[sync] item ${itemId}: starting cursor=${cursor ?? '<initial>'} ` +
          `dbAccounts=${accounts.length} (${[...accountMap.keys()].join(',')})`
      );

      let skippedNoAccount = 0;
      let pageNum = 0;

      while (hasMore) {
        pageNum++;
        const syncResult = await PlaidService.syncTransactions(accessToken, cursor);
        console.log(
          `[sync] item ${itemId}: page ${pageNum} plaidAdded=${syncResult.added.length} ` +
            `plaidModified=${syncResult.modified.length} plaidRemoved=${syncResult.removed.length} ` +
            `hasMore=${syncResult.hasMore}`
        );

        // Process added transactions
        for (const plaidTx of syncResult.added) {
          try {
            const dbAccountId = accountMap.get(plaidTx.account_id);
            if (!dbAccountId) {
              skippedNoAccount++;
              console.warn(
                `[sync] item ${itemId}: SKIPPED added tx ${plaidTx.transaction_id} ` +
                  `because plaid_account_id="${plaidTx.account_id}" is not in accountMap`
              );
              continue;
            }

            await TransactionModel.upsertFromPlaid({
              user_id: userId,
              plaid_account_id: dbAccountId,
              plaid_transaction_id: plaidTx.transaction_id,
              amount: -plaidTx.amount, // Plaid uses positive for outflows, negate to match app convention
              date: plaidTx.date,
              merchant_name: plaidTx.merchant_name || plaidTx.name,
              description: plaidTx.name,
              plaid_category: plaidTx.personal_finance_category?.primary || null,
              pending: plaidTx.pending,
            });
            result.added++;
          } catch (error) {
            console.error('Error adding transaction:', error);
            result.errors.push(`Failed to add transaction ${plaidTx.transaction_id}`);
          }
        }

        // Process modified transactions
        for (const plaidTx of syncResult.modified) {
          try {
            const dbAccountId = accountMap.get(plaidTx.account_id);
            if (!dbAccountId) {
              skippedNoAccount++;
              console.warn(
                `[sync] item ${itemId}: SKIPPED modified tx ${plaidTx.transaction_id} ` +
                  `because plaid_account_id="${plaidTx.account_id}" is not in accountMap`
              );
              continue;
            }

            await TransactionModel.upsertFromPlaid({
              user_id: userId,
              plaid_account_id: dbAccountId,
              plaid_transaction_id: plaidTx.transaction_id,
              amount: -plaidTx.amount,
              date: plaidTx.date,
              merchant_name: plaidTx.merchant_name || plaidTx.name,
              description: plaidTx.name,
              plaid_category: plaidTx.personal_finance_category?.primary || null,
              pending: plaidTx.pending,
            });
            result.modified++;
          } catch (error) {
            console.error('Error modifying transaction:', error);
            result.errors.push(`Failed to modify transaction ${plaidTx.transaction_id}`);
          }
        }

        // Process removed transactions
        for (const removed of syncResult.removed) {
          try {
            await TransactionModel.deleteByPlaidTransactionId(removed.transaction_id);
            result.removed++;
          } catch (error) {
            console.error('Error removing transaction:', error);
            result.errors.push(`Failed to remove transaction ${removed.transaction_id}`);
          }
        }

        cursor = syncResult.nextCursor;
        hasMore = syncResult.hasMore;
      }

      console.log(
        `[sync] item ${itemId}: done dbAdded=${result.added} dbModified=${result.modified} ` +
          `dbRemoved=${result.removed} skippedNoAccount=${skippedNoAccount} ` +
          `endCursor=${cursor ?? '<none>'}`
      );

      // Update cursor for next sync
      if (cursor) {
        await PlaidItemModel.updateCursor(itemId, cursor);
      }

      // Update item status
      await PlaidItemModel.updateStatus(itemId, 'active');
    } catch (error: any) {
      console.error('Sync error:', error);
      result.errors.push(error.message || 'Sync failed');

      // Update item status if there's an error
      if (error.response?.data?.error_code) {
        await PlaidItemModel.updateStatus(
          itemId,
          'error',
          error.response.data.error_code,
          error.response.data.error_message
        );
      }
    }

    return result;
  },

  /**
   * Refresh the account list and balances for an Item.
   *
   * @param opts.freshBalance - When true, calls `/accounts/balance/get` for
   *   real-time balances pulled live from the institution. When false (the
   *   default), uses `/accounts/get` which returns Plaid's cached balance.
   *   Pass true on user-initiated refreshes; leave false during background
   *   syncs and initial link to avoid the stricter balance-endpoint rate
   *   limit.
   */
  async syncAccounts(
    itemId: number,
    opts: { freshBalance?: boolean } = {}
  ): Promise<void> {
    const item = await PlaidItemModel.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const accessToken = EncryptionService.decrypt(item.access_token_encrypted);
    const accounts = opts.freshBalance
      ? await PlaidService.getAccountsBalance(accessToken)
      : await PlaidService.getAccounts(accessToken);
    console.log(
      `[sync] item ${itemId}: syncAccounts via ${opts.freshBalance ? 'accountsBalanceGet' : 'accountsGet'} ` +
        `→ ${accounts.length} accounts`
    );
    for (const a of accounts) {
      console.log(
        `[sync] item ${itemId}:   account "${a.name}" (${a.accountId.slice(0, 8)}…) ` +
          `current=${a.currentBalance} available=${a.availableBalance}`
      );
    }

    for (const account of accounts) {
      const accountId = await PlaidAccountModel.upsert({
        plaid_item_id: itemId,
        plaid_account_id: account.accountId,
        name: account.name,
        official_name: account.officialName || undefined,
        type: account.type,
        subtype: account.subtype || undefined,
        mask: account.mask || undefined,
        current_balance: account.currentBalance ?? undefined,
        available_balance: account.availableBalance ?? undefined,
        currency_code: account.currencyCode || undefined,
      });
      // Record daily balance snapshot
      if (account.currentBalance !== null && account.currentBalance !== undefined) {
        await AccountBalanceHistoryModel.record(
          accountId,
          account.currentBalance,
          account.availableBalance ?? null
        );
      }
    }
  },

  /**
   * Force an on-demand refresh at Plaid (the `/transactions/refresh` API),
   * then poll `/transactions/sync` until new transactions arrive or we give
   * up. The refresh step is best-effort: if the institution or plan doesn't
   * support it, we log the Plaid error code and proceed with the normal sync
   * so the user still gets cached/scheduled-pull data.
   *
   * Polling is necessary because `/transactions/refresh` returns immediately
   * after Plaid acks the request — the actual upstream fetch happens
   * asynchronously and isn't visible to `/transactions/sync` until it
   * completes. In Sandbox this is typically 2–8 seconds; in production it
   * varies by institution. Without this loop, a single sync call right after
   * refresh frequently advances the cursor with no new data, and subsequent
   * button presses can't recover the just-fetched transactions.
   */
  async refreshItem(itemId: number, userId: number): Promise<RefreshResult> {
    const aggregate: SyncResult = { added: 0, modified: 0, removed: 0, errors: [] };
    let refreshed = false;
    let refreshError: string | null = null;
    let syncAttempts = 0;
    let sandboxInjected = false;
    let sandboxError: string | null = null;

    const item = await PlaidItemModel.findByIdAndUser(itemId, userId);
    if (!item) {
      return {
        ...aggregate,
        errors: ['Item not found'],
        refreshed: false,
        refreshError: null,
        syncAttempts,
        sandboxInjected,
        sandboxError,
      };
    }

    const accessToken = EncryptionService.decrypt(item.access_token_encrypted);

    // 1. Ask Plaid to refresh from the institution.
    try {
      await PlaidService.refreshTransactions(accessToken);
      refreshed = true;
      console.log(`[refresh] item ${itemId}: /transactions/refresh accepted by Plaid`);
    } catch (error: any) {
      refreshError =
        error?.response?.data?.error_code ||
        error?.message ||
        'Unknown refresh error';
      console.warn(
        `[refresh] transactionsRefresh failed for item ${itemId}: ${refreshError}`
      );
    }

    // 2. Refresh the account list with real-time balances pulled live from
    //    the institution (`/accounts/balance/get`). If that fails (e.g.
    //    rate-limited or institution-specific quirk like Capital One needing
    //    `min_last_updated_datetime`), fall back to the cached `/accounts/get`
    //    so we still update the account list.
    try {
      await this.syncAccounts(itemId, { freshBalance: true });
    } catch (error: any) {
      const code =
        error?.response?.data?.error_code ||
        error?.message ||
        'Unknown balance error';
      console.warn(
        `[refresh] item ${itemId}: accountsBalanceGet failed (${code}); ` +
          `falling back to cached accountsGet`
      );
      await this.syncAccounts(itemId);
    }

    // 3. Wait once, then poll /transactions/sync for new data. Stop early as
    //    soon as a sync attempt returns added/modified/removed transactions.
    const sawChanges = (r: SyncResult) => r.added > 0 || r.modified > 0 || r.removed > 0;

    if (refreshed) {
      await sleep(INITIAL_REFRESH_WAIT_MS);
    }

    for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
      syncAttempts = attempt;
      const r = await this.syncItem(itemId, userId);
      aggregate.added += r.added;
      aggregate.modified += r.modified;
      aggregate.removed += r.removed;
      aggregate.errors.push(...r.errors);

      console.log(
        `[refresh] item ${itemId}: sync attempt ${attempt}/${MAX_SYNC_ATTEMPTS} ` +
          `added=${r.added} modified=${r.modified} removed=${r.removed}`
      );

      // If the refresh failed (or wasn't run) there's nothing to wait for —
      // a single sync pass is enough.
      if (!refreshed) break;
      if (sawChanges(r)) break;
      if (attempt < MAX_SYNC_ATTEMPTS) {
        await sleep(SYNC_POLL_INTERVAL_MS);
      }
    }

    // 4. Sandbox fallback. `/transactions/refresh` is documented as an add-on
    //    even in Sandbox, and OAuth-linked Items silently degrade to
    //    `user_good` (static data). When refresh produced no new transactions,
    //    inject one via `/sandbox/transactions/create` so the user can
    //    actually exercise the flow. This is a no-op outside Sandbox.
    if (
      config.plaid.env === 'sandbox' &&
      !sawChanges(aggregate)
    ) {
      try {
        const mock = buildSandboxMockTransaction();
        const { requestId } = await PlaidService.sandboxCreateTransactions(accessToken, [mock]);
        sandboxInjected = true;
        console.log(
          `[refresh] item ${itemId}: injected sandbox transaction ` +
            `($${mock.amount} "${mock.description}") request_id=${requestId}`
        );
        // Sandbox-create commits before returning, so a single follow-up sync
        // is sufficient.
        await sleep(500);
        const r = await this.syncItem(itemId, userId);
        aggregate.added += r.added;
        aggregate.modified += r.modified;
        aggregate.removed += r.removed;
        aggregate.errors.push(...r.errors);
        syncAttempts += 1;
        console.log(
          `[refresh] item ${itemId}: post-inject sync ` +
            `added=${r.added} modified=${r.modified} removed=${r.removed}`
        );
      } catch (error: any) {
        sandboxError =
          error?.response?.data?.error_code ||
          error?.message ||
          'Unknown sandbox-create error';
        console.warn(
          `[refresh] sandboxTransactionsCreate failed for item ${itemId}: ${sandboxError}`
        );
      }
    }

    return {
      ...aggregate,
      refreshed,
      refreshError,
      syncAttempts,
      sandboxInjected,
      sandboxError,
    };
  },

  async syncAllForUser(userId: number): Promise<Map<number, SyncResult>> {
    const items = await PlaidItemModel.findByUserId(userId);
    const results = new Map<number, SyncResult>();

    for (const item of items) {
      if (item.status === 'active') {
        const result = await this.syncItem(item.id, userId);
        results.set(item.id, result);
      }
    }

    return results;
  },

  /**
   * Run the full refresh flow (refresh + fresh balances + sync polling +
   * sandbox fallback) across every active Plaid item for a user. Used by the
   * transactions-page refresh button, where we don't know which institution
   * to target. Errors on individual items are isolated — one failing item
   * doesn't block the others.
   */
  async refreshAllForUser(userId: number): Promise<{
    items: Array<{ itemId: number; result: RefreshResult }>;
    totals: { added: number; modified: number; removed: number };
  }> {
    const items = await PlaidItemModel.findByUserId(userId);
    const itemResults: Array<{ itemId: number; result: RefreshResult }> = [];
    const totals = { added: 0, modified: 0, removed: 0 };

    for (const item of items) {
      if (item.status !== 'active') continue;
      try {
        const result = await this.refreshItem(item.id, userId);
        itemResults.push({ itemId: item.id, result });
        totals.added += result.added;
        totals.modified += result.modified;
        totals.removed += result.removed;
      } catch (error: any) {
        console.error(
          `[refresh] item ${item.id}: refreshItem threw — continuing with remaining items`,
          error
        );
        itemResults.push({
          itemId: item.id,
          result: {
            added: 0,
            modified: 0,
            removed: 0,
            errors: [error?.message || 'refreshItem threw'],
            refreshed: false,
            refreshError: error?.response?.data?.error_code || error?.message || null,
            syncAttempts: 0,
            sandboxInjected: false,
            sandboxError: null,
          },
        });
      }
    }

    return { items: itemResults, totals };
  },
};
