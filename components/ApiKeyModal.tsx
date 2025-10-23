import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { KeyIcon } from './icons/KeyIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentKey: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentKey }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (currentKey) {
      setApiKey(currentKey);
    }
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  const hasKey = !!currentKey;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md relative">
        <div className="p-8 text-center">
          {hasKey && (
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close modal">
              <CloseIcon className="w-6 h-6 text-slate-400" />
            </button>
          )}

          <KeyIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">{hasKey ? 'API Key Settings' : 'API Key Required'}</h2>
          <p className="text-slate-400 mb-6">
            Please enter your Google Gemini API key. It will be saved securely in your browser's local storage.
          </p>
          
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key here"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow text-center"
          />

          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="w-full mt-4 bg-yellow-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            Save Key
          </button>
          
          <p className="text-xs text-slate-500 mt-4">
            You can get a key from{' '}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-400"
            >
              Google AI Studio
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};