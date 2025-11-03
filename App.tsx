
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { Spinner } from './components/Spinner';
import { Footer } from './components/Footer';
import { HistorySidebar } from './components/HistorySidebar';
import { generatePromptVariationsFromImage, generateImageFromPrompt } from './services/geminiService';
import { ErrorBanner } from './components/ErrorBanner';
import { HistoryItem, getHistory, saveHistory } from './utils/history';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { WandIcon } from './components/icons/WandIcon';
import { GeneratedImageModal } from './components/GeneratedImageModal';
import { ApiKeySelector } from './components/ApiKeySelector';
import { XIcon } from './components/icons/XIcon';
import { PromptCard } from './components/PromptCard';
import { DocumentIcon } from './components/icons/DocumentIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { BookIcon } from './components/icons/BookIcon';
import { EmailAccess } from './components/EmailAccess';
import { ALLOWED_EMAILS } from './utils/access';

type Stage = 'INPUT' | 'VARIATIONS' | 'EDIT';

const ART_STYLES = ['Photorealistic', 'Illustration', 'Anime', 'Oil Painting', 'Pixel Art', 'None'];
const CAMERA_FRAMING_OPTIONS = ['Full Shot', 'Medium Shot', 'Close-up', 'Extreme Close-up', 'None'];
const LIGHTING_OPTIONS = ['Cinematic Lighting', 'Golden Hour', 'Studio Lighting', 'Backlit', 'None'];

const API_KEY_STORAGE_KEY = 'gemini-api-key';
const EMAIL_STORAGE_KEY = 'promptcraft-user-email';

const VARIATION_TITLES = [
  { title: 'Descriptive', icon: <DocumentIcon className="w-5 h-5" /> },
  { title: 'Evocative', icon: <SparklesIcon className="w-5 h-5" /> },
  { title: 'Narrative', icon: <BookIcon className="w-5 h-5" /> },
];


const getStyleSuffix = (style: string): string => {
  if (!style || style === 'None') return '';
  return `, in the style of ${style.toLowerCase()}`;
};

const getFramingSuffix = (framing: string): string => {
  if (!framing || framing === 'None') return '';
  return `, ${framing.toLowerCase()}`;
};

const getLightingSuffix = (lighting: string): string => {
  if (!lighting || lighting === 'None') return '';
  return `, ${lighting.toLowerCase()}`;
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [stage, setStage] = useState<Stage>('INPUT');
  
  const [promptVariations, setPromptVariations] = useState<string[]>([]);
  const [basePrompt, setBasePrompt] = useState('');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  const [selectedFraming, setSelectedFraming] = useState(CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1]);
  const [selectedLighting, setSelectedLighting] = useState(LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1]);

  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const updateEditablePrompt = useCallback((base: string, style: string, framing: string, lighting: string) => {
    setEditablePrompt(base + getStyleSuffix(style) + getFramingSuffix(framing) + getLightingSuffix(lighting));
  }, []);
  
  useEffect(() => {
    const storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);
    if (storedEmail && ALLOWED_EMAILS.length > 0 && ALLOWED_EMAILS.includes(storedEmail)) {
      setAuthenticatedEmail(storedEmail);
    } else {
      localStorage.removeItem(EMAIL_STORAGE_KEY);
    }

    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }
    setIsInitializing(false);
    setHistory(getHistory());
  }, []);

  const handleEmailSubmit = (email: string) => {
    setAuthenticatedEmail(email);
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
    setError(null);
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out? This will also clear your saved API key.')) {
      setAuthenticatedEmail(null);
      setApiKey(null);
      localStorage.removeItem(EMAIL_STORAGE_KEY);
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      handleStartOver();
    }
  };

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
        
        // Reset the state for a new image without clearing the image itself
        setBasePrompt('');
        setEditablePrompt('');
        setSelectedStyle(ART_STYLES[0]);
        setSelectedFraming(CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1]);
        setSelectedLighting(LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1]);
        setStage('INPUT');
        setGeneratedImage(null);
        setError(null);
        setPromptVariations([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    handleStartOver();
  };
  
  const handleCreatePrompt = useCallback(async () => {
    if (!uploadedImage || !apiKey) return;

    setIsLoadingPrompt(true);
    setError(null);
    setGeneratedImage(null);
    setEditablePrompt('');
    setBasePrompt('');
    setPromptVariations([]);

    try {
      const variations = await generatePromptVariationsFromImage(uploadedImage, apiKey);
      setPromptVariations(variations);
      setStage('VARIATIONS');
    } catch (err: any) {
      if (err.message?.includes('API key not valid') || err.message?.includes('API_KEY_INVALID')) {
        setError('Your API key is invalid. Please enter a new one.');
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        setApiKey(null);
      } else {
        setError(err.message || 'Failed to generate prompt from image.');
      }
      setStage('INPUT');
    } finally {
      setIsLoadingPrompt(false);
    }
  }, [uploadedImage, apiKey]);

  const handleSelectVariation = useCallback((selectedPrompt: string) => {
    const defaultStyle = ART_STYLES[0];
    const defaultFraming = CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1];
    const defaultLighting = LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1];
    
    setBasePrompt(selectedPrompt);
    setSelectedStyle(defaultStyle);
    setSelectedFraming(defaultFraming);
    setSelectedLighting(defaultLighting);
    updateEditablePrompt(selectedPrompt, defaultStyle, defaultFraming, defaultLighting);
    setStage('EDIT');

    const newHistoryItem: HistoryItem = {
      id: Date.now(),
      uploadedImage: uploadedImage!,
      basePrompt: selectedPrompt,
      selectedStyle: defaultStyle,
      selectedFraming: defaultFraming,
      selectedLighting: defaultLighting,
    };
    const updatedHistory = [newHistoryItem, ...history.slice(0, 19)];
    setHistory(updatedHistory);
    saveHistory(updatedHistory);
  }, [uploadedImage, history, updateEditablePrompt]);

  const updateHistoryWithOptions = useCallback((options: Partial<HistoryItem>) => {
    const latestHistoryItem = history[0];
    if (latestHistoryItem && latestHistoryItem.basePrompt === basePrompt) {
        const updatedItem = { ...latestHistoryItem, ...options };
        const updatedHistory = [updatedItem, ...history.slice(1)];
        setHistory(updatedHistory);
        saveHistory(updatedHistory);
    }
  }, [history, basePrompt]);

  const handleStyleChange = (newStyle: string) => {
    if (!basePrompt) return;
    setSelectedStyle(newStyle);
    updateEditablePrompt(basePrompt, newStyle, selectedFraming, selectedLighting);
    updateHistoryWithOptions({ selectedStyle: newStyle });
  };

  const handleFramingChange = (newFraming: string) => {
    if (!basePrompt) return;
    setSelectedFraming(newFraming);
    updateEditablePrompt(basePrompt, selectedStyle, newFraming, selectedLighting);
    updateHistoryWithOptions({ selectedFraming: newFraming });
  };

  const handleLightingChange = (newLighting: string) => {
    if (!basePrompt) return;
    setSelectedLighting(newLighting);
    updateEditablePrompt(basePrompt, selectedStyle, selectedFraming, newLighting);
    updateHistoryWithOptions({ selectedLighting: newLighting });
  };

  const handleStartOver = () => {
    setUploadedImage(null);
    setBasePrompt('');
    setEditablePrompt('');
    setSelectedStyle(ART_STYLES[0]);
    setSelectedFraming(CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1]);
    setSelectedLighting(LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1]);
    setStage('INPUT');
    setGeneratedImage(null);
    setError(null);
    setPromptVariations([]);
  };

  const loadFromHistory = (item: HistoryItem) => {
    const framing = item.selectedFraming || CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1];
    const lighting = item.selectedLighting || LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1];

    setUploadedImage(item.uploadedImage);
    setBasePrompt(item.basePrompt);
    setSelectedStyle(item.selectedStyle);
    setSelectedFraming(framing);
    setSelectedLighting(lighting);
    updateEditablePrompt(item.basePrompt, item.selectedStyle, framing, lighting);
    setGeneratedImage(item.generatedImage || null);
    setStage('EDIT');
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

    if (!uploadedImage) {
      setError('An uploaded image is required to generate a new image.');
      return;
    }

    setIsGeneratingImage(true);
    setError(null);
    try {
      const image = await generateImageFromPrompt(editablePrompt, uploadedImage, apiKey);
      setGeneratedImage(image);
      setIsModalOpen(true);

      const latestHistoryItem = history[0];
      if (latestHistoryItem && latestHistoryItem.basePrompt === basePrompt) {
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
  }, [editablePrompt, history, basePrompt, apiKey, uploadedImage]);


  const handleClearError = () => setError(null);

  if (isInitializing) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!authenticatedEmail) {
    return <EmailAccess onEmailSubmit={handleEmailSubmit} />;
  }

  if (!apiKey) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <Header 
          onHistoryClick={() => {}} 
          authenticatedEmail={authenticatedEmail} 
          onSignOut={handleSignOut} 
        />
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex items-center justify-center">
            <div className="max-w-lg w-full">
              {error && <ErrorBanner message={error} onDismiss={handleClearError} />}
              <ApiKeySelector onKeySubmit={handleKeySubmit} />
            </div>
          </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans flex flex-col">
      <Header 
        onHistoryClick={() => setIsHistoryOpen(true)}
        authenticatedEmail={authenticatedEmail}
        onSignOut={handleSignOut} 
      />
      
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
          
          {stage === 'INPUT' && (
            <PromptInput
              image={uploadedImage}
              onImageChange={handleImageChange}
              onImageRemove={handleImageRemove}
              onCreatePrompt={handleCreatePrompt}
              isLoading={isLoadingPrompt}
            />
          )}

          {isLoadingPrompt && <Spinner />}

          {stage === 'VARIATIONS' && uploadedImage && !isLoadingPrompt && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-600">1. Your Image</h2>
                  <div className="relative w-full max-w-xs mx-auto">
                  <img 
                      src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} 
                      alt="Uploaded content" 
                      className="rounded-xl shadow-lg border-2 border-gray-200 w-full"
                  />
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-700">2. Choose a Prompt Variation</h2>
                      <button onClick={handleStartOver} className="text-sm text-violet-500 hover:text-violet-600 font-semibold">Start Over</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      {promptVariations.map((prompt, index) => (
                      <PromptCard 
                          key={index}
                          title={VARIATION_TITLES[index]?.title || `Variation ${index + 1}`}
                          icon={VARIATION_TITLES[index]?.icon || <WandIcon className="w-5 h-5" />}
                          prompt={prompt}
                          onSelect={() => handleSelectVariation(prompt)}
                      />
                      ))}
                  </div>
              </div>
            </div>
          )}
          
          {stage === 'EDIT' && uploadedImage && !isLoadingPrompt && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-600">1. Your Image</h2>
                <div className="relative w-full max-w-sm mx-auto">
                  <img 
                    src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} 
                    alt="Uploaded content" 
                    className="rounded-xl shadow-lg border-2 border-gray-200 w-full"
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

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  2. Choose an Artistic Style
                </label>
                <div className="flex flex-wrap gap-3">
                  {ART_STYLES.map(style => (
                    <button
                      key={style}
                      onClick={() => handleStyleChange(style)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedStyle === style
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  3. Choose Camera Framing
                </label>
                <div className="flex flex-wrap gap-3">
                  {CAMERA_FRAMING_OPTIONS.map(framing => (
                    <button
                      key={framing}
                      onClick={() => handleFramingChange(framing)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedFraming === framing
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {framing}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  4. Choose Lighting
                </label>
                <div className="flex flex-wrap gap-3">
                  {LIGHTING_OPTIONS.map(lighting => (
                    <button
                      key={lighting}
                      onClick={() => handleLightingChange(lighting)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedLighting === lighting
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {lighting}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label htmlFor="prompt-editor" className="block text-lg font-semibold text-gray-700 mb-3">
                  5. Edit &amp; Generate
                </label>
                <textarea
                  id="prompt-editor"
                  rows={6}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow resize-y"
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
                    className="w-full flex items-center justify-center gap-2 bg-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-all duration-300 ease-in-out"
                  >
                    {isCopied ? <><CheckIcon className="w-5 h-5" /> Copied!</> : <><CopyIcon className="w-5 h-5" /> Copy Prompt</>}
                  </button>
                  <button
                    onClick={handleGenerateImage}
                    disabled={!editablePrompt.trim() || isGeneratingImage}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-all duration-300 ease-in-out"
                  >
                    {isGeneratingImage ? (
                      <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...</>
                    ) : (
                      <><WandIcon className="w-5 h-5" /> Generate Image</>
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
