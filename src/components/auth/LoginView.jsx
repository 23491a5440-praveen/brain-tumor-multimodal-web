import React, { useState } from 'react';
import { authService } from '../../services/authService';

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
      setError(err.message || 'Invalid User ID or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-icon-badge">🧠</div>
        <h2 className="auth-title">
          NeuroScan AI <span className="text-highlight">Portal</span>
        </h2>
        <p className="auth-subtitle">
          Enter your User ID and password to access the clinical portal
        </p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-user-id">
            NeuroScan User ID
          </label>
          <div className="input-wrapper">
            <span className="input-icon">🪪</span>
            <input
              id="login-user-id"
              type="text"
              className="auth-input uppercase-input"
              placeholder="e.g. NS-STU-482910 or NS-HOSP-..."
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              autoComplete="username"
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              className="auth-link-btn form-link"
              onClick={onSwitchToForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={loading}
        >
          {loading ? 'Authenticating...' : 'Sign In to NeuroScan AI →'}
        </button>
      </form>

      <div className="auth-footer">
        <span>New to NeuroScan AI?</span>
        <button
          type="button"
          className="auth-link-btn"
          onClick={onSwitchToRegister}
          disabled={loading}
        >
          Create an account
        </button>
      </div>

      <div className="auth-security-notice">
        <span>🔒 Secure Clinical Session • Dual-Encrypted Vault</span>
      </div>
    </div>
  );
}
