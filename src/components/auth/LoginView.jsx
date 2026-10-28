import { useState } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, Mail, HelpCircle, ShieldCheck } from 'lucide-react';
import { authService, formatApiError } from '../../services/authService';

export default function LoginView({ onSuccess }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = userId.trim().toLowerCase();
    if (!trimmedId) {
      setError('Please enter your User ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login({
        userId: trimmedId,
        password
      });
      if (onSuccess) {
        onSuccess(data.user);
      }
    } catch (err) {
      const errorMsg = formatApiError(
        err?.message,
        'Invalid User ID or password. Access is restricted to authorized accounts.'
      );
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="card-header">
        <div className="card-icon-pill">
          <Lock size={16} className="text-teal" />
          <span>RESTRICTED ACCESS</span>
        </div>
        <h2 className="card-title">Sign In to NeuroScan AI</h2>
        <p className="card-subtitle">
          Authorized clinical and research personnel only. Enter your assigned User ID and password.
        </p>
      </div>

      {error && (
        <div className="auth-feedback-alert error" role="alert">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-content">
            <span className="alert-title">Access Denied</span>
            <span className="alert-message">{error}</span>
          </div>
        </div>
      )}

      {showContactInfo && (
        <div className="auth-feedback-alert info" role="region" aria-label="Contact Information" style={{ borderColor: 'rgba(45, 212, 191, 0.4)', background: 'rgba(13, 148, 136, 0.12)' }}>
          <Mail size={18} className="alert-icon text-teal" />
          <div className="alert-content">
            <span className="alert-title" style={{ color: 'var(--teal-300)' }}>Account Access Notice</span>
            <span className="alert-message" style={{ color: 'var(--text-main)', marginTop: '4px', display: 'block', lineHeight: '1.5' }}>
              Access is restricted. Contact the developer to request an account.
            </span>
            <div style={{ marginTop: '8px' }}>
              <a
                href="mailto:dharmavarapraaveenkumarreddy@gmail.com?subject=NeuroScan%20AI%20Access%20Request"
                className="contact-developer-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--teal-300)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'underline',
                  wordBreak: 'break-all'
                }}
              >
                <Mail size={14} />
                <span>dharmavarapraaveenkumarreddy@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <form className="auth-form-layout" onSubmit={handleSubmit} noValidate>
        {/* User ID Field */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="login-userid">
            User ID
          </label>
          <div className="field-input-box">
            <User size={18} className="field-icon" />
            <input
              id="login-userid"
              type="text"
              className="field-text-input"
              placeholder="e.g. 23491a5440"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
              disabled={loading}
              spellCheck="false"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="login-pass">
            Password
          </label>
          <div className="field-input-box">
            <Lock size={18} className="field-icon" />
            <input
              id="login-pass"
              type={showPassword ? 'text' : 'password'}
              className="field-text-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
            <button
              type="button"
              className="field-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          className="auth-action-btn primary"
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading-state">
              <span className="mini-spinner"></span>
              <span>Authenticating...</span>
            </span>
          ) : (
            <span className="btn-content-state">
              <span>Sign In</span>
              <ArrowRight size={17} />
            </span>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="auth-card-footer">
        <div className="footer-switch-prompt" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="footer-switch-btn"
            onClick={() => setShowContactInfo(!showContactInfo)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--teal-400)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '6px'
            }}
          >
            <HelpCircle size={15} />
            <span>New to NeuroScan AI?</span>
          </button>
        </div>

        <div className="security-assurance-tag" style={{ justifyContent: 'center', marginTop: '12px' }}>
          <ShieldCheck size={14} className="text-teal" />
          <span>Restricted Medical Research System</span>
        </div>
      </div>
    </div>
  );
}
