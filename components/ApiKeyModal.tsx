import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(currentApiKey);
    }
  }, [isOpen, currentApiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(apiKeyInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="api-key-modal-title">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
            <h3 id="api-key-modal-title" className="text-lg font-semibold text-yellow-400">Gemini API Key</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close modal">
              <CloseIcon className="w-6 h-6 text-slate-400" />
            </button>
        </div>
        
        <div className="flex-grow p-6 space-y-4 text-sm">
          <p className="text-slate-300">
            This app uses a "Bring Your Own Key" model. To generate prompts and images, you'll need a Google Gemini API key.
          </p>
          <p className="text-slate-400">
            <strong>Good news:</strong> Google provides a generous free tier to get you started. Your key is stored securely in your browser's local storage and is never sent to us.
          </p>
          <div>
            <label htmlFor="api-key-input" className="block font-medium text-slate-300 mb-2">
              Your API Key
            </label>
            <input
              id="api-key-input"
              type="password"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your API key here"
            />
          </div>
          <p className="text-xs text-slate-500">
            Click the link to get your key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
              Google AI Studio
            </a>.
          </p>
        </div>
        
        <div className="p-4 border-t border-slate-700">
            <button
                onClick={handleSave}
                disabled={!apiKeyInput.trim()}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all"
            >
                Save and Continue
            </button>
        </div>
      </div>
    </div>
  );
};
