import api from './api';

export const studentService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/students?${query}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data.data;
  },

  create: async (data) => {
    const response = await api.post('/students', data);
    return response.data.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data.data;
  },

  importBulk: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete('/students/all/delete-all');
    return response.data;
  },

  getClasses: async () => {
    const response = await api.get('/students/classes');
    return response.data.data;
  }
};
