
import React, { useState } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [key, setKey] = useState(currentApiKey);

  const handleSave = () => {
    onSave(key);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      aria-hidden="true"
    >
      <div 
        className="relative bg-slate-800 w-full max-w-md m-4 p-6 rounded-xl shadow-2xl border border-slate-700"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-title"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <KeyIcon className="w-6 h-6 text-yellow-400" />
            <h2 id="api-key-title" className="text-xl font-semibold text-slate-200">
              Gemini API Key
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-slate-400 mb-4 text-sm">
          Your API key is stored locally in your browser. Need a key?{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 underline font-semibold"
          >
            Get one from Google AI Studio
          </a>.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKeyInput" className="block text-sm font-medium text-slate-400 mb-1">
              API Key
            </label>
            <input
              id="apiKeyInput"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="w-full bg-yellow-500 text-slate-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};
