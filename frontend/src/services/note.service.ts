import api from './api';

export type NoteEntityType = 'plaid_account' | 'category' | 'monthly_budget';

export interface Note {
  id: number;
  owner_user_id: number;
  author_user_id: number;
  entity_type: NoteEntityType;
  entity_id: number;
  budget_year: number | null;
  budget_month: number | null;
  body: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_email: string;
}

export interface NoteParams {
  entityType: NoteEntityType;
  entityId: number;
  year?: number;
  month?: number;
}

export const noteService = {
  async getByEntity(params: NoteParams): Promise<Note[]> {
    const query = new URLSearchParams({
      entityType: params.entityType,
      entityId: String(params.entityId),
      ...(params.year !== undefined ? { year: String(params.year) } : {}),
      ...(params.month !== undefined ? { month: String(params.month) } : {}),
    });
    const response = await api.get<{ notes: Note[] }>(`/notes?${query}`);
    return response.data.notes;
  },

  async create(params: NoteParams & { body: string }): Promise<Note> {
    const response = await api.post<{ note: Note }>('/notes', {
      entityType: params.entityType,
      entityId: params.entityId,
      body: params.body,
      ...(params.year !== undefined ? { year: params.year } : {}),
      ...(params.month !== undefined ? { month: params.month } : {}),
    });
    return response.data.note;
  },

  async update(id: number, body: string): Promise<Note> {
    const response = await api.put<{ note: Note }>(`/notes/${id}`, { body });
    return response.data.note;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/notes/${id}`);
  },
};
