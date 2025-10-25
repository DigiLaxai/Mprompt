
import React, { useState } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [key, setKey] = useState(currentApiKey || '');

  const handleSave = () => {
    onSave(key);
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="api-key-title">
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 id="api-key-title" className="text-xl font-bold text-slate-200 flex items-center gap-2">
              <KeyIcon className="w-6 h-6 text-yellow-400" />
              Google AI API Key
            </h2>
             <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700" aria-label="Close modal">
              <CloseIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <p className="text-slate-400 mb-4 text-sm">
            To use this application, you need a Google AI API key. Your key is stored securely in your browser's local storage and is never sent to our servers.
          </p>
          <div className="mb-4">
            <label htmlFor="apiKeyInput" className="block text-sm font-semibold text-slate-400 mb-2">
              Enter your API Key
            </label>
            <input
              id="apiKeyInput"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your API key here"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow"
            />
          </div>
           <p className="text-xs text-slate-500 mb-6">
            You can get your free API key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
              Google AI Studio
            </a>.
          </p>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="w-full bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
          >
            Save and Continue
          </button>
        </div>
      </div>
    </div>
  );
};
