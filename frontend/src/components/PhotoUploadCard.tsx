import React, { useRef, useState } from 'react';
import { Upload, X, RefreshCw, CheckCircle, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { ViewType, ViewUploadState } from '../types/screening';

interface PhotoUploadCardProps {
  view: ViewType;
  title: string;
  subtitle: string;
  uploadState: ViewUploadState;
  onFileSelect: (view: ViewType, file: File) => void;
  onRemove: (view: ViewType) => void;
  onLoadSample: (view: ViewType) => void;
  samplePath: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PhotoUploadCard: React.FC<PhotoUploadCardProps> = ({
  view,
  title,
  subtitle,
  uploadState,
  onFileSelect,
  onRemove,
  onLoadSample,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandleFile = (file: File) => {
    // Check type
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(`Invalid format: '${file.type || file.name}'. Please upload a JPEG, PNG, or WebP photo.`);
      return;
    }
    // Check size
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large: ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 10 MB.`);
      return;
    }
    onFileSelect(view, file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  const hasPreview = !!uploadState.previewUrl;

  return (
    <div 
      className={`upload-card ${isDragging ? 'dragging' : ''} ${hasPreview ? 'is-filled' : ''} ${uploadState.error ? 'has-error' : ''}`}
      id={`upload-card-${view}`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        id={`file-input-${view}`}
        aria-label={`Upload photo for ${title}`}
      />

      {/* Card Header */}
      <div className="upload-card-header">
        <div className="upload-card-title">
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: hasPreview ? 'rgba(0, 245, 212, 0.15)' : 'var(--bg-elevated)',
            color: hasPreview ? 'var(--cyan-primary)' : 'var(--text-muted)'
          }}>
            {hasPreview ? <CheckCircle size={17} /> : <ImageIcon size={17} />}
          </div>
          <div>
            <div style={{ fontSize: '0.925rem', fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{subtitle}</div>
          </div>
        </div>

        {hasPreview && (
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
            Ready
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="upload-card-body">
        {hasPreview ? (
          /* Preview State */
          <div className="preview-container">
            <img 
              src={uploadState.previewUrl!} 
              alt={`${title} preview`} 
              className="preview-img"
            />
            {/* Hover Actions */}
            <div className="preview-overlay-actions">
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                title="Replace photo"
              >
                <RefreshCw size={15} />
                <span>Replace</span>
              </button>
              <button 
                type="button"
                className="btn btn-danger"
                onClick={() => onRemove(view)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                title="Remove photo"
              >
                <X size={15} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty Dropzone State */
          <div 
            className="dropzone-target"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            aria-label={`Select or drop image for ${title}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          >
            <div className="dropzone-icon-wrap">
              <Upload size={24} />
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Click or drag photo here
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              JPEG, PNG, WebP up to 10 MB
            </div>
          </div>
        )}

        {/* File Metadata or Error */}
        {uploadState.error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--rose-primary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            <AlertCircle size={14} />
            <span>{uploadState.error}</span>
          </div>
        )}

        {hasPreview && uploadState.file && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {uploadState.file.name}
            </span>
            <span className="mono-text">
              {(uploadState.file.size / 1024).toFixed(0)} KB
            </span>
          </div>
        )}

        {/* 1-Click Load Sample Button for rapid demo / testing */}
        {!hasPreview && (
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample(view);
              }}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
              title="Quickly load high-definition clinical sample for this view"
            >
              <Sparkles size={13} color="var(--cyan-primary)" />
              <span>Use Clinical Demo Photo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
