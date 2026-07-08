import api from './api';

export const templateService = {
  getAll: async (search = '', type = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    const response = await api.get(`/templates?${params.toString()}`);
    return response.data.data;
  },

  getById: async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data.data;
  },

  create: async (data) => {
    const response = await api.post('/templates', data);
    return response.data.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data.data;
  },

  importDoc: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/templates/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }
};
