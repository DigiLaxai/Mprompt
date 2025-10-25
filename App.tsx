

import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { Spinner } from './components/Spinner';
import { Footer } from './components/Footer';
import { HistorySidebar } from './components/HistorySidebar';
import { generatePromptFromImage, generateImageFromPrompt } from './services/geminiService';
import { ErrorBanner } from './components/ErrorBanner';
import { HistoryItem, getHistory, saveHistory } from './utils/history';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { WandIcon } from './components/icons/WandIcon';
import { GeneratedImageModal } from './components/GeneratedImageModal';
import { ApiKeySelector } from './components/ApiKeySelector';
import { XIcon } from './components/icons/XIcon';

type Stage = 'UPLOADING' | 'PROMPTING';

const ART_STYLES = ['Photorealistic', 'Illustration', 'Anime', 'Oil Painting', 'Pixel Art', 'None'];
const API_KEY_STORAGE_KEY = 'gemini-api-key';

const getStyleSuffix = (style: string): string => {
  if (!style || style === 'None') {
    return '';
  }
  return `, in the style of ${style.toLowerCase()}`;
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [stage, setStage] = useState<Stage>('UPLOADING');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }
    setIsInitializing(false);
    setHistory(getHistory());
  }, []);

  const handleKeySubmit = (key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        setStage('UPLOADING');
        setEditablePrompt('');
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setUploadedImage(null);
    setEditablePrompt('');
    setStage('UPLOADING');
    setGeneratedImage(null);
    setError(null);
  };
  
  const handleCreatePrompt = useCallback(async () => {
    if (!uploadedImage || !apiKey) return;

    setIsLoadingPrompt(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const prompt = await generatePromptFromImage(uploadedImage, apiKey);
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
      if (err.message?.includes('API key not valid') || err.message?.includes('API_KEY_INVALID')) {
        setError('Your API key is invalid. Please enter a new one.');
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        setApiKey(null);
      } else {
        setError(err.message || 'Failed to generate prompt from image.');
      }
      setStage('UPLOADING');
    } finally {
      setIsLoadingPrompt(false);
    }
  }, [uploadedImage, history, apiKey]);

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
    setGeneratedImage(null);
    setError(null);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setUploadedImage(item.uploadedImage);
    setSelectedStyle(item.selectedStyle);
    setEditablePrompt(item.basePrompt + getStyleSuffix(item.selectedStyle));
    setGeneratedImage(item.generatedImage || null);
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

  const handleGenerateImage = useCallback(async () => {
      if (!editablePrompt.trim() || !apiKey) return;

      setIsGeneratingImage(true);
      setError(null);
      try {
        const image = await generateImageFromPrompt(editablePrompt, apiKey);
        setGeneratedImage(image);
        setIsModalOpen(true);

        // Update history with the generated image
        const latestHistoryItem = history[0];
        if (latestHistoryItem && latestHistoryItem.basePrompt + getStyleSuffix(latestHistoryItem.selectedStyle) === editablePrompt) {
          const updatedItem = { ...latestHistoryItem, generatedImage: image };
          const updatedHistory = [updatedItem, ...history.slice(1)];
          setHistory(updatedHistory);
          saveHistory(updatedHistory);
        }
      } catch (err: any) {
        if (err.message?.includes('API key not valid') || err.message?.includes('API_KEY_INVALID')) {
          setError('Your API key is invalid. Please enter a new one.');
          localStorage.removeItem(API_KEY_STORAGE_KEY);
          setApiKey(null);
        } else {
          setError(err.message || 'Failed to generate image.');
        }
      } finally {
        setIsGeneratingImage(false);
      }
  }, [editablePrompt, history, selectedStyle, apiKey]);


  const handleClearError = () => setError(null);

  if (isInitializing) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="bg-slate-900 min-h-screen">
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex items-center justify-center">
            <div className="max-w-md w-full">
              {error && <ErrorBanner message={error} onDismiss={handleClearError} />}
              <ApiKeySelector onKeySubmit={handleKeySubmit} />
            </div>
          </main>
      </div>
    );
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

      <GeneratedImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageData={generatedImage}
        prompt={editablePrompt}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          {error && (
            <ErrorBanner message={error} onDismiss={handleClearError} />
          )}
          
          {stage === 'UPLOADING' && (
            <PromptInput
              image={uploadedImage}
              onImageChange={handleImageChange}
              onImageRemove={handleImageRemove}
              onCreatePrompt={handleCreatePrompt}
              isLoading={isLoadingPrompt}
            />
          )}

          {isLoadingPrompt && <Spinner />}
          
          {stage === 'PROMPTING' && uploadedImage && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-slate-300">1. Your Image</h2>
                <div className="relative w-full max-w-sm mx-auto">
                  <img 
                    src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} 
                    alt="Uploaded content" 
                    className="rounded-xl shadow-lg border-2 border-slate-700 w-full"
                  />
                  <button 
                    onClick={handleStartOver}
                    className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-500 text-white rounded-full p-2 shadow-lg transition-transform transform hover:scale-110"
                    aria-label="Start over"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
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

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button
                    onClick={handleCopy}
                    disabled={!editablePrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-300 ease-in-out"
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
                  <button
                    onClick={handleGenerateImage}
                    disabled={!editablePrompt.trim() || isGeneratingImage}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-emerald-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-300 ease-in-out"
                  >
                    {isGeneratingImage ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <WandIcon className="w-5 h-5" />
                        Generate Image
                      </>
                    )}
                  </button>
                </div>
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