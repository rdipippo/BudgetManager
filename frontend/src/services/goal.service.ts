import api from './api';
import { Goal, GoalProgressPoint, GoalReductionType, GoalType } from '../types/budget.types';

export interface CreateGoalData {
  name: string;
  goalType: GoalType;
  plaidAccountId?: number | null;
  categoryId?: number | null;
  targetAmount?: number | null;
  baselineAmount?: number | null;
  targetBalance?: number | null;
  baselineTotal?: number | null;
  reductionType?: GoalReductionType | null;
  reductionAmount?: number | null;
  creditAccountIds?: number[];
  targetDate?: string | null;
}

export interface UpdateGoalData {
  name?: string;
  targetAmount?: number | null;
  baselineAmount?: number | null;
  targetBalance?: number | null;
  baselineTotal?: number | null;
  reductionType?: GoalReductionType | null;
  reductionAmount?: number | null;
  targetDate?: string | null;
  isActive?: boolean;
  creditAccountIds?: number[];
}

interface GoalDetailResponse {
  goal: Goal;
  progress: GoalProgressPoint[];
}

export const goalService = {
  async getAll(): Promise<Goal[]> {
    const response = await api.get<{ goals: Goal[] }>('/goals');
    return response.data.goals;
  },

  async getById(id: number): Promise<GoalDetailResponse> {
    const response = await api.get<GoalDetailResponse>(`/goals/${id}`);
    return response.data;
  },

  async create(data: CreateGoalData): Promise<Goal> {
    const response = await api.post<{ goal: Goal }>('/goals', data);
    return response.data.goal;
  },

  async update(id: number, data: UpdateGoalData): Promise<Goal> {
    const response = await api.put<{ goal: Goal }>(`/goals/${id}`, data);
    return response.data.goal;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/goals/${id}`);
  },
};

export default goalService;
