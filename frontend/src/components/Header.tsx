import React from 'react';
import { Activity, BookOpen, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  backendOnline: boolean;
  onOpenGuide: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  onOpenGuide,
  theme,
  onToggleTheme,
  onReset
}) => {
  return (
    <header className="glass-panel" style={{ margin: '1rem auto 0', maxWidth: '1280px', width: '95%', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Brand */}
        <div 
          onClick={onReset}
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          aria-label="DentalAI Home"
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.2) 0%, rgba(99, 102, 241, 0.25) 100%)',
            border: '1px solid rgba(0, 245, 212, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan-primary)',
            boxShadow: '0 0 15px rgba(0, 245, 212, 0.25)'
          }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #FFFFFF, var(--cyan-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                DentalAI
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                Prototype v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              AI-Assisted Intraoral Visual Screening
            </p>
          </div>
        </div>

        {/* Right Navigation & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Backend Health & AI Engines Badge */}
          <div 
            className={`badge ${backendOnline ? 'badge-emerald' : 'badge-amber'}`}
            title={backendOnline ? 'FastAPI Backend, Approach A (Gemini API) & Approach B (Open-Source YOLO) Connected' : 'FastAPI Backend Offline - Running in Client Demo Simulation Mode'}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
          >
            <span className="pulse-dot" style={{ color: backendOnline ? 'var(--emerald-primary)' : 'var(--amber-primary)' }} />
            <span>{backendOnline ? 'Approach A & B Ready' : 'Demo Mode'}</span>
          </div>

          {/* Capture Guide Button */}
          <button 
            className="btn btn-secondary" 
            onClick={onOpenGuide}
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
            id="open-guide-btn"
          >
            <BookOpen size={16} />
            <span>Capture Guide</span>
          </button>

          {/* Theme Toggle */}
          <button 
            className="btn btn-ghost"
            onClick={onToggleTheme}
            aria-label="Toggle visual theme"
            style={{ padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)' }}
          >
            {theme === 'dark' ? <Sun size={18} color="var(--cyan-primary)" /> : <Moon size={18} color="var(--indigo-primary)" />}
          </button>
        </div>
      </div>
    </header>
  );
};
