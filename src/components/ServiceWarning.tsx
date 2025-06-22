import React from 'react';
import { X } from 'lucide-react';

interface ServiceWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title: string;
  message: string;
  requirements?: string[];
}

export const ServiceWarning: React.FC<ServiceWarningProps> = ({
  isOpen,
  onClose,
  onAccept,
  title,
  message,
  requirements
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all duration-300 scale-100 opacity-100">
        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-primary" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h3 className="text-xl font-playfair font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            
            <p className="text-gray-600 mb-4">
              {message}
            </p>

            {requirements && requirements.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <ul className="space-y-2">
                  {requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-primary mt-1">•</span>
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onAccept}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};