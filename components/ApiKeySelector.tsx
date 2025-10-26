import React, { useState } from 'react';

interface ApiKeySelectorProps {
    onKeySubmit: (key: string) => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySubmit }) => {
    const [key, setKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onKeySubmit(key.trim());
        }
    };

    return (
        <div className="text-center p-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">Enter Your Gemini API Key</h1>
            <p className="text-slate-300 mb-6">
                To use this application, you need a Google Gemini API key. Your key will be stored securely in your browser's local storage and will not be shared.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow"
                    placeholder="Enter your API key"
                    aria-label="Gemini API Key"
                />
                <button
                    type="submit"
                    disabled={!key.trim()}
                    className="w-full bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    Save and Continue
                </button>
            </form>
            <div className="mt-8 text-left border-t border-slate-700 pt-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-3">How to get your API Key</h2>
                <ol className="list-decimal list-inside space-y-2 text-slate-400 text-sm">
                    <li>
                        Go to{' '}
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 font-semibold hover:underline"
                        >
                            Google AI Studio
                        </a>.
                    </li>
                    <li>
                        Click the <span className="font-semibold text-slate-300">"Get API key"</span> button.
                    </li>
                     <li>
                        Click <span className="font-semibold text-slate-300">"Create API key"</span>. You may need to create a new project first.
                    </li>
                    <li>
                        Copy the generated key and paste it into the field above.
                    </li>
                </ol>
            </div>
        </div>
    );
};