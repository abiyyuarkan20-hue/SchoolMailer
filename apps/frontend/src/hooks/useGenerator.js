import { useState, useCallback } from 'react';
import { generatorService } from '../services/generatorService';
import toast from 'react-hot-toast';

export const useGenerator = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async (params = {}) => {
    setIsLoading(true);
    try {
      const { data, meta } = await generatorService.getLogs(params);
      setLogs(data);
      setMeta(meta);
    } catch (error) {
      toast.error('Gagal mengambil riwayat');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateDocs = async (data) => {
    setIsLoading(true);
    try {
      await generatorService.generate(data);
      toast.success('Proses generate sedang berjalan di background');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memulai proses generate');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLog = async (id) => {
    setIsLoading(true);
    try {
      await generatorService.deleteLog(id);
      toast.success('Riwayat berhasil dihapus');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus riwayat');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    logs,
    meta,
    isLoading,
    fetchLogs,
    generateDocs,
    deleteLog
  };
};
