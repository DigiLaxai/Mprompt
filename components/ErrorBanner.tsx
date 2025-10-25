
import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { XIcon } from './icons/XIcon';
import { RetryIcon } from './icons/RetryIcon';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss, onRetry }) => {
  return (
    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangleIcon className="w-6 h-6 flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 p-1.5 rounded-md text-red-200 hover:bg-red-700/50 transition-colors text-sm font-semibold"
            aria-label="Retry action"
          >
            <RetryIcon className="w-4 h-4" />
            Retry
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-full text-red-300 hover:bg-red-700/50 transition-colors"
          aria-label="Dismiss error"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
