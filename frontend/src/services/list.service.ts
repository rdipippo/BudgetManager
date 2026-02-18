import api from './api';
import { List, ListItem } from '../types/budget.types';

export interface CreateListData {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateListData {
  name?: string;
  color?: string;
  icon?: string;
}

export interface CreateListItemData {
  name: string;
}

export interface UpdateListItemData {
  name?: string;
  isCompleted?: boolean;
  sortOrder?: number;
}

export const listService = {
  async getAll(): Promise<List[]> {
    const response = await api.get<{ lists: List[] }>('/lists');
    return response.data.lists;
  },

  async getById(id: number): Promise<{ list: List; items: ListItem[] }> {
    const response = await api.get<{ list: List; items: ListItem[] }>(`/lists/${id}`);
    return response.data;
  },

  async create(data: CreateListData): Promise<List> {
    const response = await api.post<{ list: List }>('/lists', data);
    return response.data.list;
  },

  async update(id: number, data: UpdateListData): Promise<List> {
    const response = await api.put<{ list: List }>(`/lists/${id}`, data);
    return response.data.list;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/lists/${id}`);
  },

  async createItem(listId: number, data: CreateListItemData): Promise<ListItem> {
    const response = await api.post<{ item: ListItem }>(`/lists/${listId}/items`, data);
    return response.data.item;
  },

  async updateItem(listId: number, itemId: number, data: UpdateListItemData): Promise<ListItem> {
    const response = await api.put<{ item: ListItem }>(`/lists/${listId}/items/${itemId}`, data);
    return response.data.item;
  },

  async toggleItem(listId: number, itemId: number): Promise<ListItem> {
    const response = await api.patch<{ item: ListItem }>(`/lists/${listId}/items/${itemId}/toggle`);
    return response.data.item;
  },

  async deleteItem(listId: number, itemId: number): Promise<void> {
    await api.delete(`/lists/${listId}/items/${itemId}`);
  },
};

export default listService;
