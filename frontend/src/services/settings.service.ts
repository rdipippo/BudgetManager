import { api } from './api';

export interface TransactionColumnConfig {
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

export const settingsService = {
  async getTransactionPreferences(): Promise<TransactionColumnConfig> {
    const response = await api.get<TransactionColumnConfig>('/settings/transactions');
    return response.data;
  },

  async updateTransactionPreferences(config: Partial<TransactionColumnConfig>): Promise<TransactionColumnConfig> {
    const response = await api.put<TransactionColumnConfig>('/settings/transactions', config);
    return response.data;
  },
};
