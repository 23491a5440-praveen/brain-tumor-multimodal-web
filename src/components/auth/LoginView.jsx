import { useState } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, KeyRound, UserPlus } from 'lucide-react';
import { authService, formatApiError } from '../../services/authService';

export default function LoginView({
  initialUserId = '',
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword
}) {
  const [userId, setUserId] = useState(initialUserId || '');
  const [prevInitialId, setPrevInitialId] = useState(initialUserId);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (initialUserId !== prevInitialId) {
    setPrevInitialId(initialUserId);
    setUserId(initialUserId);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = userId.trim().toUpperCase();
    if (!trimmedId) {
      setError('Please enter your NeuroScan User ID.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
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
      const errorMsg = formatApiError(err?.message, 'Invalid User ID or password. Please verify your credentials.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="card-header">
        <div className="card-icon-pill">
          <Lock size={18} className="text-teal" />
          <span>AUTHORIZED ACCESS</span>
        </div>
        <h2 className="card-title">Sign In to NeuroScan AI</h2>
        <p className="card-subtitle">
          Enter your assigned User ID and secure password to initiate a clinical session.
        </p>
      </div>

      {error && (
        <div className="auth-feedback-alert error" role="alert">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-content">
            <span className="alert-title">Authentication Error</span>
            <span className="alert-message">{error}</span>
          </div>
        </div>
      )}

      <form className="auth-form-layout" onSubmit={handleSubmit} noValidate>
        {/* User ID Field */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="login-userid">
            Permanent User ID
          </label>
          <div className="field-input-box">
            <User size={18} className="field-icon" />
            <input
              id="login-userid"
              type="text"
              className="field-text-input uppercase-text"
              placeholder="e.g. NS-STU-482910 or NS-HOSP-..."
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              autoComplete="username"
              disabled={loading}
              spellCheck="false"
              required
            />
          </div>
          <span className="field-helper-text">
            Provided during account registration (e.g. NS-STU-XXXXXX, NS-HOSP-XXXXXX).
          </span>
        </div>

        {/* Password Field */}
        <div className="form-field-group">
          <div className="field-label-split">
            <label className="field-label" htmlFor="login-pass">
              Account Password
            </label>
            <button
              type="button"
              className="field-action-link"
              onClick={onSwitchToForgotPassword}
              disabled={loading}
            >
              <KeyRound size={12} />
              <span>Forgot password?</span>
            </button>
          </div>
          <div className="field-input-box">
            <Lock size={18} className="field-icon" />
            <input
              id="login-pass"
              type={showPassword ? 'text' : 'password'}
              className="field-text-input"
              placeholder="Enter your password"
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
              <span>Authenticating Session...</span>
            </span>
          ) : (
            <span className="btn-content-state">
              <span>Sign In to Dashboard</span>
              <ArrowRight size={17} />
            </span>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="auth-card-footer">
        <div className="footer-switch-prompt">
          <span>Don't have a clinical User ID?</span>
          <button
            type="button"
            className="footer-switch-btn"
            onClick={onSwitchToRegister}
            disabled={loading}
          >
            <UserPlus size={14} />
            <span>Create New Account</span>
          </button>
        </div>

        <div className="security-assurance-tag">
          <Lock size={12} className="text-teal" />
          <span>End-to-End Cryptographic Session • Zero Plaintext Storage</span>
        </div>
      </div>
    </div>
  );
}
