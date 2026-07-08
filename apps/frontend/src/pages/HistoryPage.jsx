import React, { useEffect, useState, useMemo } from 'react';
import { FiDownload, FiTrash2, FiClock, FiCheckCircle, FiXCircle, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useGenerator } from '../hooks/useGenerator';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Button from '../components/common/Button';
import api from '../services/api';

const HistoryPage = () => {
  const { logs, meta, isLoading, fetchLogs, deleteLog } = useGenerator();
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchLogs({ page, limit: 10 });
  }, [fetchLogs, page]);

  useEffect(() => {
    const hasActiveJobs = logs.some(log => log.status === 'PENDING' || log.status === 'PROCESSING');
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        fetchLogs({ page, limit: 10 });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [logs, fetchLogs, page]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteLog(deleteId);
      setDeleteId(null);
      fetchLogs({ page, limit: 10 });
    }
  };

  const handleDownload = async (id, outputType) => {
    try {
      const token = (await import('../store/authStore')).useAuthStore.getState().accessToken;
      const { API_URL } = await import('../constants');
      
      const response = await fetch(`${API_URL}/generate/download/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Download gagal');

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      let filename = outputType === 'ZIP_BUNDLE' ? 'dokumen.zip' : 'dokumen.pdf';
      
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      fetchLogs({ page, limit: 10 });
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const StatusBadge = ({ status, errorMessage }) => {
    const config = {
      PENDING: { color: 'bg-slate-100 text-slate-600', icon: FiClock, label: 'Menunggu' },
      PROCESSING: { color: 'bg-blue-100 text-blue-700', icon: FiRefreshCw, label: 'Diproses' },
      COMPLETED: { color: 'bg-green-100 text-green-700', icon: FiCheckCircle, label: 'Selesai' },
      FAILED: { color: 'bg-red-100 text-red-700', icon: FiXCircle, label: 'Gagal' },
    };
    const c = config[status] || config.PENDING;
    const Icon = c.icon;

    return (
      <span className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.color} ${status === 'PROCESSING' ? 'animate-pulse' : ''}`}>
          <Icon className={`w-3.5 h-3.5 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
          {c.label}
        </span>
        {status === 'FAILED' && errorMessage && (
          <span className="group relative">
            <FiAlertTriangle className="w-4 h-4 text-red-500 cursor-help" />
            <span className="absolute left-0 bottom-full mb-2 w-72 p-2 bg-red-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 break-words">
              {errorMessage}
            </span>
          </span>
        )}
      </span>
    );
  };

  const columns = useMemo(() => [
    { 
      header: 'Waktu Proses', 
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <div className="text-slate-600">
          <div>{format(new Date(row.original.createdAt), 'dd MMM yyyy', { locale: localeID })}</div>
          <div className="text-xs">{format(new Date(row.original.createdAt), 'HH:mm', { locale: localeID })}</div>
        </div>
      )
    },
    { 
      header: 'Template', 
      accessorKey: 'template',
      cell: ({ row }) => <span className="font-medium text-slate-800">{row.original.template?.title || 'Terhapus'}</span>
    },
    { 
      header: 'Siswa', 
      accessorKey: 'studentCount',
      cell: ({ row }) => (
        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">
          {row.original.studentCount} Siswa
        </span>
      )
    },
    { 
      header: 'Format', 
      accessorKey: 'outputType',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${row.original.outputType === 'PDF_SINGLE' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
          {row.original.outputType === 'PDF_SINGLE' ? 'PDF' : 'ZIP'}
        </span>
      )
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} errorMessage={row.original.errorMessage} />
    },
    {
      header: 'Aksi',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleDownload(row.original.id, row.original.outputType)} 
            disabled={row.original.status !== 'COMPLETED'}
            className="p-1.5 text-primary hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Download Hasil"
          >
            <FiDownload className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setDeleteId(row.original.id)} 
            className="p-1.5 text-danger hover:bg-red-50 rounded transition-colors"
            title="Hapus Riwayat"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], []);

  return (
    <div>
      <PageHeader
        title="Riwayat Generate"
        description="Pantau status pembuatan dokumen dan unduh hasilnya di sini."
        actions={
          <Button variant="secondary" icon={FiRefreshCw} onClick={() => fetchLogs({ page, limit: 10 })} isLoading={isLoading}>
            Refresh
          </Button>
        }
      />

      <DataTable 
        data={logs}
        columns={columns}
        isLoading={isLoading}
        pagination={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Riwayat & File"
        message="Apakah Anda yakin ingin menghapus riwayat ini? File PDF/ZIP yang berkaitan di server juga akan ikut terhapus selamanya."
        isLoading={isLoading}
      />
    </div>
  );
};

export default HistoryPage;
