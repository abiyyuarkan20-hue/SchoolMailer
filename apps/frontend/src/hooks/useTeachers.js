import { useState, useCallback } from 'react';
import { teacherService } from '../services/teacherService';
import toast from 'react-hot-toast';

export const useTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fetchTeachers = useCallback(async (params = {}) => {
    setIsLoading(true);
    try {
      const { data, meta } = await teacherService.getAll(params);
      setTeachers(data);
      setMeta(meta);
    } catch (error) {
      toast.error('Gagal mengambil data guru');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTeacher = async (data) => {
    setIsLoading(true);
    try {
      await teacherService.create(data);
      toast.success('Data guru berhasil ditambahkan');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menambahkan guru');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTeacher = async (id, data) => {
    setIsLoading(true);
    try {
      await teacherService.update(id, data);
      toast.success('Data guru berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memperbarui guru');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTeacher = async (id) => {
    setIsLoading(true);
    try {
      await teacherService.delete(id);
      toast.success('Data guru berhasil dihapus');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus guru');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const importTeachers = async (file) => {
    setIsImporting(true);
    try {
      const res = await teacherService.importBulk(file);
      toast.success(res.message || 'Import data berhasil');
      return res;
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mengimpor data';
      toast.error(msg);
      if (error.response?.data?.details) {
        console.error('Import Errors:', error.response.data.details);
      }
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  const deleteAllTeachers = async () => {
    setIsLoading(true);
    try {
      const res = await teacherService.deleteAll();
      toast.success(res.message || 'Semua data guru berhasil dihapus');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus semua data guru');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    teachers,
    meta,
    isLoading,
    isImporting,
    fetchTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    importTeachers,
    deleteAllTeachers,
  };
};
