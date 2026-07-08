import api from './api';

export const uploadLogo = async (file) => {
  try {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await api.post('/uploads/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.url;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};
