import api from './api';
import { Budget, BudgetSummary, Transaction } from '../types/budget.types';

export interface CreateBudgetData {
  categoryId: number;
  amount: number;
  startDay?: number;
}

export interface UpdateBudgetData {
  amount?: number;
  startDay?: number;
  isActive?: boolean;
}

interface BudgetDetailResponse {
  budget: Budget;
  transactions: Transaction[];
  periodStart: string;
  periodEnd: string;
}

export const budgetService = {
  async getAll(): Promise<Budget[]> {
    const response = await api.get<{ budgets: Budget[] }>('/budgets');
    return response.data.budgets;
  },

  async getSummary(): Promise<BudgetSummary> {
    const response = await api.get<BudgetSummary>('/budgets/summary');
    return response.data;
  },

  async getById(id: number): Promise<BudgetDetailResponse> {
    const response = await api.get<BudgetDetailResponse>(`/budgets/${id}`);
    return response.data;
  },

  async create(data: CreateBudgetData): Promise<Budget> {
    const response = await api.post<{ budget: Budget }>('/budgets', data);
    return response.data.budget;
  },

  async update(id: number, data: UpdateBudgetData): Promise<Budget> {
    const response = await api.put<{ budget: Budget }>(`/budgets/${id}`, data);
    return response.data.budget;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/budgets/${id}`);
  },
};

export default budgetService;
