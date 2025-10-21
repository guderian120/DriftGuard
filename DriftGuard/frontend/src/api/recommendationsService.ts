import api from './axiosConfig';
import { Recommendation } from '../types/api';

export const recommendationsService = {
  getRecommendations: async (): Promise<Recommendation[]> => {
    const response = await api.get('/recommendations/');
    // Handle DRF paginated response - extract results array
    if (response.data && response.data.results) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  getRecommendation: async (id: number): Promise<Recommendation> => {
    const response = await api.get(`/recommendations/${id}/`);
    return response.data;
  },

  implementRecommendation: async (id: number, result?: any): Promise<Recommendation> => {
    const response = await api.post(`/recommendations/${id}/implement/`, {
      result: result || {},
    });
    return response.data;
  },
};
