import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { Finding, ViewType } from '../types/screening';

interface AnnotatedImageProps {
  imageUrl: string;
  viewName: ViewType;
  findings: Finding[];
  activeFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
}

export const AnnotatedImage: React.FC<AnnotatedImageProps> = ({
  imageUrl,
  viewName,
  findings,
  activeFindingId,
  onSelectFinding
}) => {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [renderedDimensions, setRenderedDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter findings for this view that have valid localization coordinates
  const localizedFindings = findings.filter(
    (f) => f.view === viewName && f.localization !== null && f.localization !== undefined
  );

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    updateRenderedSize();
  };

  const updateRenderedSize = () => {
    if (imgRef.current) {
      setRenderedDimensions({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight
      });
    }
  };

  useEffect(() => {
    updateRenderedSize();
    window.addEventListener('resize', updateRenderedSize);
    return () => window.removeEventListener('resize', updateRenderedSize);
  }, [imageUrl, zoomLevel]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(2.5, Math.max(1, prev + delta)));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAnnotations(!showAnnotations)}
            style={{ fontSize: '0.785rem', padding: '0.35rem 0.75rem' }}
            id="toggle-annotations-btn"
          >
            {showAnnotations ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showAnnotations ? 'Hide Markers' : 'Show Markers'}</span>
          </button>
          
          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
            {localizedFindings.length} Marked {localizedFindings.length === 1 ? 'Region' : 'Regions'}
          </span>
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleZoom(-0.25)}
            disabled={zoomLevel <= 1}
            style={{ padding: '0.25rem' }}
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="mono-text" style={{ fontSize: '0.75rem', minWidth: '42px', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleZoom(0.25)}
            disabled={zoomLevel >= 2.5}
            style={{ padding: '0.25rem' }}
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={resetZoom}
              style={{ padding: '0.25rem' }}
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Image Viewport */}
      <div 
        ref={containerRef}
        className="annotated-viewer-container"
        style={{
          cursor: zoomLevel > 1 ? 'grab' : 'default',
          overflow: 'auto',
          maxHeight: '540px'
        }}
      >
        <div 
          className="annotated-wrapper"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`Intraoral ${viewName} view photograph`}
            className="annotated-img"
            onLoad={handleImageLoad}
          />

          {/* SVG Overlay for Coordinates */}
          {showAnnotations && renderedDimensions.width > 0 && renderedDimensions.height > 0 && (
            <svg
              className="annotation-svg-overlay"
              viewBox={`0 0 ${renderedDimensions.width} ${renderedDimensions.height}`}
              width={renderedDimensions.width}
              height={renderedDimensions.height}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {localizedFindings.map((finding) => {
                const loc = finding.localization!;
                // Map normalized coordinates (0.0 to 1.0) to current rendered pixels
                const x = loc.xmin * renderedDimensions.width;
                const y = loc.ymin * renderedDimensions.height;
                const width = (loc.xmax - loc.xmin) * renderedDimensions.width;
                const height = (loc.ymax - loc.ymin) * renderedDimensions.height;

                const isActive = activeFindingId === finding.id;
                const isReview = finding.severity === 'review_recommended';
                const bracketLen = Math.min(10, Math.max(5, Math.min(width, height) * 0.25));
                const strokeColor = isReview ? '#F59E0B' : '#00F5D4';

                return (
                  <g 
                    key={finding.id} 
                    onClick={() => onSelectFinding(isActive ? null : finding.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Bounding Box Rect */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={4}
                      className={`annotation-box ${isReview ? 'review' : ''} ${isActive ? 'active' : ''}`}
                    >
                      <title>{finding.title} ({finding.label})</title>
                    </rect>

                    {/* Surgical Precision Corner Brackets */}
                    {/* Top-Left */}
                    <path
                      d={`M ${x} ${y + bracketLen} L ${x} ${y} L ${x + bracketLen} ${y}`}
                      stroke={strokeColor}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Top-Right */}
                    <path
                      d={`M ${x + width - bracketLen} ${y} L ${x + width} ${y} L ${x + width} ${y + bracketLen}`}
                      stroke={strokeColor}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Bottom-Left */}
                    <path
                      d={`M ${x} ${y + height - bracketLen} L ${x} ${y + height} L ${x + bracketLen} ${y + height}`}
                      stroke={strokeColor}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Bottom-Right */}
                    <path
                      d={`M ${x + width - bracketLen} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - bracketLen}`}
                      stroke={strokeColor}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />

                    {/* Subtle Center Crosshair Point */}
                    <circle 
                      cx={x + width / 2} 
                      cy={y + height / 2} 
                      r={isActive ? 2.5 : 1.5} 
                      fill={strokeColor} 
                      opacity={0.8}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Floating Pill Label for Active Finding */}
          {showAnnotations && localizedFindings.map((finding) => {
            if (activeFindingId !== finding.id) return null;
            const loc = finding.localization!;
            const topPx = loc.ymin * renderedDimensions.height;
            const leftPx = loc.xmin * renderedDimensions.width;
            const isReview = finding.severity === 'review_recommended';

            return (
              <div
                key={`label-${finding.id}`}
                className={`annotation-label-pill ${isReview ? 'review' : ''}`}
                style={{
                  top: `${Math.max(4, topPx - 28)}px`,
                  left: `${leftPx}px`
                }}
              >
                <span>🎯</span>
                <span>{finding.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note about coordinates */}
      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          {localizedFindings.length > 0 
            ? 'Bounding markers represent model-estimated visual areas of interest, not definitive borders.'
            : 'No localization coordinates returned for this view. Model observations are presented in the findings summary.'}
        </span>
        {naturalDimensions && (
          <span className="mono-text">
            Original: {naturalDimensions.width}×{naturalDimensions.height}px
          </span>
        )}
      </div>
    </div>
  );
};
