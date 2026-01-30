import api from './api';
import { Transaction, TransactionFilters, Pagination } from '../types/budget.types';

export interface CreateTransactionData {
  amount: number;
  date: string;
  merchantName?: string;
  description?: string;
  categoryId?: number;
  notes?: string;
}

export interface UpdateTransactionData {
  amount?: number;
  date?: string;
  merchantName?: string;
  description?: string;
  categoryId?: number | null;
  notes?: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: Pagination;
}

export const transactionService = {
  async getAll(filters: TransactionFilters = {}): Promise<TransactionsResponse> {
    const params = new URLSearchParams();

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.categoryId !== undefined) {
      params.append('categoryId', filters.categoryId === null ? 'null' : String(filters.categoryId));
    }
    if (filters.accountId) params.append('accountId', String(filters.accountId));
    if (filters.search) params.append('search', filters.search);
    if (filters.uncategorized) params.append('uncategorized', 'true');
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));

    const response = await api.get<TransactionsResponse>(`/transactions?${params.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<Transaction> {
    const response = await api.get<{ transaction: Transaction }>(`/transactions/${id}`);
    return response.data.transaction;
  },

  async create(data: CreateTransactionData): Promise<Transaction> {
    const response = await api.post<{ transaction: Transaction }>('/transactions', data);
    return response.data.transaction;
  },

  async update(id: number, data: UpdateTransactionData): Promise<Transaction> {
    const response = await api.put<{ transaction: Transaction }>(`/transactions/${id}`, data);
    return response.data.transaction;
  },

  async updateCategory(id: number, categoryId: number | null): Promise<Transaction> {
    const response = await api.put<{ transaction: Transaction }>(`/transactions/${id}/category`, { categoryId });
    return response.data.transaction;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },
};

export default transactionService;
