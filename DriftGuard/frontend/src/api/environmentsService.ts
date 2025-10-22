import api from './axiosConfig';
import { Environment } from '../types/api';

export const environmentsService = {
  getEnvironments: async (): Promise<Environment[]> => {
    const response = await api.get('/environments/');
    // Handle DRF paginated response - extract results array
    if (response.data && response.data.results) {
      return response.data.results;
    }
    // Fallback: if not paginated, return as is
    return Array.isArray(response.data) ? response.data : [];
  },

  getEnvironment: async (id: number): Promise<Environment> => {
    const response = await api.get(`/environments/${id}/`);
    return response.data;
  },

  createEnvironment: async (environmentData: {
    name: string;
    cloud_provider: string;
    region: string;
    account_id: string;
  }): Promise<Environment> => {
    const response = await api.post('/environments/', environmentData);
    return response.data;
  },

  updateEnvironment: async (id: number, environmentData: Partial<Environment>): Promise<Environment> => {
    const response = await api.patch(`/environments/${id}/`, environmentData);
    return response.data;
  },

  deleteEnvironment: async (id: number): Promise<void> => {
    await api.delete(`/environments/${id}/`);
  },

  setEnvironmentCredentials: async (id: number, credentialsData: {
    credential_type: string;
    name: string;
    aws_access_key_id?: string;
    aws_secret_access_key?: string;
    aws_role_arn?: string;
  }) => {
    const response = await api.post(`/environments/${id}/credentials/`, credentialsData);
    return response.data;
  }
};
