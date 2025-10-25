
import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { XIcon } from './icons/XIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentApiKey: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [key, setKey] = useState('');

  useEffect(() => {
    if (currentApiKey) {
      setKey(currentApiKey);
    }
  }, [currentApiKey, isOpen]);

  const handleSave = () => {
    onSave(key);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in-fast"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md m-4 border border-slate-700 transform transition-transform animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <KeyIcon className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-slate-100" id="modal-title">
              Enter Your API Key
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close modal">
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-400 text-sm">
            To use this application, you need a Google AI API key. You can get one from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline font-semibold">
              Google AI Studio
            </a>.
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your API key here"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow"
            aria-labelledby="modal-title"
          />
        </div>
        <div className="flex justify-end p-5 bg-slate-800/50 border-t border-slate-700 rounded-b-xl">
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="bg-yellow-500 text-slate-900 font-bold py-2 px-5 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
          >
            Save and Close
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-fast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};
