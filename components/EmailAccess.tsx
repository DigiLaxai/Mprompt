
import React, { useState } from 'react';
import { ALLOWED_EMAILS } from '../utils/access';

interface EmailAccessProps {
    onEmailSubmit: (email: string) => void;
}

export const EmailAccess: React.FC<EmailAccessProps> = ({ onEmailSubmit }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) return;

        if (ALLOWED_EMAILS.length === 0) {
            setError("Access list is not configured. The application owner needs to add authorized emails in the 'utils/access.ts' file.");
            return;
        }

        if (ALLOWED_EMAILS.includes(trimmedEmail)) {
            setError(null);
            onEmailSubmit(trimmedEmail);
        } else {
            setError("Access denied. This email is not on the authorized list.");
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen">
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex items-center justify-center">
                <div className="max-w-lg w-full">
                    <div className="text-center p-8 bg-white rounded-xl shadow-2xl border border-gray-200">
                        <h1 className="text-2xl font-bold text-violet-500 mb-4">Welcome to PromptCraft Studio</h1>
                        <p className="text-gray-600 mb-6">
                            This is a private application. Please enter your email address to continue.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow"
                                placeholder="Enter your email"
                                aria-label="Email address"
                                required
                            />
                             {error && <p className="text-red-600 text-sm text-left px-1">{error}</p>}
                            <button
                                type="submit"
                                disabled={!email.trim()}
                                className="w-full bg-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};
