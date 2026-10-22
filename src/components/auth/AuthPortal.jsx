import { useState } from 'react';
import { Activity, ShieldCheck, Cpu, Brain, Sparkles } from 'lucide-react';
import LoginView from './LoginView';
import RegisterView from './RegisterView';
import ForgotPasswordView from './ForgotPasswordView';
import './Auth.css';

export default function AuthPortal({ onLoginSuccess }) {
  const [activeView, setActiveView] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [prefilledUserId, setPrefilledUserId] = useState('');

  const handleRegisterSuccess = (userId) => {
    if (userId) {
      setPrefilledUserId(userId);
    }
  };

  const handleSwitchToLogin = (userId = '') => {
    if (userId) {
      setPrefilledUserId(userId);
    }
    setActiveView('login');
  };

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
            Secure clinical authentication platform connecting hospitals, diagnostic centers, medical students, and oncology researchers to advanced multimodal MRI/CT classification networks.
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
                <h4 className="feature-title">Sub-Millimeter Grad-CAM</h4>
                <p className="feature-desc">Visual lesion localization heatmaps for explainable clinical validation.</p>
              </div>
            </div>

            <div className="brand-feature-item">
              <div className="feature-icon-box">
                <ShieldCheck size={18} className="text-teal" />
              </div>
              <div>
                <h4 className="feature-title">Vault-Grade ID Security</h4>
                <p className="feature-desc">Permanent clinical User IDs with PBKDF2-HMAC-SHA256 encrypted access and PIN recovery.</p>
              </div>
            </div>
          </div>

          <div className="brand-footer-specs">
            <div className="spec-metric">
              <span className="spec-value">4</span>
              <span className="spec-label">Clinical Roles</span>
            </div>
            <div className="spec-divider"></div>
            <div className="spec-metric">
              <span className="spec-value">100k</span>
              <span className="spec-label">PBKDF2 Rounds</span>
            </div>
            <div className="spec-divider"></div>
            <div className="spec-metric">
              <span className="spec-value">0%</span>
              <span className="spec-label">Email Vulnerability</span>
            </div>
          </div>
        </aside>

        {/* Right Column: Interactive Portal Card */}
        <main className="auth-form-card-container">
          {activeView === 'login' && (
            <LoginView
              initialUserId={prefilledUserId}
              onSuccess={onLoginSuccess}
              onSwitchToRegister={() => setActiveView('register')}
              onSwitchToForgotPassword={() => setActiveView('forgot-password')}
            />
          )}

          {activeView === 'register' && (
            <RegisterView
              onRegisteredSuccess={handleRegisterSuccess}
              onSwitchToLogin={handleSwitchToLogin}
            />
          )}

          {activeView === 'forgot-password' && (
            <ForgotPasswordView
              onSwitchToLogin={handleSwitchToLogin}
            />
          )}
        </main>
      </div>
    </div>
  );
}
