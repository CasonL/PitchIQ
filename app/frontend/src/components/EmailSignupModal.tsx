import React, { useEffect } from 'react';
import EmailSignup from './EmailSignup'; // Assuming EmailSignup.tsx is in the same directory
import { X } from 'lucide-react';

interface EmailSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmailSignupModal: React.FC<EmailSignupModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      window.addEventListener('keydown', handleEsc);
      // Dispatch highlight event when modal opens
      // Use a slight delay to ensure the component is rendered
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('highlightEmailSignup', { detail: { targetId: 'modal-email-signup' } }));
      }, 100);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose} // Close modal if backdrop is clicked
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md relative transform transition-all duration-300 ease-out scale-95 group-[.open]:scale-100"
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 z-10"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        <div className="p-6 sm:p-8">
          {/* The EmailSignup component will use the id 'modal-email-signup' for highlighting */}
          <EmailSignup id="modal-email-signup" />
        </div>
      </div>
    </div>
  );
};

export default EmailSignupModal; 