import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Layers, Box } from 'lucide-react';
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
  const [showBoxes, setShowBoxes] = useState(true);
  const [showMasks, setShowMasks] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [renderedDimensions, setRenderedDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter findings for this view that have valid localization coordinates
  const localizedFindings = findings.filter(
    (f) => f.view === viewName && f.localization !== null && f.localization !== undefined
  );

  const hasMasks = localizedFindings.some(
    (f) => f.segmentation && f.segmentation.mask_polygons && f.segmentation.mask_polygons.length > 0
  );

  const handleImageLoad = () => {
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

  const getColorForFinding = (finding: Finding) => {
    const cat = (finding.classification?.category || finding.label).toLowerCase();
    if (cat.includes('gum') || cat.includes('gingival')) return '#F43F5E'; // rose/red
    if (cat.includes('discoloration')) return '#F59E0B'; // amber
    if (cat.includes('chip')) return '#38BDF8'; // sky blue
    if (cat.includes('lesion')) return '#A855F7'; // purple
    return '#00F5D4'; // cyan
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAnnotations(!showAnnotations)}
            style={{ fontSize: '0.785rem', padding: '0.35rem 0.75rem' }}
            id="toggle-annotations-btn"
          >
            {showAnnotations ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showAnnotations ? 'Hide All' : 'Show All'}</span>
          </button>

          {hasMasks && (
            <>
              <button
                type="button"
                className={`btn ${showMasks ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setShowMasks(!showMasks)}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                title="Toggle U-Net Pixel-Level Segmentation Masks"
              >
                <Layers size={14} />
                <span>U-Net Masks</span>
              </button>
              <button
                type="button"
                className={`btn ${showBoxes ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setShowBoxes(!showBoxes)}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                title="Toggle YOLO Bounding Boxes"
              >
                <Box size={14} />
                <span>YOLO Boxes</span>
              </button>
            </>
          )}

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

          {/* SVG Overlay for Coordinates, Boxes, and Segmentation Masks */}
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

              {/* 1. U-Net Segmentation Mask Polygons */}
              {showMasks && localizedFindings.map((finding) => {
                if (!finding.segmentation?.mask_polygons || finding.segmentation.mask_polygons.length === 0) return null;
                const isActive = activeFindingId === finding.id;
                const color = getColorForFinding(finding);

                return finding.segmentation.mask_polygons.map((poly, pIdx) => {
                  const pointsStr = poly
                    .map(([px, py]) => `${px * renderedDimensions.width},${py * renderedDimensions.height}`)
                    .join(' ');

                  return (
                    <polygon
                      key={`poly-${finding.id}-${pIdx}`}
                      points={pointsStr}
                      fill={color}
                      fillOpacity={isActive ? 0.45 : 0.26}
                      stroke={color}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      strokeDasharray={isActive ? 'none' : '4 2'}
                      style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                      onClick={() => onSelectFinding(isActive ? null : finding.id)}
                    >
                      <title>{finding.title} — U-Net Segmentation Mask (Dice: {finding.segmentation?.dice_score ?? 'N/A'})</title>
                    </polygon>
                  );
                });
              })}

              {/* 2. YOLOv8 Localization Bounding Boxes */}
              {showBoxes && localizedFindings.map((finding) => {
                const loc = finding.localization!;
                const x = loc.xmin * renderedDimensions.width;
                const y = loc.ymin * renderedDimensions.height;
                const width = (loc.xmax - loc.xmin) * renderedDimensions.width;
                const height = (loc.ymax - loc.ymin) * renderedDimensions.height;

                const isActive = activeFindingId === finding.id;
                const color = getColorForFinding(finding);
                const bracketLen = Math.min(10, Math.max(5, Math.min(width, height) * 0.25));

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
                      className={`annotation-box ${isActive ? 'active' : ''}`}
                      stroke={color}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      strokeOpacity={isActive ? 0.95 : 0.75}
                      fill={color}
                      fillOpacity={isActive ? 0.15 : 0.05}
                    >
                      <title>{finding.title} ({finding.label})</title>
                    </rect>

                    {/* Corner Brackets */}
                    <path
                      d={`M ${x} ${y + bracketLen} L ${x} ${y} L ${x + bracketLen} ${y}`}
                      stroke={color}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${x + width - bracketLen} ${y} L ${x + width} ${y} L ${x + width} ${y + bracketLen}`}
                      stroke={color}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${x} ${y + height - bracketLen} L ${x} ${y + height} L ${x + bracketLen} ${y + height}`}
                      stroke={color}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${x + width - bracketLen} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - bracketLen}`}
                      stroke={color}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeLinecap="round"
                    />

                    {/* Subtle Center Crosshair Point */}
                    <circle 
                      cx={x + width / 2} 
                      cy={y + height / 2} 
                      r={isActive ? 2.5 : 1.5} 
                      fill={color} 
                      opacity={0.85}
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
            const color = getColorForFinding(finding);

            return (
              <div
                key={`label-${finding.id}`}
                className="annotation-pill-label"
                style={{
                  position: 'absolute',
                  top: `${Math.max(6, topPx - 28)}px`,
                  left: `${leftPx}px`,
                  zIndex: 20,
                  pointerEvents: 'none',
                  borderColor: color,
                  boxShadow: `0 2px 10px rgba(0,0,0,0.5)`
                }}
              >
                <span style={{ color }}>{finding.title}</span>
                {finding.confidence && (
                  <span className="mono-text" style={{ opacity: 0.85, fontSize: '0.65rem' }}>
                    {Math.round(finding.confidence * 100)}%
                  </span>
                )}
                {finding.segmentation?.dice_score && (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '0 4px', borderRadius: '3px' }}>
                    Dice {Math.round(finding.segmentation.dice_score * 100)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mask and Annotation Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
        <span style={{ fontWeight: 600 }}>Multi-Model Map:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#00F5D4', display: 'inline-block' }} />
          Enamel / Caries
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#F43F5E', display: 'inline-block' }} />
          Marginal Gingiva / Redness
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#F59E0B', display: 'inline-block' }} />
          Enamel Discoloration
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#38BDF8', display: 'inline-block' }} />
          Tooth Structure Chip
        </span>
      </div>
    </div>
  );
};
