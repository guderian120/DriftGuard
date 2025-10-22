import api from './axiosConfig';
import { IaCRepository } from '../types/api';

export const iacService = {
  getIaCRepositories: async (): Promise<IaCRepository[]> => {
    const response = await api.get('/iac/');
    // Handle DRF paginated response - extract results array
    if (response.data && response.data.results) {
      return response.data.results;
    }
    // Fallback: if not paginated, return as is
    return Array.isArray(response.data) ? response.data : [];
  },

  getIaCRepository: async (id: number): Promise<IaCRepository> => {
    const response = await api.get(`/iac/${id}/`);
    return response.data;
  },

  createIaCRepository: async (data: {
    name: string;
    platform: 'github' | 'gitlab' | 'bitbucket';
    repository_url: string;
    repository_owner: string;
    repository_name: string;
    branch: string;
    iac_type: string;
    github_token?: string;
  }): Promise<IaCRepository> => {
    const response = await api.post('/iac/', data);
    return response.data;
  },

  updateIaCRepository: async (id: number, data: Partial<IaCRepository>): Promise<IaCRepository> => {
    const response = await api.patch(`/iac/${id}/`, data);
    return response.data;
  },

  deleteIaCRepository: async (id: number): Promise<void> => {
    await api.delete(`/iac/${id}/`);
  },

  scanRepository: async (id: number): Promise<{ message: string; status: string }> => {
    const response = await api.post(`/iac/${id}/scan/`);
    return response.data;
  },

  getRepositoryResources: async (id: number): Promise<any[]> => {
    const response = await api.get(`/iac/${id}/resources/`);
    return response.data.results || response.data;
  }
};
