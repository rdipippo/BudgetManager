import api from './api';
import { CategorizationRule } from '../types/budget.types';

export interface CreateRuleData {
  categoryId: number;
  name: string;
  matchType: 'merchant' | 'description' | 'amount_range' | 'combined';
  merchantPattern?: string;
  descriptionPattern?: string;
  amountMin?: number;
  amountMax?: number;
  isExactMatch?: boolean;
  priority?: number;
}

export interface UpdateRuleData {
  categoryId?: number;
  name?: string;
  matchType?: 'merchant' | 'description' | 'amount_range' | 'combined';
  merchantPattern?: string | null;
  descriptionPattern?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
  isExactMatch?: boolean;
  priority?: number;
  isActive?: boolean;
}

export const ruleService = {
  async getAll(): Promise<CategorizationRule[]> {
    const response = await api.get<{ rules: CategorizationRule[] }>('/rules');
    return response.data.rules;
  },

  async getById(id: number): Promise<CategorizationRule> {
    const response = await api.get<{ rule: CategorizationRule }>(`/rules/${id}`);
    return response.data.rule;
  },

  async create(data: CreateRuleData): Promise<CategorizationRule> {
    const response = await api.post<{ rule: CategorizationRule }>('/rules', data);
    return response.data.rule;
  },

  async update(id: number, data: UpdateRuleData): Promise<CategorizationRule> {
    const response = await api.put<{ rule: CategorizationRule }>(`/rules/${id}`, data);
    return response.data.rule;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/rules/${id}`);
  },

  async applyRules(): Promise<{ categorizedCount: number }> {
    const response = await api.post<{ categorizedCount: number }>('/rules/apply');
    return response.data;
  },
};

export default ruleService;
