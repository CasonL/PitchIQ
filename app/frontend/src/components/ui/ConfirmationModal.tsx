import React from 'react';
import { Button } from './button'; // Assuming Button component is in the same directory or accessible
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Continue',
  cancelButtonText = 'Cancel',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <AlertTriangle className="text-yellow-500 mr-3 h-6 w-6" />
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </Button>
        </div>
        <div className="text-sm text-gray-600 mb-6 whitespace-pre-line">
          {message}
        </div>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="px-4 py-2">
            {cancelButtonText}
          </Button>
          <Button variant="default" onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2">
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 