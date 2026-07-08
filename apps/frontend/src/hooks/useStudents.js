import { useState, useCallback } from 'react';
import { studentService } from '../services/studentService';
import toast from 'react-hot-toast';

export const useStudents = () => {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fetchStudents = useCallback(async (params = {}) => {
    setIsLoading(true);
    try {
      const { data, meta } = await studentService.getAll(params);
      setStudents(data);
      setMeta(meta);
    } catch (error) {
      toast.error('Gagal mengambil data siswa');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createStudent = async (data) => {
    setIsLoading(true);
    try {
      await studentService.create(data);
      toast.success('Data siswa berhasil ditambahkan');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menambahkan siswa');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateStudent = async (id, data) => {
    setIsLoading(true);
    try {
      await studentService.update(id, data);
      toast.success('Data siswa berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memperbarui siswa');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStudent = async (id) => {
    setIsLoading(true);
    try {
      await studentService.delete(id);
      toast.success('Data siswa berhasil dihapus');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus siswa');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const importStudents = async (file) => {
    setIsImporting(true);
    try {
      const res = await studentService.importBulk(file);
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

  const deleteAllStudents = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.deleteAll();
      toast.success(res.message || 'Semua data siswa berhasil dihapus');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus semua data siswa');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    students,
    meta,
    isLoading,
    isImporting,
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    deleteAllStudents
  };
};
