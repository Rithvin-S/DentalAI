import React from 'react';
import { X, CheckCircle, AlertCircle, Camera, Lightbulb, Sparkles } from 'lucide-react';

interface CaptureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptureGuideModal: React.FC<CaptureGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ color: 'var(--cyan-primary)' }}>
              <Camera size={22} />
            </div>
            <div>
              <h2 id="guide-title" style={{ fontSize: '1.15rem' }}>Intraoral Photo Capture Guide</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>How to take the 3 required dental views for accurate AI screening</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close guide modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Technical Specs Notice */}
          <div style={{ background: 'rgba(0, 245, 212, 0.08)', border: '1px solid rgba(0, 245, 212, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <Sparkles size={16} /> Image Requirements
            </h4>
            <ul style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.5' }}>
              <li><strong>Accepted Formats:</strong> JPEG (.jpg, .jpeg), PNG (.png), and WebP (.webp)</li>
              <li><strong>File Size:</strong> Maximum 10 MB per image</li>
              <li><strong>Quantity:</strong> Exactly 3 distinct views (Front, Upper arch, Lower arch)</li>
            </ul>
          </div>

          {/* 3 Step Views */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* View 1: Front */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="badge badge-cyan">View 1</span>
                <strong style={{ fontSize: '0.925rem' }}>Front Teeth and Gums</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Bite your back teeth gently together and smile broadly. Gently use your fingers or clean spoons as cheek retractors to keep lips away from the front teeth and anterior gums. Focus on the central smile line.
              </p>
            </div>

            {/* View 2: Upper */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="badge badge-indigo" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', border: '1px solid rgba(99, 102, 241, 0.3)' }}>View 2</span>
                <strong style={{ fontSize: '0.925rem' }}>Upper Teeth and Palate</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tilt your head slightly back and open your mouth wide. Direct phone camera upward toward the roof of your mouth (palate) and upper biting surfaces (molars). Use a flashlight or bathroom mirror light.
              </p>
            </div>

            {/* View 3: Lower */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="badge badge-blue">View 3</span>
                <strong style={{ fontSize: '0.925rem' }}>Lower Teeth and Mouth</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tilt your chin downward toward your chest. Keep mouth wide open and relax your tongue flat or against the roof of the mouth so all lower biting surfaces and the lingual gumline are visible.
              </p>
            </div>
          </div>

          {/* Quick Best Practice Tips */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lightbulb size={16} color="var(--amber-primary)" /> Key Tips for Best Results
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', fontSize: '0.775rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <CheckCircle size={15} color="var(--emerald-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Wipe camera lens clean and use direct bright illumination.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <CheckCircle size={15} color="var(--emerald-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Swallow saliva right before shooting to reduce specular glare.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <AlertCircle size={15} color="var(--rose-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Avoid blurry focus; tap screen to focus on dental enamel.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <AlertCircle size={15} color="var(--rose-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Avoid heavy shadow cast by your phone over the dental arch.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose} style={{ minWidth: '110px' }}>
            Got it, Let's Begin
          </button>
        </div>
      </div>
    </div>
  );
};
