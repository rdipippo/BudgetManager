import api from './api';
import { User } from './auth.service';

export const adminService = {
  async getUsers(): Promise<User[]> {
    const response = await api.get<{ users: User[] }>('/admin/users');
    return response.data.users;
  },

  async toggleUserEnabled(userId: number, enabled: boolean): Promise<{ message: string }> {
    const response = await api.patch(`/admin/users/${userId}/enabled`, { enabled });
    return response.data;
  },

  async resetUserPassword(userId: number): Promise<{ message: string }> {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },

  async toggleUserRole(userId: number, role: string): Promise<{ message: string }> {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
};

export default adminService;
