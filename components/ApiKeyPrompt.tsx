import React from 'react';
import { KeyIcon } from './icons/KeyIcon';

export const ApiKeyPrompt: React.FC = () => {
  return (
    <div className="bg-slate-900 text-white min-h-screen flex items-center justify-center font-sans p-4">
      <div className="max-w-2xl w-full bg-slate-800/50 border border-slate-700 rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-6 bg-yellow-500/10 text-yellow-400 w-16 h-16 rounded-full flex items-center justify-center">
            <KeyIcon className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-3">Welcome to PromptCraft</h1>
        <p className="text-lg text-slate-400 mb-8">
            To get started, you need to configure your Gemini API key.
        </p>

        <div className="text-left bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-slate-200">Configuration Steps</h2>
            <ol className="list-decimal list-inside text-slate-300 space-y-3">
                <li>
                    <span>Visit </span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-medium hover:underline">
                         Google AI Studio
                    </a>
                    <span> to create your API key.</span>
                </li>
                <li>
                    In your deployment service (like Vercel or Netlify), go to the environment variables settings for this project.
                </li>
                <li>
                    Create a new environment variable with the exact name{' '}
                    <code className="bg-slate-700 text-yellow-300 font-mono text-sm px-2 py-1 rounded-md">
                        API_KEY
                    </code>.
                </li>
                <li>
                    Paste your generated API key as the value for this variable and save it.
                </li>
                <li>
                    Redeploy your application for the new environment variable to take effect.
                </li>
            </ol>
        </div>
        <p className="text-xs text-slate-500 mt-6">
            Your API key is used directly from the environment and is never stored or displayed in the browser.
        </p>
      </div>
    </div>
  );
};
