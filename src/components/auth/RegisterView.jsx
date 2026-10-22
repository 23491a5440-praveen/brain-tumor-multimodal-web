import React, { useState } from 'react';
import { authService } from '../../services/authService';

const ROLE_OPTIONS = [
  {
    id: 'hospital',
    label: 'Hospital',
    icon: '🏥',
    orgLabel: 'Hospital / Health System Name',
    orgPlaceholder: 'e.g. Johns Hopkins Hospital / Apollo Health',
    nameLabel: 'Chief Medical Officer / Authorized Clinician',
    namePlaceholder: 'e.g. Dr. Eleanor Vance, MD'
  },
  {
    id: 'clinic',
    label: 'Clinic / Diagnostic',
    icon: '🔬',
    orgLabel: 'Clinic / Diagnostic Centre Name',
    orgPlaceholder: 'e.g. Metro Neuro-Diagnostic Centre',
    nameLabel: 'Lead Radiologist / Centre Director',
    namePlaceholder: 'e.g. Dr. Marcus Brody, MD'
  },
  {
    id: 'student',
    label: 'Student',
    icon: '🎓',
    orgLabel: 'College or University Name',
    orgPlaceholder: 'e.g. Stanford University School of Medicine',
    nameLabel: "Student's Full Name",
    namePlaceholder: 'e.g. Alex Rivera'
  },
  {
    id: 'researcher',
    label: 'Researcher',
    icon: '🧬',
    orgLabel: 'Research Institution / Laboratory',
    orgPlaceholder: 'e.g. Broad Institute / Neuro-AI Research Lab',
    nameLabel: 'Principal Investigator / Research Fellow',
    namePlaceholder: 'e.g. Dr. Sarah Jenkins, PhD'
  }
];

export default function RegisterView({ onSwitchToLogin, onRegisteredSuccess }) {
  const [selectedRole, setSelectedRole] = useState('student');
  const [organization, setOrganization] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [confirmRecoveryPin, setConfirmRecoveryPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [copied, setCopied] = useState(false);

  const currentRoleConfig = ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[2];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!organization.trim()) {
      setError(`Please enter your ${currentRoleConfig.orgLabel.toLowerCase()}.`);
      return;
    }
    if (!fullName.trim()) {
      setError(`Please enter your ${currentRoleConfig.nameLabel.toLowerCase()}.`);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters with 1 letter and 1 number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (recoveryPin.trim().length < 4) {
      setError('Recovery PIN must be at least 4 characters/digits.');
      return;
    }
    if (recoveryPin !== confirmRecoveryPin) {
      setError('Recovery PINs do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.register({
        role: selectedRole,
        fullName: fullName.trim(),
        organization: organization.trim(),
        password,
        confirmPassword,
        recoveryPin: recoveryPin.trim(),
        confirmRecoveryPin: confirmRecoveryPin.trim()
      });

      setRegisteredUser(result);
      if (onRegisteredSuccess) {
        onRegisteredSuccess(result.user_id);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUserId = () => {
    if (registeredUser?.user_id) {
      navigator.clipboard.writeText(registeredUser.user_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Success view with generated User ID
  if (registeredUser) {
    return (
      <div className="auth-card auth-card-success">
        <div className="auth-header">
          <div className="auth-icon-badge auth-icon-success">✓</div>
          <h2 className="auth-title">Account Created!</h2>
          <p className="auth-subtitle">
            Your unique NeuroScan AI User ID has been generated.
          </p>
        </div>

        <div className="user-id-display-card">
          <span className="user-id-label">YOUR PERMANENT USER ID</span>
          <div className="user-id-row">
            <span className="user-id-code">{registeredUser.user_id}</span>
            <button
              type="button"
              className="user-id-copy-btn"
              onClick={handleCopyUserId}
              title="Copy User ID to clipboard"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <p className="user-id-role-tag">
            Account Role: <strong>{currentRoleConfig.label}</strong> ({registeredUser.organization})
          </p>
        </div>

        <div className="auth-alert auth-alert-warning" style={{ marginTop: '1rem', textAlign: 'left' }}>
          <strong>⚠️ Important:</strong> Save this User ID in a safe place. You will need your <strong>User ID</strong> and <strong>password</strong> to sign in. If you ever forget your password, you will use your <strong>Recovery PIN</strong>.
        </div>

        <button
          type="button"
          className="auth-btn auth-btn-primary"
          style={{ marginTop: '1.25rem' }}
          onClick={() => onSwitchToLogin(registeredUser.user_id)}
        >
          Sign In Now →
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-icon-badge">🧠</div>
        <h2 className="auth-title">Create NeuroScan Account</h2>
        <p className="auth-subtitle">
          Select your role to generate your permanent clinical User ID
        </p>
      </div>

      {/* Role Selector Tabs */}
      <div className="role-selector" role="tablist" aria-label="Account Role Selection">
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`role-tab ${selectedRole === role.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedRole(role.id);
              setError('');
            }}
          >
            <span className="role-icon">{role.icon}</span>
            <span className="role-name">{role.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Dynamic Organization Field */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-org">
            {currentRoleConfig.orgLabel}
          </label>
          <div className="input-wrapper">
            <span className="input-icon">🏛️</span>
            <input
              id="reg-org"
              type="text"
              className="auth-input"
              placeholder={currentRoleConfig.orgPlaceholder}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Dynamic Full Name Field */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-name">
            {currentRoleConfig.nameLabel}
          </label>
          <div className="input-wrapper">
            <span className="input-icon">👤</span>
            <input
              id="reg-name"
              type="text"
              className="auth-input"
              placeholder={currentRoleConfig.namePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <span className="form-hint">min 8 chars, 1 letter, 1 digit</span>
          </div>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Create strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {/* Confirm Password */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-confirm-password">Confirm Password</label>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Recovery PIN */}
        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="reg-pin">Recovery PIN</label>
            <span className="form-hint">4–16 digits / characters</span>
          </div>
          <div className="input-wrapper">
            <span className="input-icon">🔑</span>
            <input
              id="reg-pin"
              type={showPin ? 'text' : 'password'}
              className="auth-input"
              placeholder="e.g. 7482 or security PIN"
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
          <p className="form-subhint">Used to reset your password if you ever forget it. Never shared with anyone.</p>
        </div>

        {/* Confirm Recovery PIN */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-confirm-pin">Confirm Recovery PIN</label>
          <div className="input-wrapper">
            <span className="input-icon">🔑</span>
            <input
              id="reg-confirm-pin"
              type={showPin ? 'text' : 'password'}
              className="auth-input"
              placeholder="Re-enter recovery PIN"
              value={confirmRecoveryPin}
              onChange={(e) => setConfirmRecoveryPin(e.target.value)}
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
          {loading ? 'Generating User ID...' : 'Complete Registration →'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Already have a User ID?</span>
        <button
          type="button"
          className="auth-link-btn"
          onClick={() => onSwitchToLogin()}
          disabled={loading}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
