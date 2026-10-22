import { useState } from 'react';
import { KeyRound, Lock, User, Key, Check, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { authService, formatApiError } from '../../services/authService';

export default function ForgotPasswordView({ onSwitchToLogin }) {
  const [userId, setUserId] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = userId.trim().toUpperCase();
    if (!trimmedId) {
      setError('Please provide your assigned NeuroScan User ID.');
      return;
    }
    if (!recoveryPin.trim()) {
      setError('Please provide your registered Recovery PIN.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must contain at least 8 characters with at least 1 letter and 1 numeric digit.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        userId: trimmedId,
        recoveryPin: recoveryPin.trim(),
        newPassword,
        confirmPassword
      });
      setSuccess(true);
    } catch (err) {
      const msg = formatApiError(err?.message, 'Password reset failed. Please check your User ID and Recovery PIN.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-card success-stage">
        <div className="card-header text-center">
          <div className="success-icon-badge">
            <Check size={28} />
          </div>
          <h2 className="card-title">Password Reset Complete</h2>
          <p className="card-subtitle">
            Your credentials have been securely updated.
          </p>
        </div>

        <div className="auth-feedback-alert success" style={{ margin: '1.5rem 0' }}>
          <Check size={18} className="alert-icon" />
          <div className="alert-content">
            <span className="alert-title">Sessions Invalidated</span>
            <span className="alert-message">
              All active sessions have been terminated. You can now authenticate with your User ID and new password.
            </span>
          </div>
        </div>

        <button
          type="button"
          className="auth-action-btn primary"
          onClick={() => onSwitchToLogin(userId.trim().toUpperCase())}
        >
          <span>Sign In with New Password</span>
          <ArrowRight size={17} />
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="card-header">
        <div className="card-icon-pill">
          <KeyRound size={16} className="text-teal" />
          <span>CREDENTIAL RECOVERY</span>
        </div>
        <h2 className="card-title">Reset Clinical Password</h2>
        <p className="card-subtitle">
          Authenticate using your User ID and Recovery PIN to establish a new password.
        </p>
      </div>

      {error && (
        <div className="auth-feedback-alert error" role="alert">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-content">
            <span className="alert-title">Recovery Error</span>
            <span className="alert-message">{error}</span>
          </div>
        </div>
      )}

      <form className="auth-form-layout" onSubmit={handleSubmit} noValidate>
        {/* User ID Field */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="reset-userid">
            NeuroScan User ID
          </label>
          <div className="field-input-box">
            <User size={18} className="field-icon" />
            <input
              id="reset-userid"
              type="text"
              className="field-text-input uppercase-text"
              placeholder="e.g. NS-STU-482910"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              disabled={loading}
              spellCheck="false"
              required
            />
          </div>
        </div>

        {/* Recovery PIN */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="reset-recovery-pin">
            Secret Recovery PIN
          </label>
          <div className="field-input-box">
            <Key size={18} className="field-icon" />
            <input
              id="reset-recovery-pin"
              type="password"
              className="field-text-input"
              placeholder="Enter the 4–16 digit/char PIN set at registration"
              value={recoveryPin}
              onChange={(e) => setRecoveryPin(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* New Password & Confirm */}
        <div className="form-field-row">
          <div className="form-field-group">
            <label className="field-label" htmlFor="reset-newpass">
              New Password
            </label>
            <div className="field-input-box">
              <Lock size={18} className="field-icon" />
              <input
                id="reset-newpass"
                type="password"
                className="field-text-input"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label" htmlFor="reset-newpass-confirm">
              Confirm New Password
            </label>
            <div className="field-input-box">
              <Lock size={18} className="field-icon" />
              <input
                id="reset-newpass-confirm"
                type="password"
                className="field-text-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="auth-action-btn primary"
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading-state">
              <span className="mini-spinner"></span>
              <span>Validating PIN & Updating...</span>
            </span>
          ) : (
            <span className="btn-content-state">
              <span>Verify PIN & Reset Password</span>
              <ArrowRight size={17} />
            </span>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="auth-card-footer">
        <div className="footer-switch-prompt">
          <span>Remember your credentials?</span>
          <button
            type="button"
            className="footer-switch-btn"
            onClick={() => onSwitchToLogin(userId)}
            disabled={loading}
          >
            <ArrowLeft size={14} />
            <span>Return to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
