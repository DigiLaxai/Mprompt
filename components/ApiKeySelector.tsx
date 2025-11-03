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
        <div className="text-center p-8 bg-white rounded-xl shadow-2xl border border-gray-200">
            <h1 className="text-2xl font-bold text-violet-500 mb-4">Enter Your Gemini API Key</h1>
            <p className="text-gray-600 mb-6">
                To use this application, you need a Google Gemini API key. Your key will be stored securely in your browser's local storage and will not be shared.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow"
                    placeholder="Enter your API key"
                    aria-label="Gemini API Key"
                />
                <button
                    type="submit"
                    disabled={!key.trim()}
                    className="w-full bg-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Save and Continue
                </button>
            </form>
            <div className="mt-8 text-left border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">How to get your API Key</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-500 text-sm">
                    <li>
                        Go to{' '}
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-500 font-semibold hover:underline"
                        >
                            Google AI Studio
                        </a>.
                    </li>
                    <li>
                        Click the <span className="font-semibold text-gray-700">"Get API key"</span> button.
                    </li>
                     <li>
                        Click <span className="font-semibold text-gray-700">"Create API key"</span>. You may need to create a new project first.
                    </li>
                    <li>
                        Copy the generated key and paste it into the field above.
                    </li>
                </ol>
            </div>
        </div>
    );
};