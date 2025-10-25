
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { Spinner } from './components/Spinner';
import { 
  generatePromptFromImage, 
  generateInspirationFromImage,
  generateImage, 
} from './services/geminiService';
import { ErrorBanner } from './components/ErrorBanner';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { WandIcon } from './components/icons/WandIcon';
import { HistorySidebar } from './components/HistorySidebar';
import { getHistory, addToHistory, clearHistory, HistoryItem } from './utils/history';
import { InspirationList } from './components/InspirationList';
import { GeneratedImageView } from './components/GeneratedImageView';
import { ImageSkeletonLoader } from './components/ImageSkeletonLoader';

const ART_STYLES = ['Photorealistic', 'Illustration', 'Anime', 'Oil Painting', 'Pixel Art', 'None'];
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface AppError {
  message: string;
  onRetry?: () => void;
}

const getStyleSuffix = (style: string): string => {
  if (!style || style === 'None') return '';
  return `, in the style of ${style.toLowerCase()}`;
};

const App: React.FC = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [inspirationPrompts, setInspirationPrompts] = useState<string[] | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  
  const [isGeneratingFromImage, setIsGeneratingFromImage] = useState(false);
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(null);
  
  const [error, setError] = useState<AppError | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError({ message: 'Invalid file type. Please upload a PNG, JPEG, or WEBP image.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        setPrompt('');
        setInspirationPrompts(null);
        setGeneratedImageData(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePromptFromImage = useCallback(async () => {
    if (!uploadedImage) {
      return;
    }

    setIsGeneratingFromImage(true);
    setPrompt('');
    setInspirationPrompts(null);
    setError(null);
    try {
      const generated = await generatePromptFromImage(uploadedImage);
      const newStyle = generated.style && ART_STYLES.includes(generated.style) ? generated.style : (generated.style || ART_STYLES[0]);
      const fullPrompt = `${generated.prompt}${getStyleSuffix(newStyle)}`;
      
      setPrompt(fullPrompt);
      setSelectedStyle(newStyle);
    } catch (err: any) {
      setError({ 
        message: err.message || 'An unexpected error occurred.',
        onRetry: handleCreatePromptFromImage,
      });
    } finally {
      setIsGeneratingFromImage(false);
    }
  }, [uploadedImage]);
  
  const handleGetInspiration = useCallback(async () => {
    if (!uploadedImage) {
      return;
    }
  
    setIsGeneratingInspiration(true);
    setPrompt('');
    setInspirationPrompts(null);
    setError(null);
    try {
      const prompts = await generateInspirationFromImage(uploadedImage);
      setInspirationPrompts(prompts);
    } catch (err: any) {
      setError({
        message: err.message || 'An unexpected error occurred while getting inspiration.',
        onRetry: handleGetInspiration,
      });
    } finally {
      setIsGeneratingInspiration(false);
    }
  }, [uploadedImage]);

  const handleSelectInspiration = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    setInspirationPrompts(null);
  };

  const handleGenerateImage = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImageData(null);
    setError(null);
    try {
      const imageData = await generateImage(prompt, uploadedImage);
      setGeneratedImageData(imageData);
      const newHistory = addToHistory({ prompt, imageData });
      setHistory(newHistory);
    } catch (err: any) {
      setError({ 
        message: err.message || 'An unexpected error occurred.',
        onRetry: handleGenerateImage,
       });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [prompt, uploadedImage]);

  const handleStyleChange = (newStyle: string) => {
    const oldSuffix = getStyleSuffix(selectedStyle);
    const newSuffix = getStyleSuffix(newStyle);
    
    let currentBase = prompt;
    if (oldSuffix && prompt.endsWith(oldSuffix)) {
        currentBase = prompt.slice(0, prompt.length - oldSuffix.length).trim().replace(/,$/, '').trim();
    }
    
    setPrompt(newSuffix ? `${currentBase}${newSuffix}` : currentBase);
    setSelectedStyle(newStyle);
  };
  
  const handleFullReset = () => {
    setUploadedImage(null);
    setPrompt('');
    setInspirationPrompts(null);
    setSelectedStyle(ART_STYLES[0]);
    setError(null);
    setGeneratedImageData(null);
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
    setPrompt(item.prompt);
    setGeneratedImageData(item.imageData);
    setInspirationPrompts(null);
    setUploadedImage(null);
    setError(null);
    setIsHistoryOpen(false);
  };
  
  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans flex flex-col">
      <Header onHistoryClick={() => setIsHistoryOpen(true)} />
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-8">
            {error && (
              <ErrorBanner 
                message={error.message} 
                onDismiss={() => setError(null)} 
                onRetry={error.onRetry}
              />
            )}
            
            <PromptInput 
              image={uploadedImage} 
              onImageChange={handleImageChange} 
              onCreatePrompt={handleCreatePromptFromImage} 
              onGetInspiration={handleGetInspiration}
              isAnalyzingImage={isGeneratingFromImage}
              isGeneratingInspiration={isGeneratingInspiration}
              showPromptingTools={!!prompt || !!inspirationPrompts}
              onImageRemove={handleFullReset} 
            />
            
            {inspirationPrompts && (
              <InspirationList 
                prompts={inspirationPrompts} 
                onSelect={handleSelectInspiration}
              />
            )}

            {prompt && !inspirationPrompts && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="block text-lg font-semibold text-slate-300">
                      1. Edit Your Prompt
                    </h2>
                    <button 
                      onClick={handleFullReset}
                      className="text-sm font-semibold text-slate-400 hover:text-yellow-400 transition-colors px-3 py-1 rounded-md hover:bg-slate-700/50"
                    >
                      Start Over
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-400 mb-2">
                      Artistic Style
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {ART_STYLES.map(style => (
                        <button key={style} onClick={() => handleStyleChange(style)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                            selectedStyle === style ? 'bg-yellow-500 text-slate-900 shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >{style}</button>
                      ))}
                      {selectedStyle && !ART_STYLES.includes(selectedStyle) && (
                        <button onClick={() => handleStyleChange(selectedStyle)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold bg-yellow-500 text-slate-900 shadow-md`}
                        >{selectedStyle} (AI)</button>
                      )}
                    </div>
                  </div>

                  <label htmlFor="prompt-editor" className="block text-sm font-semibold text-slate-400 mb-2">
                    Prompt
                  </label>
                  <textarea id="prompt-editor" rows={5}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow resize-y"
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
                
                <h2 className="text-lg font-semibold text-slate-300">
                  2. Generate Your Image
                </h2>
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

            {isGeneratingImage && <ImageSkeletonLoader hasOriginalImage={!!uploadedImage} />}

            {!isGeneratingImage && generatedImageData && (
              <GeneratedImageView
                imageData={generatedImageData}
                prompt={prompt}
                originalImage={uploadedImage}
                onDownload={handleDownload}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
