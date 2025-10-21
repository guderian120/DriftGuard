import api from './axiosConfig';
import { DriftEvent } from '../types/api';

export const driftsService = {
  getDrifts: async (): Promise<DriftEvent[]> => {
    const response = await api.get('/drifts/');
    // Handle DRF paginated response - extract results array
    if (response.data && response.data.results) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  getDrift: async (id: number): Promise<DriftEvent> => {
    const response = await api.get(`/drifts/${id}/`);
    return response.data;
  },

  updateDrift: async (id: number, driftData: Partial<DriftEvent>): Promise<DriftEvent> => {
    const response = await api.patch(`/drifts/${id}/`, driftData);
    return response.data;
  },

  resolveDrift: async (id: number, resolutionType: string, resolutionNotes?: string): Promise<DriftEvent> => {
    const response = await api.post(`/drifts/${id}/resolve/`, {
      resolution_type: resolutionType,
      resolution_notes: resolutionNotes || '',
    });
    return response.data;
  },

  analyzeDrift: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/drifts/${id}/analyze/`, { context });
    return response.data;
  },

  getDriftSummary: async () => {
    const response = await api.get('/drifts/summary/');
    return response.data;
  }
};
