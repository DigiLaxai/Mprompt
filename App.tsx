
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { Spinner } from './components/Spinner';
import { Footer } from './components/Footer';
import { generatePromptFromImage, generateImage, ApiKeyNotFoundError } from './services/geminiService';
import { ErrorBanner } from './components/ErrorBanner';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { WandIcon } from './components/icons/WandIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { HistorySidebar } from './components/HistorySidebar';
import { getHistory, addToHistory, clearHistory, HistoryItem } from './utils/history';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';


const ART_STYLES = ['Photorealistic', 'Illustration', 'Anime', 'Oil Painting', 'Pixel Art', 'None'];

const getStyleSuffix = (style: string): string => {
  if (!style || style === 'None') return '';
  return `, in the style of ${style.toLowerCase()}`;
};

const App: React.FC = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  
  const [isGeneratingFromImage, setIsGeneratingFromImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const apiKey = process.env.API_KEY;

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleApiCall = async (apiFunction: () => Promise<any>) => {
    setError(null);
    try {
      return await apiFunction();
    } catch (err: any) {
      if (err instanceof ApiKeyNotFoundError) {
        setError("Your API Key is invalid. Please check the 'API_KEY' environment variable in your deployment settings.");
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      throw err; // Re-throw to be caught by the calling function's finally block
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePromptFromImage = useCallback(async () => {
    if (!uploadedImage) return;

    setIsGeneratingFromImage(true);
    setPrompt('');
    try {
      const generated = await handleApiCall(() => generatePromptFromImage(uploadedImage));
      const defaultStyle = ART_STYLES[0];
      setPrompt(generated + getStyleSuffix(defaultStyle));
      setSelectedStyle(defaultStyle);
    } catch (err) {
      // Error is already handled by handleApiCall
    } finally {
      setIsGeneratingFromImage(false);
    }
  }, [uploadedImage]);

  const handleGenerateImage = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGeneratingImage(true);
    setGeneratedImageData(null);
    try {
      // Pass uploadedImage to retain the original image context for editing.
      const imageData = await handleApiCall(() => generateImage(prompt, uploadedImage));
      setGeneratedImageData(imageData);
      const newHistory = addToHistory({ prompt, imageData });
      setHistory(newHistory);
    } catch (err) {
        // Error is already handled by handleApiCall
    } finally {
      setIsGeneratingImage(false);
    }
  }, [prompt, uploadedImage]);

  const handleStyleChange = (newStyle: string) => {
    const oldSuffix = getStyleSuffix(selectedStyle);
    const newSuffix = getStyleSuffix(newStyle);
    let currentBase = prompt;
    if (oldSuffix && prompt.endsWith(oldSuffix)) {
        currentBase = prompt.slice(0, prompt.length - oldSuffix.length);
    }
    setPrompt(currentBase + newSuffix);
    setSelectedStyle(newStyle);
  };
  
  const handleStartOver = () => {
    setPrompt('');
    setSelectedStyle(ART_STYLES[0]);
    setError(null);
    setGeneratedImageData(null);
  };
  
  const handleFullReset = () => {
    setUploadedImage(null);
    handleStartOver();
  }

  const handleCopy = useCallback(() => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  }, [prompt]);

  const handleDownload = () => {
    if (!generatedImageData) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImageData}`;
    const filename = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 50) || 'generated-image';
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setUploadedImage(null);
    setPrompt(item.prompt);
    setGeneratedImageData(item.imageData);
    setSelectedStyle(ART_STYLES.find(s => getStyleSuffix(s) && item.prompt.endsWith(getStyleSuffix(s))) || 'None');
    setError(null);
    setIsHistoryOpen(false);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setIsHistoryOpen(false);
  };
  
  if (!apiKey) {
    return <ApiKeyPrompt />;
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans flex flex-col">
      <Header 
        onHistoryClick={() => setIsHistoryOpen(true)}
      />

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-3xl mx-auto space-y-8">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          
          <PromptInput
            image={uploadedImage}
            onImageChange={handleImageChange}
            onCreatePrompt={handleCreatePromptFromImage}
            isLoading={isGeneratingFromImage}
            hasPrompt={!!prompt}
            onImageRemove={handleFullReset}
          />

          {prompt && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                <label className="block text-lg font-semibold text-slate-300 mb-3">
                  1. Choose an Artistic Style
                </label>
                <div className="flex flex-wrap gap-3">
                  {ART_STYLES.map(style => (
                    <button key={style} onClick={() => handleStyleChange(style)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedStyle === style ? 'bg-yellow-500 text-slate-900 shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >{style}</button>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                <label htmlFor="prompt-editor" className="block text-lg font-semibold text-slate-300 mb-3">
                  2. Refine Your Prompt
                </label>
                <textarea id="prompt-editor" rows={5}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow resize-y"
                  value={prompt} onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row-reverse gap-4">
                <button onClick={handleGenerateImage} disabled={isGeneratingImage || !prompt.trim()}
                  className="w-full sm:flex-grow flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
                >
                  {isGeneratingImage ? <><Spinner small /> Generating...</> : <><WandIcon className="w-5 h-5" /> Generate Image</>}
                </button>
                <button onClick={handleCopy} disabled={!prompt.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  {isCopied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {isGeneratingImage && <Spinner />}

          {generatedImageData && (
            <div className="space-y-6 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
              <h2 className="text-lg font-semibold text-slate-300">3. Your Generated Image</h2>
              <img src={`data:image/png;base64,${generatedImageData}`} alt="Generated by AI"
                className="w-full h-auto rounded-lg border-2 border-slate-700"
              />
              <button onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 transition-all"
              >
                <DownloadIcon className="w-5 h-5" /> Download Image
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
