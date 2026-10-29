import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UrgentWarningBanner } from './components/UrgentWarningBanner';
import { CaptureGuideModal } from './components/CaptureGuideModal';
import { ConsentModal } from './components/ConsentModal';
import { UploadPage } from './pages/UploadPage';
import { ResultsPage } from './pages/ResultsPage';
import type { ViewType, ViewUploadState, ScreeningResponse, DetectionMethod } from './types/screening';
import { submitScreeningAnalysis, checkBackendHealth } from './services/api';

const initialUploadStates: Record<ViewType, ViewUploadState> = {
  front: { file: null, previewUrl: null, error: null },
  upper: { file: null, previewUrl: null, error: null },
  lower: { file: null, previewUrl: null, error: null },
};

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [backendOnline, setBackendOnline] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<ViewType, ViewUploadState>>(initialUploadStates);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<DetectionMethod>('yolo');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState('');
  const [screeningResult, setScreeningResult] = useState<ScreeningResponse | null>(null);

  // Monitor backend health
  useEffect(() => {
    const checkHealth = async () => {
      const isUp = await checkBackendHealth();
      setBackendOnline(isUp);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Safe file selection with Object-URL revocation (FR-06, AT-13)
  const handleFileSelect = useCallback((view: ViewType, file: File) => {
    setUploadStates((prev) => {
      // Clean up previous URL if any
      if (prev[view].previewUrl) {
        URL.revokeObjectURL(prev[view].previewUrl!);
      }
      const previewUrl = URL.createObjectURL(file);
      return {
        ...prev,
        [view]: {
          file,
          previewUrl,
          error: null
        }
      };
    });
  }, []);

  // Safe file removal (FR-06, AT-13)
  const handleRemove = useCallback((view: ViewType) => {
    setUploadStates((prev) => {
      if (prev[view].previewUrl) {
        URL.revokeObjectURL(prev[view].previewUrl!);
      }
      return {
        ...prev,
        [view]: {
          file: null,
          previewUrl: null,
          error: null
        }
      };
    });
  }, []);

  // Helper to load sample image from public directory
  const handleLoadSample = useCallback(async (view: ViewType) => {
    const filenames: Record<ViewType, string> = {
      front: 'front_sample.jpg',
      upper: 'upper_sample.jpg',
      lower: 'lower_sample.jpg'
    };
    try {
      const res = await fetch(`/samples/${filenames[view]}`);
      if (!res.ok) throw new Error('Sample not found');
      const blob = await res.blob();
      const file = new File([blob], `${view}_intraoral_sample.jpg`, { type: 'image/jpeg' });
      handleFileSelect(view, file);
    } catch (err) {
      console.error('Failed to load sample', err);
    }
  }, [handleFileSelect]);

  // Pre-load all 3 samples in parallel
  const handleLoadAllSamples = useCallback(async () => {
    await Promise.all([
      handleLoadSample('front'),
      handleLoadSample('upper'),
      handleLoadSample('lower')
    ]);
  }, [handleLoadSample]);

  // Reset screening state and clean up all memory URLs (FR-17, AT-13)
  const handleReset = useCallback(() => {
    Object.values(uploadStates).forEach((s) => {
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    });
    setUploadStates(initialUploadStates);
    setScreeningResult(null);
    setIsAnalyzing(false);
    setAnalysisPhase('');
  }, [uploadStates]);

  // Submit screening analysis
  const handleSubmit = async (scenario?: string, methodOverride?: DetectionMethod) => {
    const { front, upper, lower } = uploadStates;
    if (!front.file || !upper.file || !lower.file) {
      alert('Please provide photos for all three intraoral views.');
      return;
    }
    if (!consentAcknowledged) {
      alert('Informed consent acknowledgement is mandatory.');
      return;
    }

    const activeMethod = methodOverride || selectedMethod;
    if (methodOverride && methodOverride !== selectedMethod) {
      setSelectedMethod(methodOverride);
    }

    setIsAnalyzing(true);
    setAnalysisPhase(
      activeMethod === 'gemini' 
        ? 'Connecting to Google Gemini Multimodal Vision API...' 
        : 'Validating photographic views and orientation...'
    );

    // UX progress phases tailored to detection engine
    const timer1 = setTimeout(() => {
      setAnalysisPhase(
        activeMethod === 'gemini'
          ? 'Executing Gemini 2.5 Flash dental visual reasoning...'
          : 'Executing fine-tuned YOLOv8 dental model inference...'
      );
    }, 700);

    const timer2 = setTimeout(() => {
      setAnalysisPhase(
        activeMethod === 'gemini'
          ? 'Validating spatial localization and structured JSON findings...'
          : 'Normalizing localization coordinates and compiling report...'
      );
    }, 1600);

    try {
      const response = await submitScreeningAnalysis(
        front.file,
        upper.file,
        lower.file,
        consentAcknowledged,
        activeMethod,
        scenario
      );
      setScreeningResult(response);
    } catch (err: any) {
      alert(`Screening analysis failed: ${err.message || 'Unknown server error'}`);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
      setAnalysisPhase('');
    }
  };

  // Compile active image URLs for results page
  const imageUrls: Record<ViewType, string> = {
    front: uploadStates.front.previewUrl || '',
    upper: uploadStates.upper.previewUrl || '',
    lower: uploadStates.lower.previewUrl || ''
  };

  return (
    <div className="app-container">
      {/* Background Ambient Layers */}
      <div className="bg-ambient-layer">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
      </div>

      {/* Header */}
      <Header
        backendOnline={backendOnline}
        onOpenGuide={() => setIsGuideOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Urgent Medical Warning Banner (FR-18) */}
        <UrgentWarningBanner />

        {/* View Switcher: Upload or Results */}
        {!screeningResult ? (
          <UploadPage
            uploadStates={uploadStates}
            onFileSelect={handleFileSelect}
            onRemove={handleRemove}
            onLoadSample={handleLoadSample}
            onLoadAllSamples={handleLoadAllSamples}
            consentAcknowledged={consentAcknowledged}
            onOpenConsentModal={() => setIsConsentOpen(true)}
            onToggleConsent={setConsentAcknowledged}
            onSubmit={handleSubmit}
            selectedMethod={selectedMethod}
            onSelectMethod={setSelectedMethod}
            isAnalyzing={isAnalyzing}
            analysisPhase={analysisPhase}
          />
        ) : (
          <ResultsPage
            response={screeningResult}
            imageUrls={imageUrls}
            onReset={handleReset}
            onReAnalyze={(method) => handleSubmit(undefined, method)}
            isAnalyzing={isAnalyzing}
          />
        )}
      </main>

      {/* Footer Notice */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }} className="no-print">
        <p>DentalAI Prototype v1.0 • For Demonstration & Research Screening Only • Not a Cleared Medical Diagnostic Device</p>
      </footer>

      {/* Modals */}
      <CaptureGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ConsentModal
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        consentAcknowledged={consentAcknowledged}
        onToggleConsent={setConsentAcknowledged}
      />
    </div>
  );
};

export default App;
