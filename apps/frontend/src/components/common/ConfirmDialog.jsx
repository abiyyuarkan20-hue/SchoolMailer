import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isLoading = false,
  confirmText = 'Ya, Hapus',
  confirmButtonProps = {},
  isDangerous = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {!isDangerous && (
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <FiAlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-slate-600">{message}</p>
          </div>
        </div>
      )}

      {isDangerous && (
        <div className="mb-6">
          {typeof message === 'string' ? (
            <p className="text-slate-600">{message}</p>
          ) : (
            message
          )}
        </div>
      )}
      
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Batal
        </Button>
        <Button 
          variant="danger" 
          onClick={onConfirm} 
          isLoading={isLoading}
          {...confirmButtonProps}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
