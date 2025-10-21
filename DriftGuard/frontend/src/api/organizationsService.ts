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
  }
};
