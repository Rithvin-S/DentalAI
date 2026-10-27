import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export const UrgentWarningBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className="glass-panel"
      style={{
        borderLeft: '4px solid var(--rose-primary)',
        background: 'rgba(244, 63, 94, 0.08)',
        margin: '1.25rem 0',
        padding: '0.9rem 1.25rem',
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ color: 'var(--rose-primary)', marginTop: '2px', flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FDA4AF' }}>
                URGENT CLINICAL SAFETY NOTICE
              </span>
              <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Emergency Guidance</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              If you have facial/neck swelling, fever with dental pain, uncontrolled bleeding, or difficulty breathing/swallowing,{' '}
              <strong>do not wait for an AI screening</strong>. Seek emergency medical care immediately.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)}
          className="btn btn-ghost"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
          aria-expanded={expanded}
          aria-label="Toggle emergency warning details"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(244, 63, 94, 0.2)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <strong style={{ color: '#FECDD3' }}>🚨 Immediate Emergency Care (Call 911 / Local Emergency):</strong>
              <p style={{ margin: '0.25rem 0 0' }}>Difficulty swallowing or breathing, expanding floor of mouth or throat swelling (Ludwig's Angina risk), high fever with severe facial pain.</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <strong style={{ color: '#FECDD3' }}>🏥 Same-Day Urgent Dental Clinic:</strong>
              <p style={{ margin: '0.25rem 0 0' }}>Persistent throbbing toothache keeping you awake, visible gum abscess (pus bump), or recent tooth trauma/dislodgement.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
