import api from './api';

export const teacherService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/teachers?${query}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/teachers/${id}`);
    return response.data.data;
  },

  create: async (data) => {
    const response = await api.post('/teachers', data);
    return response.data.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/teachers/${id}`, data);
    return response.data.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/teachers/${id}`);
    return response.data.data;
  },

  importBulk: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/teachers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete('/teachers/all/delete-all');
    return response.data;
  },
};
