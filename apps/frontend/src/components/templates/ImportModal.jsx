import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiFile, FiX, FiAlertCircle } from 'react-icons/fi';
import { templateService } from '../../services/templateService';
import toast from 'react-hot-toast';

const ImportModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    setError('');
    const f = acceptedFiles[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['docx', 'pdf', 'txt'].includes(ext)) {
      setError('Format file tidak didukung. Gunakan file .docx, .pdf, atau .txt');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB');
      return;
    }
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await templateService.importDoc(file);
      toast.success('File berhasil diimport!');
      onClose();
      navigate('/templates/new', {
        state: {
          importedHtml: result.html,
          importedCss: result.css || '',
          importedFileName: result.fileName,
          importedVariables: result.detectedVariables,
        }
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal mengimport file';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Import File Surat</h2>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-500 mb-4">
            Upload file contoh surat ({'.docx'}, {'.pdf'}, atau {'.txt'}). File akan dikonversi ke HTML dan dapat diedit menjadi template baru.
          </p>

          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiUploadCloud className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                {isDragActive ? 'Lepaskan file di sini...' : 'Tarik & lepas file di sini'}
              </p>
              <p className="text-xs text-slate-500">atau klik untuk memilih file</p>
              <p className="text-xs text-slate-400 mt-2">
                Format: .docx, .pdf, .txt (maks. 10MB)
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiFile className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="p-1.5 text-slate-400 hover:text-danger rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 text-sm text-danger bg-danger/5 rounded-lg p-3">
              <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses...
              </>
            ) : (
              'Import & Edit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
