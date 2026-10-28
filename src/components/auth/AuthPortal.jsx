import { Activity, ShieldCheck, Cpu, Brain, Sparkles } from 'lucide-react';
import LoginView from './LoginView';
import './Auth.css';

export default function AuthPortal({ onLoginSuccess }) {
  return (
    <div className="auth-master-wrapper">
      {/* Dynamic Background Effects */}
      <div className="auth-bg-ambient">
        <div className="ambient-orb ambient-teal"></div>
        <div className="ambient-orb ambient-blue"></div>
        <div className="ambient-grid-overlay"></div>
      </div>

      <div className="auth-portal-container">
        {/* Left Column: Clinical Brand & Capabilities */}
        <aside className="auth-brand-showcase">
          <div className="brand-badge-pill">
            <Sparkles size={13} className="text-teal" />
            <span>CLINICAL NEURAL INTELLIGENCE v2.4</span>
          </div>

          <div className="brand-hero-header">
            <div className="brand-logo-frame">
              <Brain size={38} className="brand-logo-icon" />
              <div className="logo-pulse-ring"></div>
            </div>
            <div>
              <h1 className="brand-title">
                NeuroScan <span className="brand-highlight">AI</span>
              </h1>
              <p className="brand-tagline">Multimodal Deep Learning Brain Tumor Diagnostic System</p>
            </div>
          </div>

          <p className="brand-description">
            Restricted clinical intelligence platform connecting authorized radiologists and researchers to advanced multimodal MRI/CT classification networks.
          </p>

          <div className="brand-features-list">
            <div className="brand-feature-item">
              <div className="feature-icon-box">
                <Cpu size={18} className="text-teal" />
              </div>
              <div>
                <h4 className="feature-title">Dual-Stream Late Fusion</h4>
                <p className="feature-desc">Simultaneous cross-modality feature extraction via coupled EfficientNet-B0 encoders.</p>
              </div>
            </div>

            <div className="brand-feature-item">
              <div className="feature-icon-box">
                <Activity size={18} className="text-teal" />
              </div>
              <div>
                <h4 className="feature-title">Intelligent Brain Scan Analysis</h4>
                <p className="feature-desc">AI-powered CT and MRI classification with high confidence diagnostic outputs.</p>
              </div>
            </div>

            <div className="brand-feature-item">
              <div className="feature-icon-box">
                <ShieldCheck size={18} className="text-teal" />
              </div>
              <div>
                <h4 className="feature-title">Restricted Clinical Access</h4>
                <p className="feature-desc">Authorized credentials required. Public registration is strictly disabled.</p>
              </div>
            </div>
          </div>

          <div className="brand-footer-specs">
            <div className="spec-metric">
              <span className="spec-value">5</span>
              <span className="spec-label">Authorized Accounts</span>
            </div>
            <div className="spec-divider"></div>
            <div className="spec-metric">
              <span className="spec-value">CT & MRI</span>
              <span className="spec-label">Supported Modalities</span>
            </div>
            <div className="spec-divider"></div>
            <div className="spec-metric">
              <span className="spec-value">Real-Time</span>
              <span className="spec-label">Diagnostic Inference</span>
            </div>
          </div>
        </aside>

        {/* Right Column: Restricted Login Form */}
        <main className="auth-form-card-container">
          <LoginView onSuccess={onLoginSuccess} />
        </main>
      </div>
    </div>
  );
}
