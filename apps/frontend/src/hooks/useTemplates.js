import { useState, useCallback } from 'react';
import { templateService } from '../services/templateService';
import toast from 'react-hot-toast';

export const useTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async (search = '', type = '') => {
    setIsLoading(true);
    try {
      const data = await templateService.getAll(search, type);
      setTemplates(data);
    } catch (error) {
      toast.error('Gagal mengambil data template');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTemplateById = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const data = await templateService.getById(id);
      setTemplate(data);
      return data;
    } catch (error) {
      toast.error('Gagal mengambil detail template');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTemplate = async (data) => {
    setIsLoading(true);
    try {
      await templateService.create(data);
      toast.success('Template berhasil dibuat');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal membuat template');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplate = async (id, data) => {
    setIsLoading(true);
    try {
      await templateService.update(id, data);
      toast.success('Template berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memperbarui template');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (id) => {
    setIsLoading(true);
    try {
      await templateService.delete(id);
      toast.success('Template berhasil dihapus');
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus template');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    templates,
    template,
    isLoading,
    fetchTemplates,
    fetchTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
};
