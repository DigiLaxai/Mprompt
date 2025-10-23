import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { Spinner } from './components/Spinner';
import { Footer } from './components/Footer';
import { HistorySidebar } from './components/HistorySidebar';
import { generatePromptFromImage, RateLimitError, ApiKeyError } from './services/geminiService';
import { ErrorBanner } from './components/ErrorBanner';
import { HistoryItem, getHistory, saveHistory } from './utils/history';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';

// FIX: Removed redundant `declare global` block for `window.aistudio` to fix type conflict.
// The type is likely defined in a global typings file.

type Stage = 'UPLOADING' | 'PROMPTING';

const ART_STYLES = ['Photorealistic', 'Illustration', 'Anime', 'Oil Painting', 'Pixel Art', 'None'];
const COOLDOWN_DURATION = 60; // 60 seconds

const getStyleSuffix = (style: string): string => {
  if (!style || style === 'None') {
    return '';
  }
  return `, in the style of ${style.toLowerCase()}`;
};

const App: React.FC = () => {
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [stage, setStage] = useState<Stage>('UPLOADING');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeyConfigured(hasKey);
      } catch (e) {
        console.error("Error checking for API key:", e);
        setIsKeyConfigured(false);
      } finally {
        setCheckingKey(false);
      }
    };
    checkApiKey();
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    if (isRateLimited && cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (isRateLimited && cooldownSeconds <= 0) {
      setIsRateLimited(false);
      setError(null); // Clear the rate limit message
    }
  }, [isRateLimited, cooldownSeconds]);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        setStage('UPLOADING'); // Reset stage if a new image is uploaded
        setEditablePrompt('');
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setUploadedImage(null);
    setEditablePrompt('');
    setStage('UPLOADING');
    setError(null);
  };
  
  const handleCreatePrompt = useCallback(async () => {
    if (!uploadedImage || isRateLimited) return;

    setIsLoadingPrompt(true);
    setError(null);
    try {
      const prompt = await generatePromptFromImage(uploadedImage);
      const defaultStyle = ART_STYLES[0];
      
      setEditablePrompt(prompt + getStyleSuffix(defaultStyle));
      setSelectedStyle(defaultStyle);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        uploadedImage: uploadedImage,
        basePrompt: prompt,
        selectedStyle: defaultStyle,
      };
      const updatedHistory = [newHistoryItem, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      saveHistory(updatedHistory);

      setStage('PROMPTING');
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        setError(err.message);
        setIsRateLimited(true);
        setCooldownSeconds(COOLDOWN_DURATION);
      } else if (err instanceof ApiKeyError) {
        setError(err.message);
        setIsKeyConfigured(false); // Key is invalid, prompt user to select a new one
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      setStage('UPLOADING');
    } finally {
      setIsLoadingPrompt(false);
    }
  }, [uploadedImage, history, isRateLimited]);

  const handleStyleChange = (newStyle: string) => {
    const oldSuffix = getStyleSuffix(selectedStyle);
    const newSuffix = getStyleSuffix(newStyle);

    let currentBase = editablePrompt;
    if (oldSuffix && editablePrompt.endsWith(oldSuffix)) {
        currentBase = editablePrompt.slice(0, editablePrompt.length - oldSuffix.length);
    }
    
    setEditablePrompt(currentBase + newSuffix);
    setSelectedStyle(newStyle);
  };

  const handleStartOver = () => {
    setUploadedImage(null);
    setEditablePrompt('');
    setSelectedStyle(ART_STYLES[0]);
    setStage('UPLOADING');
    setError(null);
    setIsRateLimited(false);
    setCooldownSeconds(0);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setUploadedImage(item.uploadedImage);
    setSelectedStyle(item.selectedStyle);
    setEditablePrompt(item.basePrompt + getStyleSuffix(item.selectedStyle));
    setStage('PROMPTING');
    setIsHistoryOpen(false);
    setError(null);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        setHistory([]);
        saveHistory([]);
    }
  };

  const handleCopy = useCallback(() => {
    if (!editablePrompt) return;
    navigator.clipboard.writeText(editablePrompt).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  }, [editablePrompt]);

  const handleClearError = () => setError(null);

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success and optimistically update the UI
      setIsKeyConfigured(true);
      setError(null);
    } catch (e) {
      console.error("Error opening key selection:", e);
      setError("Failed to open the API key selection dialog.");
    }
  };

  if (checkingKey) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isKeyConfigured) {
    return <ApiKeyPrompt onSelectKey={handleSelectKey} error={error} />;
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans flex flex-col">
      <Header onHistoryClick={() => setIsHistoryOpen(true)} />
      
      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onLoad={loadFromHistory}
        onClear={handleClearHistory}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          {error && (
            <ErrorBanner message={error} onDismiss={isRateLimited ? () => {} : handleClearError} />
          )}
          
          {stage === 'UPLOADING' && (
            <PromptInput
              image={uploadedImage}
              onImageChange={handleImageChange}
              onImageRemove={handleImageRemove}
              onCreatePrompt={handleCreatePrompt}
              isLoading={isLoadingPrompt}
              isRateLimited={isRateLimited}
            />
          )}

          {isLoadingPrompt && <Spinner />}
          
          {stage === 'PROMPTING' && uploadedImage && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-slate-300">1. Your Image</h2>
                <img 
                  src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} 
                  alt="Uploaded content" 
                  className="rounded-xl shadow-lg border-2 border-slate-700 w-full max-w-sm mx-auto"
                />
              </div>

              <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                <label className="block text-lg font-semibold text-slate-300 mb-3">
                  2. Choose an Artistic Style
                </label>
                <div className="flex flex-wrap gap-3">
                  {ART_STYLES.map(style => (
                    <button
                      key={style}
                      onClick={() => handleStyleChange(style)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedStyle === style
                          ? 'bg-yellow-500 text-slate-900 shadow-md'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                <label htmlFor="prompt-editor" className="block text-lg font-semibold text-slate-300 mb-3">
                  3. Your Generated Prompt
                </label>
                <textarea
                  id="prompt-editor"
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow resize-y"
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  placeholder="Describe your vision..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                 <button
                  onClick={handleStartOver}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!editablePrompt.trim()}
                  className="w-full sm:flex-grow flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-5 h-5" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;