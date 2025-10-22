import api from './axiosConfig';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string;
  contact_email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users_count?: number;
  environments_count?: number;
}

export interface OrganizationSettings {
  id?: number;
  organization: number;
  drift_detection_enabled: boolean;
  auto_analysis_enabled: boolean;
  email_notifications: boolean;
  slack_integration: boolean;
  slack_webhook_url?: string;
  audit_logging: boolean;
  session_timeout: number;
  gemini_ai_enabled: boolean;
  ml_retraining_enabled: boolean;
}

export interface OrganizationMember {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  organization_name: string;
  last_login?: string;
  date_joined: string;
}

export interface MemberInviteRequest {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  first_name?: string;
  last_name?: string;
}

export interface MemberInviteResponse extends OrganizationMember {
  _temp_password?: string;
  note?: string;
}

export const organizationsService = {
  getOrganizations: async (): Promise<Organization[]> => {
    const response = await api.get('/organizations/');
    if (response.data && response.data.results) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  getOrganization: async (id: number): Promise<Organization> => {
    const response = await api.get(`/organizations/${id}/`);
    return response.data;
  },

  createOrganization: async (orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> => {
    const response = await api.post('/organizations/', orgData);
    return response.data;
  },

  updateOrganization: async (id: number, orgData: Partial<Organization>): Promise<Organization> => {
    const response = await api.patch(`/organizations/${id}/`, orgData);
    return response.data;
  },

  deleteOrganization: async (id: number): Promise<void> => {
    await api.delete(`/organizations/${id}/`);
  },

  getOrganizationStats: async (id: number) => {
    const response = await api.get(`/organizations/${id}/stats/`);
    return response.data;
  },

  getOrganizationSettings: async (id: number): Promise<OrganizationSettings> => {
    const response = await api.get(`/organizations/${id}/settings/`);
    return response.data;
  },

  updateOrganizationSettings: async (id: number, settings: Partial<OrganizationSettings>): Promise<OrganizationSettings> => {
    const response = await api.put(`/organizations/${id}/settings/`, settings);
    return response.data;
  },

  // Member management endpoints
  getOrganizationMembers: async (id: number): Promise<OrganizationMember[]> => {
    const response = await api.get(`/organizations/${id}/members/`);
    return response.data;
  },

  inviteMember: async (id: number, inviteData: MemberInviteRequest): Promise<MemberInviteResponse> => {
    const response = await api.post(`/organizations/${id}/invite_member/`, inviteData);
    return response.data;
  },

  updateMember: async (id: number, userId: number, memberData: Partial<Pick<OrganizationMember, 'role' | 'is_active'>>): Promise<OrganizationMember> => {
    const response = await api.put(`/organizations/${id}/members/${userId}/`, memberData);
    return response.data;
  },

  removeMember: async (id: number, userId: number): Promise<void> => {
    await api.delete(`/organizations/${id}/members/${userId}/`);
  }
};
