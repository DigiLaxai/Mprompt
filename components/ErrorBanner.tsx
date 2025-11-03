import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { XIcon } from './icons/XIcon';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <AlertTriangleIcon className="w-6 h-6 flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1.5 rounded-full text-red-800 hover:bg-red-200/50 transition-colors"
        aria-label="Dismiss error"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};