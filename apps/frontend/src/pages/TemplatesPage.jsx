import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiFileText, FiUpload } from 'react-icons/fi';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useTemplates } from '../hooks/useTemplates';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Badge from '../components/common/Badge';
import ImportModal from '../components/templates/ImportModal';

const TemplatesPage = () => {
  const { templates, isLoading, fetchTemplates, deleteTemplate } = useTemplates();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchTemplates(search, typeFilter);
  }, [fetchTemplates, search, typeFilter]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Template Surat"
        description="Kelola template surat resmi sekolah Anda."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FiUpload className="w-4 h-4" />
              Import Surat
            </button>
            <Link to="/templates/new">
              <Button icon={FiPlus}>Buat Template Baru</Button>
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-primary focus:border-primary bg-white outline-none"
          >
            <option value="">Semua Tipe</option>
            <option value="Panggilan Orang Tua">Panggilan Orang Tua</option>
            <option value="Surat Edaran">Surat Edaran</option>
            <option value="Surat Keterangan">Surat Keterangan</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        {isLoading && templates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiFileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Belum ada template</h3>
            <p className="text-slate-500 text-sm">Buat template pertama Anda untuk mulai men-generate surat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {templates.map((template) => (
              <div key={template.id} className="group border border-slate-200 rounded-xl bg-white hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={
                      template.letterType === 'Panggilan Orang Tua' ? 'danger' :
                      template.letterType === 'Surat Edaran' ? 'primary' : 'success'
                    }>
                      {template.letterType}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg mb-2 line-clamp-2" title={template.title}>
                    {template.title}
                  </h3>
                  <p className="text-slate-500 text-sm line-clamp-3 mb-4">
                    {template.description || 'Tidak ada deskripsi.'}
                  </p>
                  
                  {template.variables && template.variables.length > 0 && (
                    <div className="mt-auto">
                      <p className="text-xs font-medium text-slate-500 mb-2">Variabel terdeteksi:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 3).map(v => (
                          <span key={v} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {'{'}{'{'}{v}{'}'}{'}'}
                          </span>
                        ))}
                        {template.variables.length > 3 && (
                          <span className="text-[10px] text-slate-500 px-1 py-0.5">+{template.variables.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between mt-auto rounded-b-xl">
                  <span className="text-xs text-slate-500">
                    {format(new Date(template.updatedAt), 'dd MMM yyyy', { locale: localeID })}
                  </span>
                  <div className="flex gap-2">
                    <Link to={`/templates/${template.id}/edit`}>
                      <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                    </Link>
                    <button 
                      onClick={() => setDeleteId(template.id)}
                      className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Template"
        message="Apakah Anda yakin ingin menghapus template ini? Data yang sudah dihapus tidak dapat dikembalikan."
        isLoading={isLoading}
      />

      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
};

export default TemplatesPage;
