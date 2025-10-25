
import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { KeyIcon } from './icons/KeyIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(currentApiKey || '');
    }
  }, [isOpen, currentApiKey]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(apiKey);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fade-in-fast"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <CloseIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <KeyIcon className="w-6 h-6 text-yellow-400"/>
            <h2 id="api-key-title" className="text-xl font-semibold text-slate-200">
              API Key
            </h2>
          </div>
          
          <p className="text-slate-400 text-sm mb-4">
            Your API key is stored locally in your browser and is never sent to our servers.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="api-key-input" className="block text-sm font-medium text-slate-300 mb-1">
                Gemini API Key
              </label>
              <input
                id="api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow"
                placeholder="Enter your API key"
              />
            </div>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-500 hover:text-yellow-400 transition-colors">
              Get an API Key from Google AI Studio
            </a>
          </div>
        </div>

        <div className="bg-slate-800/50 px-6 py-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="bg-yellow-500 text-slate-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
