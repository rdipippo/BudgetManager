import api from './api';
import { Category } from '../types/budget.types';

export interface CreateCategoryData {
  name: string;
  color?: string;
  icon?: string;
  parentId?: number;
  isIncome?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
  icon?: string;
  parentId?: number | null;
  sortOrder?: number;
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const response = await api.get<{ categories: Category[] }>('/categories');
    return response.data.categories;
  },

  async getById(id: number): Promise<Category> {
    const response = await api.get<{ category: Category }>(`/categories/${id}`);
    return response.data.category;
  },

  async create(data: CreateCategoryData): Promise<Category> {
    const response = await api.post<{ category: Category }>('/categories', data);
    return response.data.category;
  },

  async update(id: number, data: UpdateCategoryData): Promise<Category> {
    const response = await api.put<{ category: Category }>(`/categories/${id}`, data);
    return response.data.category;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};

export default categoryService;
