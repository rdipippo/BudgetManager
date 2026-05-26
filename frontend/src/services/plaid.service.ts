import api from './api';
import { PlaidItem } from '../types/budget.types';

interface LinkTokenResponse {
  linkToken: string;
  expiration: string;
}

interface ExchangeTokenResponse {
  message: string;
  itemId: number;
  institutionName: string | null;
  accountsLinked: number;
  transactionsSynced: number;
}

interface SyncResponse {
  message: string;
  added: number;
  modified: number;
  removed: number;
  errors: string[];
  /** True if Plaid accepted the on-demand /transactions/refresh request. */
  refreshed?: boolean;
  /** Plaid error code if the on-demand refresh failed (sync still ran). */
  refreshError?: string | null;
  /** Number of /transactions/sync polling attempts that ran. */
  syncAttempts?: number;
  /** Sandbox-only: true if a mock transaction was injected as a fallback. */
  sandboxInjected?: boolean;
  /** Plaid error code from the sandbox-create fallback, if it failed. */
  sandboxError?: string | null;
}

export const plaidService = {
  async createLinkToken(): Promise<string> {
    const response = await api.post<LinkTokenResponse>('/plaid/create-link-token');
    return response.data.linkToken;
  },

  async exchangeToken(publicToken: string): Promise<ExchangeTokenResponse> {
    const response = await api.post<ExchangeTokenResponse>('/plaid/exchange-token', { publicToken });
    return response.data;
  },

  async getItems(): Promise<PlaidItem[]> {
    const response = await api.get<{ items: PlaidItem[] }>('/plaid/items');
    return response.data.items;
  },

  async syncItem(itemId: number): Promise<SyncResponse> {
    const response = await api.post<SyncResponse>(`/plaid/items/${itemId}/sync`);
    return response.data;
  },

  /**
   * Refresh every linked Plaid item for the current user. Backed by the same
   * refreshItem flow as `syncItem` (transactions/refresh + fresh balances +
   * sync polling + sandbox fallback) but fanned out across all institutions.
   * Used by the transactions-page refresh button.
   */
  async refreshAll(): Promise<{
    itemCount: number;
    added: number;
    modified: number;
    removed: number;
  }> {
    const response = await api.post<{
      itemCount: number;
      added: number;
      modified: number;
      removed: number;
    }>('/plaid/refresh-all');
    return response.data;
  },

  async deleteItem(itemId: number): Promise<void> {
    await api.delete(`/plaid/items/${itemId}`);
  },

  async setAccountHidden(accountId: number, hidden: boolean): Promise<void> {
    await api.patch(`/plaid/accounts/${accountId}/visibility`, { hidden });
  },

  async getAllAccounts(): Promise<{ id: number; name: string; institutionName: string | null; isHidden: boolean }[]> {
    const items = await this.getItems();
    return items.flatMap((item) =>
      item.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        institutionName: item.institutionName,
        isHidden: account.isHidden,
      }))
    );
  },

  async getBalanceHistory(
    accountIds: number[],
    days: number
  ): Promise<{ accounts: { id: number; name: string; currentBalance: number | null; history: { date: string; balance: number | null }[] }[] }> {
    const response = await api.get('/plaid/accounts/balance-history', {
      params: { accountIds: accountIds.join(','), days },
    });
    return response.data;
  },
};

export default plaidService;
