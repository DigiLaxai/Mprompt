
import React, { useState } from 'react';
import { ALLOWED_EMAILS } from '../utils/access';

interface EmailAccessProps {
    onEmailSubmit: (email: string) => void;
}

export const EmailAccess: React.FC<EmailAccessProps> = ({ onEmailSubmit }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Fetches the list of authorized emails.
     * In a real application, you would replace the logic here with a `fetch` call
     * to your secure backend endpoint that reads from your Google Sheet.
     * @returns {Promise<string[]>} A promise that resolves to an array of email strings.
     */
    const getAuthorizedEmails = async (): Promise<string[]> => {
        // --- PRODUCTION: Replace this with your backend endpoint ---
        // try {
        //   const response = await fetch('https://your-backend-function.com/api/get-emails');
        //   if (!response.ok) throw new Error('Failed to fetch email list');
        //   const data = await response.json();
        //   return data.emails; // Assuming your API returns { emails: [...] }
        // } catch (error) {
        //   console.error("Failed to fetch authorized emails:", error);
        //   setError("Could not retrieve the list of authorized users. Please contact the administrator.");
        //   return []; // Return empty on failure
        // }
        
        // For development, we'll simulate a network request and use the local list.
        console.warn("Using local email list for development. Replace getAuthorizedEmails implementation for production.");
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(ALLOWED_EMAILS);
            }, 500);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const authorizedEmails = await getAuthorizedEmails();

            if (authorizedEmails.length === 0 && !error) { // Check if error was already set by fetcher
                 if (ALLOWED_EMAILS.length === 0) {
                    setError("Access list is not configured. The application owner needs to add authorized emails in the 'utils/access.ts' file or configure a backend.");
                } else {
                    setError("Access list is empty or could not be loaded. Please contact the application owner.");
                }
                return; // Stop execution
            }

            if (authorizedEmails.map(e => e.toLowerCase()).includes(trimmedEmail)) {
                onEmailSubmit(trimmedEmail);
            } else {
                setError("Access denied. This email is not on the authorized list.");
            }
        } catch (err) {
            setError("An error occurred while verifying your email. Please try again.");
        } finally {
            setIsLoading(false);
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
                                disabled={isLoading}
                            />
                             {error && <p className="text-red-600 text-sm text-left px-1">{error}</p>}
                            <button
                                type="submit"
                                disabled={!email.trim() || isLoading}
                                className="w-full flex justify-center items-center bg-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Verifying...
                                    </>
                                ) : (
                                    'Continue'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};
