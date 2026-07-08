import api from './api';

export const generatorService = {
  generate: async (data) => {
    const response = await api.post('/generate', data);
    return response.data.data;
  },

  getLogs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/generate/logs?${query}`);
    return response.data;
  },

  deleteLog: async (id) => {
    const response = await api.delete(`/generate/logs/${id}`);
    return response.data.data;
  }
};
