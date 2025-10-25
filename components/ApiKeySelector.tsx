import React from 'react';

interface ApiKeySelectorProps {
    onSelectKey: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onSelectKey }) => {
    return (
        <div className="text-center p-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">API Key Required</h1>
            <p className="text-slate-300 mb-6">
                To begin, please select an API key. This key is necessary to use the Gemini API for generating prompts and images.
            </p>
            <button
                onClick={onSelectKey}
                className="w-full bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 transition-colors"
            >
                Select API Key
            </button>
        </div>
    );
};
