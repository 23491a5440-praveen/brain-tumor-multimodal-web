import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, BrainCircuit, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';

export default function LoginView({ initialEmail = '', onLoginSuccess, onNavigate }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.login({ email: email.trim(), password });
      setSuccessMsg('Authentication successful! Initializing neuroimaging workspace...');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo-badge">
          <BrainCircuit size={32} />
        </div>
        <h2 className="auth-title">
          <span className="title-gradient">NeuroScan AI</span> Portal
        </h2>
        <p className="auth-subtitle">
          Intelligent multimodal brain scan analysis & deep clinical neural network authentication
        </p>
      </div>

      {errorMsg && (
        <div className="auth-alert auth-alert-error">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="auth-alert auth-alert-success">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{successMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">
            <span>Email Address</span>
          </label>
          <div className="input-wrapper">
            <Mail size={18} className="input-icon-left" />
            <input
              id="login-email"
              type="email"
              className="auth-input"
              placeholder="e.g. physician@hospital.org or student@univ.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-group">
          <div className="form-label">
            <label htmlFor="login-password">Password</label>
            <button
              type="button"
              className="auth-link"
              style={{ fontSize: '0.8rem' }}
              onClick={() => onNavigate('forgot-password')}
            >
              Forgot password?
            </button>
          </div>
          <div className="input-wrapper">
            <Lock size={18} className="input-icon-left" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="input-action-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to NeuroScan AI</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <div>
          New to NeuroScan AI?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => onNavigate('register')}
          >
            Create an account
          </button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span className="auth-disclaimer-badge">
            <ShieldCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
            Encrypted Session • Research & Educational Imaging
          </span>
        </div>
      </div>
    </div>
  );
}
