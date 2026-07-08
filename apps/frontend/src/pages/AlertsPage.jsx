import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconAlertTriangle, IconRotateClockwise, IconTrash, IconBellOff } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import unsavedTemplateStore from '../store/unsavedTemplateStore';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const refreshDrafts = () => {
    setDrafts(unsavedTemplateStore.getAll());
  };

  useEffect(() => {
    refreshDrafts();
  }, []);

  const handleRestore = () => {
    navigate('/templates/new', { state: { restoreDraft: true } });
  };

  const handleDiscard = (draftId) => {
    unsavedTemplateStore.remove(draftId);
    refreshDrafts();
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: localeID });
    } catch {
      return '';
    }
  };

  return (
    <div>
      <PageHeader
        title="Peringatan & Pemulihan"
        description="Daftar template yang belum disimpan. Pulihkan atau buang draft yang tidak diperlukan."
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <IconBellOff className="w-16 h-16 mb-4 stroke-1" />
            <p className="text-lg font-medium text-slate-500">Tidak ada peringatan</p>
            <p className="text-sm mt-1">Semua template sudah tersimpan dengan baik.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {drafts.map((draft) => (
              <div key={draft.draftId} className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <IconAlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-800 truncate">
                    {draft.title || 'Template Baru (tanpa judul)'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Disimpan {formatTime(draft.savedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(draft)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <IconRotateClockwise className="w-3.5 h-3.5" /> Pulihkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(draft.draftId)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-danger border border-danger/30 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <IconTrash className="w-3.5 h-3.5" /> Buang
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          handleDiscard(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Buang Draft?"
        message="Draft yang dibuang tidak dapat dikembalikan. Apakah Anda yakin?"
        confirmText="Ya, Buang"
        isDangerous={true}
      />
    </div>
  );
};

export default AlertsPage;
