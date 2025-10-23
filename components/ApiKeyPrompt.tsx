import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface ApiKeyPromptProps {
  onSelectKey: () => void;
  error?: string | null;
}

export const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onSelectKey, error }) => {
  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 p-8 rounded-2xl shadow-lg border border-slate-700 text-center">
        <AlertTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Configuration Required</h1>
        <p className="text-slate-400 mb-6">
          To use this application, you need to select a Google Gemini API key. Your key is stored securely and is never shared.
        </p>
        
        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-left text-sm mb-6">
                <p>{error}</p>
            </div>
        )}

        <button
          onClick={onSelectKey}
          className="w-full bg-yellow-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-colors"
        >
          Select API Key
        </button>
        <p className="text-xs text-slate-500 mt-4">
          Using the Gemini API may incur costs. Please review the{' '}
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-yellow-400"
          >
            billing documentation
          </a>{' '}
          for details.
        </p>
      </div>
    </div>
  );
};
