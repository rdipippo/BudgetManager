import { PlaidService } from './plaid.service';
import { EncryptionService } from './encryption.service';
import { PlaidItemModel, PlaidAccountModel, TransactionModel } from '../models';
import { Transaction as PlaidTransaction } from 'plaid';

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  errors: string[];
}

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

      while (hasMore) {
        const syncResult = await PlaidService.syncTransactions(accessToken, cursor);

        // Process added transactions
        for (const plaidTx of syncResult.added) {
          try {
            const dbAccountId = accountMap.get(plaidTx.account_id);
            if (!dbAccountId) {
              // Account might be new, try to sync accounts first
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
            if (!dbAccountId) continue;

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

  async syncAccounts(itemId: number): Promise<void> {
    const item = await PlaidItemModel.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const accessToken = EncryptionService.decrypt(item.access_token_encrypted);
    const accounts = await PlaidService.getAccounts(accessToken);

    for (const account of accounts) {
      await PlaidAccountModel.upsert({
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
    }
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
};
