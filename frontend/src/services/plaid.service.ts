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
};

export default plaidService;
