import { useState } from 'react';
import { Building2, Activity, GraduationCap, Microscope, Lock, User, Key, Check, Copy, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { authService, formatApiError } from '../../services/authService';

const ROLE_OPTIONS = [
  {
    id: 'hospital',
    label: 'Hospital',
    icon: Building2,
    badge: 'HEALTHCARE NETWORK',
    orgLabel: 'Hospital / Healthcare System Name',
    orgPlaceholder: 'e.g. Johns Hopkins Hospital / Apollo Health',
    nameLabel: 'Chief Medical Officer / Authorized Clinician',
    namePlaceholder: 'e.g. Dr. Eleanor Vance, MD'
  },
  {
    id: 'clinic',
    label: 'Clinic / Diagnostic',
    icon: Activity,
    badge: 'DIAGNOSTIC LAB',
    orgLabel: 'Clinic / Diagnostic Centre Name',
    orgPlaceholder: 'e.g. Metro Neuro-Diagnostic Imaging Centre',
    nameLabel: 'Lead Radiologist / Medical Director',
    namePlaceholder: 'e.g. Dr. Marcus Brody, MD'
  },
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    badge: 'ACADEMIC RESEARCH',
    orgLabel: 'College or University Name',
    orgPlaceholder: 'e.g. Stanford University School of Medicine',
    nameLabel: "Student's Full Name",
    namePlaceholder: 'e.g. Alex Rivera'
  },
  {
    id: 'researcher',
    label: 'Researcher',
    icon: Microscope,
    badge: 'NEURO-ONCOLOGY LAB',
    orgLabel: 'Research Institution / Laboratory',
    orgPlaceholder: 'e.g. Broad Institute / Neuro-AI Laboratory',
    nameLabel: 'Principal Investigator / Fellow',
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [copied, setCopied] = useState(false);

  const currentRole = ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[2];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!organization.trim()) {
      setError(`Please provide your ${currentRole.orgLabel.toLowerCase()}.`);
      return;
    }
    if (!fullName.trim()) {
      setError(`Please provide your ${currentRole.nameLabel.toLowerCase()}.`);
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters with at least 1 letter and 1 numeric digit.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Account passwords do not match. Please re-enter.');
      return;
    }
    if (recoveryPin.trim().length < 4) {
      setError('Recovery PIN must be at least 4 characters/digits long.');
      return;
    }
    if (recoveryPin.trim() !== confirmRecoveryPin.trim()) {
      setError('Recovery PINs do not match. Please re-enter.');
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
      const msg = formatApiError(err?.message, 'Registration failed. Please check your information.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (registeredUser?.user_id) {
      navigator.clipboard.writeText(registeredUser.user_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // State: Registration Succeeded with Generated User ID
  if (registeredUser) {
    return (
      <div className="auth-card success-stage">
        <div className="card-header text-center">
          <div className="success-icon-badge">
            <Check size={28} />
          </div>
          <h2 className="card-title">Account Successfully Created</h2>
          <p className="card-subtitle">
            Your permanent NeuroScan AI credential has been provisioned.
          </p>
        </div>

        <div className="user-id-callout-card">
          <span className="callout-subheading">PERMANENT CLINICAL USER ID</span>
          <div className="callout-code-container">
            <span className="callout-id-text">{registeredUser.user_id}</span>
            <button
              type="button"
              className={`callout-copy-action ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title="Copy User ID to clipboard"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>
          <p className="callout-metadata">
            Role: <strong>{currentRole.label}</strong> • {registeredUser.organization}
          </p>
        </div>

        <div className="auth-feedback-alert warning">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-content">
            <span className="alert-title">Critical Security Notice</span>
            <span className="alert-message">
              Record this User ID securely now. You will need it and your password to sign in. In case of lost credentials, your Recovery PIN is required.
            </span>
          </div>
        </div>

        <button
          type="button"
          className="auth-action-btn primary"
          style={{ marginTop: '1.5rem' }}
          onClick={() => onSwitchToLogin(registeredUser.user_id)}
        >
          <span>Continue to Sign In</span>
          <ArrowRight size={17} />
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="card-header">
        <div className="card-icon-pill">
          <Building2 size={16} className="text-teal" />
          <span>INSTITUTIONAL REGISTRATION</span>
        </div>
        <h2 className="card-title">Create Clinical Account</h2>
        <p className="card-subtitle">
          Select your institutional role to generate your permanent clinical User ID.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="role-selection-grid" role="tablist">
        {ROLE_OPTIONS.map((r) => {
          const IconComp = r.icon;
          const isSelected = selectedRole === r.id;
          return (
            <button
              key={r.id}
              type="button"
              className={`role-select-card ${isSelected ? 'active' : ''}`}
              onClick={() => {
                setSelectedRole(r.id);
                setError('');
              }}
              role="tab"
              aria-selected={isSelected}
            >
              <div className="role-card-icon">
                <IconComp size={18} />
              </div>
              <div className="role-card-info">
                <span className="role-title">{r.label}</span>
                <span className="role-badge-text">{r.badge}</span>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="auth-feedback-alert error" role="alert">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-content">
            <span className="alert-title">Registration Error</span>
            <span className="alert-message">{error}</span>
          </div>
        </div>
      )}

      <form className="auth-form-layout" onSubmit={handleSubmit} noValidate>
        {/* Dynamic Organization Field */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="reg-organization">
            {currentRole.orgLabel}
          </label>
          <div className="field-input-box">
            <Building2 size={18} className="field-icon" />
            <input
              id="reg-organization"
              type="text"
              className="field-text-input"
              placeholder={currentRole.orgPlaceholder}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Dynamic Authorized Name Field */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="reg-fullname">
            {currentRole.nameLabel}
          </label>
          <div className="field-input-box">
            <User size={18} className="field-icon" />
            <input
              id="reg-fullname"
              type="text"
              className="field-text-input"
              placeholder={currentRole.namePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Password Inputs (Side by Side on desktop) */}
        <div className="form-field-row">
          <div className="form-field-group">
            <label className="field-label" htmlFor="reg-pass">
              Account Password
            </label>
            <div className="field-input-box">
              <Lock size={18} className="field-icon" />
              <input
                id="reg-pass"
                type="password"
                className="field-text-input"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label" htmlFor="reg-pass-confirm">
              Confirm Password
            </label>
            <div className="field-input-box">
              <Lock size={18} className="field-icon" />
              <input
                id="reg-pass-confirm"
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

        {/* Recovery PIN Inputs (Side by Side on desktop) */}
        <div className="form-field-row">
          <div className="form-field-group">
            <label className="field-label" htmlFor="reg-recovery-pin">
              Recovery PIN
            </label>
            <div className="field-input-box">
              <Key size={18} className="field-icon" />
              <input
                id="reg-recovery-pin"
                type="password"
                className="field-text-input"
                placeholder="4–16 digit/char PIN"
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label" htmlFor="reg-recovery-confirm">
              Confirm Recovery PIN
            </label>
            <div className="field-input-box">
              <Key size={18} className="field-icon" />
              <input
                id="reg-recovery-confirm"
                type="password"
                className="field-text-input"
                placeholder="Re-enter PIN"
                value={confirmRecoveryPin}
                onChange={(e) => setConfirmRecoveryPin(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
        </div>
        <span className="field-helper-text">
          Security Note: Your recovery PIN enables instant password reset without third-party email dependency.
        </span>

        {/* Submit Action */}
        <button
          type="submit"
          className="auth-action-btn primary"
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading-state">
              <span className="mini-spinner"></span>
              <span>Generating Secure Clinical ID...</span>
            </span>
          ) : (
            <span className="btn-content-state">
              <span>Create Account & Generate ID</span>
              <ArrowRight size={17} />
            </span>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="auth-card-footer">
        <div className="footer-switch-prompt">
          <span>Already have an assigned User ID?</span>
          <button
            type="button"
            className="footer-switch-btn"
            onClick={() => onSwitchToLogin()}
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
