import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consentAcknowledged: boolean;
  onToggleConsent: (val: boolean) => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onClose,
  consentAcknowledged,
  onToggleConsent
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ color: 'var(--cyan-primary)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 id="consent-title" style={{ fontSize: '1.15rem' }}>Informed Consent & Privacy Notice</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transparent details regarding your intraoral images and AI screening</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close consent modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            
            {/* Notice Section 1 */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--cyan-primary)', marginTop: '2px' }}>
                <EyeOff size={18} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Sensitive Health-Related Data</strong>
                <p style={{ margin: '0.2rem 0 0' }}>
                  Intraoral photographs depict personal anatomical structures (teeth, gums, tongue, palate). By proceeding, you confirm that you are submitting your own photographs (or photos of a person for whom you are legally authorized) with voluntary consent.
                </p>
              </div>
            </div>

            {/* Notice Section 2 */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--blue-primary)', marginTop: '2px' }}>
                <Lock size={18} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Transient Processing & No Permanent Storage</strong>
                <p style={{ margin: '0.2rem 0 0' }}>
                  In this prototype version, submitted images and AI findings are held transiently in active session memory only. Images are NOT saved into a persistent user database or sold to third-party marketing brokers.
                </p>
              </div>
            </div>

            {/* Notice Section 3 */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--amber-primary)', marginTop: '2px' }}>
                <FileText size={18} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Non-Diagnostic Prototype Nature</strong>
                <p style={{ margin: '0.2rem 0 0' }}>
                  DentalAI is an AI-assisted visual screening research prototype, <strong>NOT an FDA/CE-cleared diagnostic medical device</strong>. Photographs cannot identify subsurface decay, interproximal caries, or bone loss. A screening with no reported findings does NOT certify oral health.
                </p>
              </div>
            </div>

            {/* Acknowledgment Checkbox */}
            <div style={{
              marginTop: '0.5rem',
              padding: '0.9rem 1rem',
              background: 'rgba(0, 245, 212, 0.08)',
              border: '1px solid rgba(0, 245, 212, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer'
            }}
            onClick={() => onToggleConsent(!consentAcknowledged)}
            >
              <input
                type="checkbox"
                id="consent-checkbox"
                checked={consentAcknowledged}
                onChange={(e) => onToggleConsent(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--cyan-primary)', cursor: 'pointer', marginTop: '2px' }}
              />
              <label htmlFor="consent-checkbox" style={{ fontSize: '0.825rem', color: 'var(--text-primary)', cursor: 'pointer', lineHeight: '1.4' }}>
                <strong>I have read, understood, and accept</strong> the data processing notice, research prototype limitations, and non-diagnostic disclaimer.
              </label>
            </div>

          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Back
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              if (!consentAcknowledged) onToggleConsent(true);
              onClose();
            }}
            id="confirm-consent-btn"
          >
            Confirm & Save Consent
          </button>
        </div>
      </div>
    </div>
  );
};
