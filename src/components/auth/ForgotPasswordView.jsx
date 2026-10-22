import React, { useState } from 'react';
import { authService } from '../../services/authService';

export default function ForgotPasswordView({ onSwitchToLogin }) {
  const [userId, setUserId] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = userId.trim().toUpperCase();
    if (!trimmedId) {
      setError('Please enter your NeuroScan User ID.');
      return;
    }
    if (!recoveryPin.trim()) {
      setError('Please enter your Recovery PIN.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long with 1 letter and 1 digit.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
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
      setError(err.message || 'Password reset failed. Please check your User ID and Recovery PIN.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-card auth-card-success">
        <div className="auth-header">
          <div className="auth-icon-badge auth-icon-success">✓</div>
          <h2 className="auth-title">Password Reset Complete</h2>
          <p className="auth-subtitle">
            Your password has been successfully updated.
          </p>
        </div>

        <div className="auth-alert auth-alert-success" style={{ margin: '1.25rem 0' }}>
          All previous active sessions have been terminated. You can now sign in with your User ID and new password.
        </div>

        <button
          type="button"
          className="auth-btn auth-btn-primary"
          onClick={() => onSwitchToLogin(userId.trim().toUpperCase())}
        >
          Proceed to Sign In →
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-icon-badge">🔑</div>
        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-subtitle">
          Enter your User ID and Recovery PIN to set a new password
        </p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* User ID */}
        <div className="form-group">
          <label className="form-label" htmlFor="reset-user-id">
            NeuroScan User ID
          </label>
          <div className="input-wrapper">
            <span className="input-icon">🪪</span>
            <input
              id="reset-user-id"
              type="text"
              className="auth-input uppercase-input"
              placeholder="e.g. NS-STU-482910"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Recovery PIN */}
        <div className="form-group">
          <label className="form-label" htmlFor="reset-pin">
            Recovery PIN
          </label>
          <div className="input-wrapper">
            <span className="input-icon">🔑</span>
            <input
              id="reset-pin"
              type={showPin ? 'text' : 'password'}
              className="auth-input"
              placeholder="Enter your security PIN"
              value={recoveryPin}
              onChange={(e) => setRecoveryPin(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="input-eye-btn"
              onClick={() => setShowPin(!showPin)}
              aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              {showPin ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="reset-new-password">New Password</label>
            <span className="form-hint">min 8 chars, 1 letter, 1 digit</span>
          </div>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Create new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="input-eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="form-group">
          <label className="form-label" htmlFor="reset-confirm-password">Confirm New Password</label>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              id="reset-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={loading}
        >
          {loading ? 'Verifying & Resetting...' : 'Reset Password →'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Remembered your password?</span>
        <button
          type="button"
          className="auth-link-btn"
          onClick={() => onSwitchToLogin(userId)}
          disabled={loading}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
