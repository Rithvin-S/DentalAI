import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Cpu } from 'lucide-react';
import type { ViewType, ViewUploadState, DetectionMethod } from '../types/screening';
import { PhotoUploadCard } from '../components/PhotoUploadCard';

interface UploadPageProps {
  uploadStates: Record<ViewType, ViewUploadState>;
  onFileSelect: (view: ViewType, file: File) => void;
  onRemove: (view: ViewType) => void;
  onLoadSample: (view: ViewType) => void;
  onLoadAllSamples: () => void;
  consentAcknowledged: boolean;
  onOpenConsentModal: () => void;
  onToggleConsent: (val: boolean) => void;
  onSubmit: (scenario?: string, method?: DetectionMethod) => void;
  selectedMethod: DetectionMethod;
  onSelectMethod: (method: DetectionMethod) => void;
  isAnalyzing: boolean;
  analysisPhase: string;
}

export const UploadPage: React.FC<UploadPageProps> = ({
  uploadStates,
  onFileSelect,
  onRemove,
  onLoadSample,
  onLoadAllSamples,
  consentAcknowledged,
  onOpenConsentModal,
  onToggleConsent,
  onSubmit,
  selectedMethod,
  onSelectMethod,
  isAnalyzing,
  analysisPhase
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('default');

  const readyCount = Object.values(uploadStates).filter((s) => s.file !== null).length;
  const isAllReady = readyCount === 3;
  const canSubmit = isAllReady && consentAcknowledged && !isAnalyzing;

  return (
    <div>
      {/* Hero Introduction */}
      <section style={{ textAlign: 'center', margin: '1.5rem auto 2.5rem', maxWidth: '820px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <span className="badge badge-cyan">
            <Sparkles size={14} /> AI-Powered Dental Visual Screening
          </span>
          <span className="badge badge-blue">
            3-View Protocol
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', lineHeight: 1.15, fontWeight: 800, marginBottom: '1rem' }}>
          Intraoral Visual Pattern Screening with{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--cyan-primary) 0%, #38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Responsible AI
          </span>
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto 1.5rem' }}>
          Submit three standardized intraoral photographs to receive an AI-assisted visual summary highlighting visible surface patterns, potential enamel discoloration, or gingival changes.
        </p>

        {/* Quick Demo Pre-loader */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onLoadAllSamples}
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem' }}
            id="load-all-samples-btn"
          >
            <Sparkles size={16} color="var(--cyan-primary)" />
            <span>Load High-Definition Demo Photos (1-Click)</span>
          </button>
        </div>
      </section>

      {/* Stepper Indicator */}
      <div className="stepper-nav no-print">
        <div className={`step-item ${readyCount >= 1 ? 'active' : ''} ${isAllReady ? 'completed' : ''}`}>
          <div className="step-number">{isAllReady ? <CheckCircle2 size={16} /> : '1'}</div>
          <span>1. Select 3 Views ({readyCount}/3)</span>
        </div>
        <div style={{ width: '40px', height: '1px', background: 'var(--border-subtle)' }} />
        <div className={`step-item ${isAllReady ? 'active' : ''} ${consentAcknowledged ? 'completed' : ''}`}>
          <div className="step-number">{consentAcknowledged ? <CheckCircle2 size={16} /> : '2'}</div>
          <span>2. Informed Consent</span>
        </div>
        <div style={{ width: '40px', height: '1px', background: 'var(--border-subtle)' }} />
        <div className={`step-item ${canSubmit ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>3. AI Screening Report</span>
        </div>
      </div>

      {/* Upload 3-Card Grid (FR-02, FR-03, FR-04) */}
      <div className="upload-grid">
        <PhotoUploadCard
          view="front"
          title="Front View"
          subtitle="Front teeth and smile gums"
          uploadState={uploadStates.front}
          onFileSelect={onFileSelect}
          onRemove={onRemove}
          onLoadSample={onLoadSample}
          samplePath="/samples/front_sample.jpg"
        />

        <PhotoUploadCard
          view="upper"
          title="Upper View"
          subtitle="Maxillary arch & palate"
          uploadState={uploadStates.upper}
          onFileSelect={onFileSelect}
          onRemove={onRemove}
          onLoadSample={onLoadSample}
          samplePath="/samples/upper_sample.jpg"
        />

        <PhotoUploadCard
          view="lower"
          title="Lower View"
          subtitle="Mandibular arch & teeth"
          uploadState={uploadStates.lower}
          onFileSelect={onFileSelect}
          onRemove={onRemove}
          onLoadSample={onLoadSample}
          samplePath="/samples/lower_sample.jpg"
        />
      </div>

      {/* Submission & Consent Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* AI Detection Method Selection (SRS & Multi-Method Architecture) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Select AI Detection Method:
                </span>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                  2 AI Engines Available
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Compare results anytime directly on the screening report
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Method 1: Local YOLO AI Model */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectMethod('yolo')}
                style={{
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-md)',
                  background: selectedMethod === 'yolo' ? 'rgba(0, 245, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `2px solid ${selectedMethod === 'yolo' ? 'var(--cyan-primary)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  boxShadow: selectedMethod === 'yolo' ? '0 0 16px rgba(0, 245, 212, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: 'rgba(0, 245, 212, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cyan-primary)'
                    }}>
                      <Cpu size={19} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                        Approach B: Open-Source AI Model (YOLOv8)
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        Ultralytics YOLOv8 • Open-Source Weights
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${selectedMethod === 'yolo' ? 'badge-cyan' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                    {selectedMethod === 'yolo' ? 'Selected' : 'Select'}
                  </span>
                </div>
                <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                  Open-source YOLO caries & lesion detector trained on intraoral clinical datasets. Detects suspected caries, enamel discoloration, chips, and marginal erythema.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--emerald-primary)', background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    ⚡ Open-Source & Fast
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--cyan-primary)', background: 'rgba(0, 245, 212, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    🔒 Edge / Microservice
                  </span>
                </div>
              </div>

              {/* Method 2: Google Gemini AI Vision (API) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectMethod('gemini')}
                style={{
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-md)',
                  background: selectedMethod === 'gemini' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: `2px solid ${selectedMethod === 'gemini' ? '#818CF8' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  boxShadow: selectedMethod === 'gemini' ? '0 0 16px rgba(99, 102, 241, 0.25)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#818CF8'
                    }}>
                      <Sparkles size={19} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                        Approach A: Google Gemini AI Vision (API)
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#A5B4FC' }}>
                        Gemini 2.5 Flash • Multimodal Cloud API
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${selectedMethod === 'gemini' ? 'badge-blue' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                    {selectedMethod === 'gemini' ? 'Selected' : 'Select'}
                  </span>
                </div>
                <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                  Deep multimodal reasoning powered by Google Gemini Vision API. Performs holistic oral tissue pattern detection with spatial localization.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    ✨ Multimodal Reasoning
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#C084FC', background: 'rgba(192, 132, 252, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    🌐 Live Gemini API
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Consent Checkbox Row (FR-08) */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: consentAcknowledged ? 'rgba(0, 245, 212, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${consentAcknowledged ? 'rgba(0, 245, 212, 0.3)' : 'var(--border-subtle)'}`,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
              <input
                type="checkbox"
                id="main-consent-checkbox"
                checked={consentAcknowledged}
                onChange={(e) => onToggleConsent(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--cyan-primary)', cursor: 'pointer', marginTop: '2px' }}
              />
              <div>
                <label htmlFor="main-consent-checkbox" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'block' }}>
                  Acknowledge Processing Notice & Non-Diagnostic Prototype Terms
                </label>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                  Photos are processed transiently in memory for demonstration purposes. AI screening is not a clinical diagnosis.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={onOpenConsentModal}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              id="read-privacy-notice-btn"
            >
              <ShieldCheck size={15} />
              <span>Read Full Notice</span>
            </button>
          </div>

          {/* Submission Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Scenario Selector for Testing & Demonstration */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Demo Scenario:</span>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                id="scenario-select"
                aria-label="Demo simulation scenario"
              >
                <option value="default">Standard Screening (Live AI Inference)</option>
                <option value="clean">Clean View Demo (No Obvious Abnormalities - FR-14)</option>
                <option value="unassessable">Suboptimal Image Quality Demo (Retake State - FR-15)</option>
              </select>
            </div>

            {/* Submit Button (FR-07, FR-09) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {!isAllReady && (
                <span style={{ fontSize: '0.8rem', color: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={15} />
                  <span>Upload all 3 views ({3 - readyCount} remaining)</span>
                </span>
              )}

              {isAllReady && !consentAcknowledged && (
                <span style={{ fontSize: '0.8rem', color: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={15} />
                  <span>Acknowledge consent to proceed</span>
                </span>
              )}

              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSubmit}
                onClick={() => onSubmit(selectedScenario, selectedMethod)}
                style={{ minWidth: '240px', padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
                id="submit-screening-btn"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Analyzing Photos...</span>
                  </>
                ) : (
                  <>
                    <span>Run Screening ({selectedMethod === 'yolo' ? 'Approach B: Open-Source YOLO' : 'Approach A: Gemini API'})</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loading Animation Overlay / Status */}
          {isAnalyzing && (
            <div style={{
              marginTop: '0.75rem',
              padding: '1rem',
              background: 'rgba(0, 245, 212, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(0, 245, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <span className="pulse-dot" style={{ color: 'var(--cyan-primary)' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--cyan-primary)', fontWeight: 600 }}>
                {analysisPhase || 'Communicating with vision model and validating coordinates...'}
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
