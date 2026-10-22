import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, KeyRound, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { authService } from '../../services/authService';

export default function ForgotPasswordView({ onResetSuccess, onNavigate }) {
  // Step: 1 = Request OTP, 2 = Verify OTP, 3 = Set New Password, 4 = Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devNotice, setDevNotice] = useState(null);

  // 10-minute timer for OTP expiry
  const [timeLeft, setTimeLeft] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    let cooldownTimer;
    if (step === 2 && resendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [step, resendCooldown]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Step 1: Send OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setDevNotice(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.requestPasswordResetOtp(email.trim());
      setSuccessMsg(data.message || 'Verification code dispatched.');
      if (data.dev_hint) {
        setDevNotice(data.dev_hint);
      }
      setStep(2);
      setTimeLeft(600);
      setResendCooldown(60);
      setCanResend(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setErrorMsg('Please enter a 6-digit numeric verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifyPasswordResetOtp(email.trim(), cleanOtp);
      setResetToken(data.reset_token);
      setSuccessMsg('Verification code confirmed! You can now set your new password.');
      setStep(3);
    } catch (err) {
      setErrorMsg(err.message || 'Incorrect or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long with letters and numbers.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.resetPassword({
        email: email.trim(),
        resetToken,
        newPassword,
        confirmPassword
      });
      setSuccessMsg(data.message || 'Password successfully updated!');
      setStep(4);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Please restart the reset process.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <button
          type="button"
          className="auth-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.85rem' }}
          onClick={() => onNavigate('login')}
        >
          <ArrowLeft size={16} />
          <span>Back to Sign In</span>
        </button>

        <h2 className="auth-title">
          Reset Your <span className="title-gradient">Password</span>
        </h2>
        <p className="auth-subtitle">
          {step === 1 && 'Enter your registered email to receive a secure one-time verification code.'}
          {step === 2 && `Enter the 6-digit verification code sent to ${email}.`}
          {step === 3 && 'Choose a strong, secure new password for your NeuroScan AI account.'}
          {step === 4 && 'Your password has been successfully reset!'}
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

      {devNotice && (
        <div className="auth-alert auth-alert-info">
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-cyan)' }} />
          <div>
            <strong>Local Dev Preview:</strong> {devNotice.notice}
            <div style={{ marginTop: '0.35rem', fontFamily: 'monospace', fontSize: '1rem', color: '#38bdf8' }}>
              OTP Code: <strong>{devNotice.dev_otp}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Email Form */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp}>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-email">
              Registered Email Address
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon-left" />
              <input
                id="reset-email"
                type="email"
                className="auth-input"
                placeholder="physician@hospital.org or student@univ.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
                autoFocus
              />
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
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: 6-Digit OTP Verification Form */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp}>
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label className="form-label" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
              Enter 6-Digit Verification Code
            </label>
            <div className="otp-input-container">
              <input
                type="text"
                className="otp-digit-input"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              <span>
                Code expires in:{' '}
                <strong style={{ color: timeLeft < 60 ? 'var(--error-color)' : 'var(--accent-cyan)' }}>
                  {formatTimer(timeLeft)}
                </strong>
              </span>
              <button
                type="button"
                className="auth-link"
                disabled={!canResend || isLoading}
                onClick={handleRequestOtp}
                style={{ opacity: canResend ? 1 : 0.5, cursor: canResend ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <RefreshCw size={12} />
                <span>{canResend ? 'Resend code' : `Resend in ${resendCooldown}s`}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <span>Verify Code</span>
                <KeyRound size={18} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 3: New Password Form */}
      {step === 3 && (
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              <span>New Password</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>min 8 chars, 1 letter, 1 digit</span>
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon-left" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
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

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-new-password">
              Confirm New Password
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon-left" />
              <input
                id="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Save New Password & Continue</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 4: Success confirmation */}
      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <Sparkles size={40} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
            Password Reset Complete!
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Your account credentials have been securely updated. You can now sign in using your new password.
          </p>
          <button
            type="button"
            className="auth-submit-btn"
            onClick={() => {
              if (onResetSuccess) onResetSuccess();
              onNavigate('login');
            }}
          >
            <span>Proceed to Sign In</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      <div className="auth-footer">
        <div>
          Remembered your password?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => onNavigate('login')}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
