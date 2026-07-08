import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud } from 'react-icons/fi';

const Dropzone = ({ onFileDrop, accept, maxSize = 5242880, isLoading }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      onFileDrop(acceptedFiles[0]);
    }
  }, [onFileDrop]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: isLoading
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-blue-50' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}
        ${isDragReject ? 'border-danger bg-red-50' : ''}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiUploadCloud className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-blue-500'}`} />
      </div>
      <h3 className="text-lg font-medium text-slate-800 mb-1">
        {isDragActive ? 'Lepaskan file di sini' : 'Drag & drop file di sini'}
      </h3>
      <p className="text-sm text-slate-500 mb-4">Atau klik untuk memilih file dari komputer Anda.</p>
      
      <div className="text-xs text-slate-400">
        Mendukung .xlsx dan .csv (Maks 5MB)
      </div>
    </div>
  );
};

export default Dropzone;
