import api from './api';

export interface Invitation {
  id: number;
  owner_user_id: number;
  invitee_email: string;
  access_type: 'full' | 'partial' | 'advisor';
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface Member {
  id: number;
  owner_user_id: number;
  member_user_id: number;
  access_type: 'full' | 'partial' | 'advisor';
  revoked: boolean;
  created_at: string;
  member_email: string;
  member_first_name: string | null;
  member_last_name: string | null;
}

export interface InvitationDetails {
  id: number;
  inviteeEmail: string;
  accessType: 'full' | 'partial' | 'advisor';
  ownerName: string;
  ownerEmail: string;
  expiresAt: string;
}

export interface SendInvitationData {
  email: string;
  accessType: 'full' | 'partial' | 'advisor';
  allowedAccountIds?: number[];
}

export interface AcceptInvitationData {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const invitationService = {
  async sendInvitation(data: SendInvitationData): Promise<{ message: string }> {
    const response = await api.post('/invitations', data);
    return response.data;
  },

  async getInvitations(): Promise<{ invitations: Invitation[] }> {
    const response = await api.get('/invitations');
    return response.data;
  },

  async revokeInvitation(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/invitations/${id}`);
    return response.data;
  },

  async getMembers(): Promise<{ members: Member[] }> {
    const response = await api.get('/invitations/members');
    return response.data;
  },

  async removeMember(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/invitations/members/${id}`);
    return response.data;
  },

  async getInvitationDetails(token: string): Promise<{ invitation: InvitationDetails }> {
    const response = await api.get(`/invitations/details/${token}`);
    return response.data;
  },

  async acceptInvitation(data: AcceptInvitationData): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: {
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      email_verified: boolean;
      role: string;
      enabled: boolean;
      created_at: string;
    };
  }> {
    const response = await api.post('/invitations/accept', data);
    return response.data;
  },
};

export default invitationService;
