import React, { useState } from 'react';
import { 
  Printer, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  Crosshair,
  Sparkles,
  Info,
  Cpu,
  Layers
} from 'lucide-react';
import type { ScreeningResponse, ViewType, DetectionMethod } from '../types/screening';
import { AnnotatedImage } from '../components/AnnotatedImage';

interface ResultsPageProps {
  response: ScreeningResponse;
  imageUrls: Record<ViewType, string>;
  onReset: () => void;
  onReAnalyze?: (method: DetectionMethod) => void;
  isAnalyzing?: boolean;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  response,
  imageUrls,
  onReset,
  onReAnalyze,
  isAnalyzing
}) => {
  const [activeView, setActiveView] = useState<ViewType>('front');
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  const isMultiModel = response.detection_method === 'multi_model' || (response.model_name && response.model_name.includes('Multi-Model'));
  const isGemini = !isMultiModel && (response.detection_method === 'gemini' || (response.model_name && response.model_name.includes('Gemini')));
  const isYolo = !isMultiModel && !isGemini;

  const findingsForCurrentView = response.findings.filter((f) => f.view === activeView);
  const totalFindings = response.findings.length;
  const isClean = response.findings.length === 0 && response.status === 'completed';
  const isUnassessable = response.status === 'unable_to_assess';

  const currentViewAssessment = response.view_assessments[activeView] || {
    view: activeView,
    status: 'assessed',
    findings_count: findingsForCurrentView.length
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Report Header Card */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge badge-cyan">
                Visual Screening Summary
              </span>
              {isMultiModel ? (
                <span className="badge badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0, 245, 212, 0.12)', border: '1px solid var(--cyan-primary)' }}>
                  <Layers size={13} color="var(--cyan-primary)" />
                  <span>Method 3: Multi-Model AI Ensemble (OpenCV • YOLOv8 • U-Net • ResNet)</span>
                </span>
              ) : isGemini ? (
                <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={12} color="#818CF8" />
                  <span>Method 2: Google Gemini AI Vision (API)</span>
                </span>
              ) : (
                <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Cpu size={12} color="var(--emerald-primary)" />
                  <span>Method 1: Open-Source AI Model (YOLOv8)</span>
                </span>
              )}
              <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ID: {response.request_id}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800 }}>
              AI Visual Screening Report
            </h1>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Completed at {new Date(response.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 3 Intraoral Views Analyzed • AI Engine: <strong style={{ color: 'var(--text-primary)' }}>{response.model_name || (isMultiModel ? 'Method 3: Multi-Model AI Ensemble' : isGemini ? 'Method 2: Gemini 2.5 Flash' : 'Method 1: Open-Source YOLOv8')}</strong>
            </p>
          </div>

          {/* Action Buttons with Multi-Model Comparison */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {onReAnalyze && (
              <>
                {!isMultiModel && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isAnalyzing}
                    onClick={() => onReAnalyze('multi_model')}
                    style={{
                      fontSize: '0.785rem',
                      border: '1px solid rgba(0, 245, 212, 0.4)',
                      background: 'rgba(0, 245, 212, 0.08)'
                    }}
                    id="compare-multimodel-btn"
                    title="Compare with Method 3: 4-Stage Multi-Model Ensemble"
                  >
                    <Layers size={14} color="var(--cyan-primary)" />
                    <span>Compare Multi-Model Pipeline</span>
                  </button>
                )}

                {!isYolo && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isAnalyzing}
                    onClick={() => onReAnalyze('yolo')}
                    style={{
                      fontSize: '0.785rem',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.08)'
                    }}
                    id="compare-yolo-btn"
                    title="Compare with Method 1: Local YOLOv8"
                  >
                    <Cpu size={14} color="var(--emerald-primary)" />
                    <span>Compare YOLOv8</span>
                  </button>
                )}

                {!isGemini && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isAnalyzing}
                    onClick={() => onReAnalyze('gemini')}
                    style={{
                      fontSize: '0.785rem',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      background: 'rgba(99, 102, 241, 0.08)'
                    }}
                    id="compare-gemini-btn"
                    title="Compare with Method 2: Gemini API"
                  >
                    <Sparkles size={14} color="#818CF8" />
                    <span>Compare Gemini API</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrint}
              style={{ fontSize: '0.785rem' }}
              id="print-report-btn"
              title="Print or export PDF report for your dentist"
            >
              <Printer size={15} />
              <span>Print / Export</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onReset}
              style={{ fontSize: '0.785rem' }}
              id="new-screening-btn"
            >
              <RotateCcw size={15} />
              <span>New Screening</span>
            </button>
          </div>
        </div>

        {/* Global Overview Box */}
        <div style={{
          marginTop: '1.25rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: isClean 
            ? 'rgba(16, 185, 129, 0.08)' 
            : isUnassessable 
            ? 'rgba(245, 158, 11, 0.08)' 
            : 'rgba(0, 245, 212, 0.06)',
          border: `1px solid ${isClean ? 'rgba(16, 185, 129, 0.3)' : isUnassessable ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 245, 212, 0.25)'}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.85rem'
        }}>
          <div style={{
            color: isClean ? 'var(--emerald-primary)' : isUnassessable ? 'var(--amber-primary)' : 'var(--cyan-primary)',
            marginTop: '2px',
            flexShrink: 0
          }}>
            {isClean ? <CheckCircle size={22} /> : isUnassessable ? <AlertTriangle size={22} /> : <Sparkles size={22} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {isClean 
                ? 'No Obvious Visible Abnormality Detected' 
                : isUnassessable 
                ? 'Suboptimal Image Presentation — Review Advised' 
                : `${totalFindings} Visible Finding(s) Warranting Professional Review`}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0', lineHeight: '1.5' }}>
              {response.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Image Viewer with Interactive Annotations & Segmentation Masks */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          
          {/* View Selection Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            {(['front', 'upper', 'lower'] as ViewType[]).map((v) => {
              const count = response.findings.filter((f) => f.view === v).length;
              const isActive = activeView === v;
              const labels = { front: 'Front View', upper: 'Upper Arch', lower: 'Lower Arch' };

              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setActiveView(v);
                    setActiveFindingId(null);
                  }}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '0.825rem',
                    padding: '0.45rem 0.95rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                  id={`tab-${v}-view`}
                >
                  <span>{labels[v]}</span>
                  {count > 0 && (
                    <span 
                      style={{
                        background: isActive ? '#070B14' : 'rgba(0, 245, 212, 0.2)',
                        color: 'var(--cyan-primary)',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quality Notice Banner for Current View if poor quality */}
          {currentViewAssessment.status === 'poor_quality' && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.8rem',
              color: 'var(--amber-primary)'
            }}>
              <AlertTriangle size={18} />
              <div>
                <strong>Unable to fully assess this view:</strong> {currentViewAssessment.quality_note || 'Lighting or contrast was inadequate.'}
              </div>
            </div>
          )}

          {/* Interactive Annotated Image with Masks and Boxes */}
          {imageUrls[activeView] && (
            <AnnotatedImage
              imageUrl={imageUrls[activeView]}
              viewName={activeView}
              findings={response.findings}
              activeFindingId={activeFindingId}
              onSelectFinding={setActiveFindingId}
            />
          )}
        </div>

        {/* Right Column: Findings List for Selected View with 4-Stage Model Inspection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Observations: {activeView.toUpperCase()} VIEW
              </h3>
              <span className="badge badge-cyan">
                {findingsForCurrentView.length} {findingsForCurrentView.length === 1 ? 'Finding' : 'Findings'}
              </span>
            </div>

            {/* If No Findings for this View */}
            {findingsForCurrentView.length === 0 ? (
              <div style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-subtle)'
              }}>
                <CheckCircle size={32} color="var(--emerald-primary)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  No Obvious Abnormality Detected in This View
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', maxWidth: '340px', margin: '0 auto' }}>
                  The visual screening did not flag suspicious visible patterns in this photograph. Remember: ordinary photos cannot rule out subsurface decay, hidden cavities, or gum disease.
                </p>
              </div>
            ) : (
              /* List of Findings with 4-Stage Breakdown */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {findingsForCurrentView.map((finding) => {
                  const isSelected = activeFindingId === finding.id;
                  const seg = finding.segmentation;
                  const cls = finding.classification;

                  return (
                    <div
                      key={finding.id}
                      className={`finding-card ${isSelected ? 'active-finding' : ''}`}
                      onClick={() => setActiveFindingId(isSelected ? null : finding.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View finding ${finding.title}`}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(0, 245, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Finding Card Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.925rem', color: isSelected ? 'var(--cyan-primary)' : 'var(--text-primary)' }}>
                            {finding.title}
                          </div>
                          <div className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Label: {finding.label}
                          </div>
                        </div>

                        {/* Severity Badge */}
                        <span className={`badge ${finding.severity === 'review_recommended' ? 'badge-amber' : 'badge-blue'}`}>
                          {finding.severity === 'review_recommended' ? 'Review Recommended' : 'Observation'}
                        </span>
                      </div>

                      {/* Description with honest uncertainty */}
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0.4rem 0' }}>
                        {finding.description}
                      </p>

                      {/* Multi-Model Coordinated Evidence (U-Net & ResNet) */}
                      {(seg || cls) && (
                        <div style={{
                          marginTop: '0.65rem',
                          padding: '0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          fontSize: '0.74rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--cyan-primary)', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Layers size={13} /> Multi-Model Inspection Details
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              OpenCV • YOLOv8 • U-Net • ResNet
                            </span>
                          </div>

                          {/* U-Net Mask Metrics */}
                          {seg && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                              <span>U-Net Pixel Mask:</span>
                              <span className="mono-text" style={{ color: 'var(--text-primary)' }}>
                                {seg.coverage_percent ? `${seg.coverage_percent}% view area` : 'Contoured'} (Dice: {seg.dice_score ? `${Math.round(seg.dice_score * 100)}%` : 'Active'})
                              </span>
                            </div>
                          )}

                          {/* ResNet Classification & Uncertainty */}
                          {cls && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>ResNet Classification:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {cls.display_title || cls.category} ({Math.round(cls.confidence * 100)}%)
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Uncertainty Status:</span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  background: cls.uncertainty === 'review_recommended' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                  color: cls.uncertainty === 'review_recommended' ? 'var(--amber-primary)' : 'var(--emerald-primary)',
                                  fontWeight: 600
                                }}>
                                  {cls.uncertainty === 'review_recommended' ? '⚠️ Clinical Review Advised' : '✓ High Model Concordance'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Card Footer Info */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.725rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: finding.localization ? 'var(--cyan-primary)' : 'var(--text-muted)' }}>
                          <Crosshair size={13} />
                          <span>{finding.localization ? 'YOLO Box Mapped' : 'Image-wide pattern'}</span>
                        </div>

                        {finding.confidence !== null && (
                          <span className="mono-text" style={{ color: 'var(--text-muted)' }}>
                            Detector conf: {Math.round(finding.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mandatory Dentist Consultation Callout */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--cyan-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ color: 'var(--cyan-primary)', marginTop: '2px' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Mandatory Professional Review</strong>
                <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0', lineHeight: '1.45' }}>
                  {response.disclaimer}
                </p>
              </div>
            </div>
          </div>

          {/* Clinical Limitations Accordion */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={16} color="var(--blue-primary)" /> Inherent Visual Screening Limitations
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {response.limitations.map((lim, idx) => (
                <li key={idx} style={{ marginBottom: '0.35rem' }}>{lim}</li>
              ))}
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
