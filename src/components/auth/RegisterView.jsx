import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Building2, Activity, GraduationCap, Microscope, ArrowRight, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';

const ROLE_CONFIGS = {
  hospital: {
    id: 'hospital',
    label: 'Hospital',
    icon: Building2,
    orgLabel: 'Hospital / Health System Name',
    orgPlaceholder: 'e.g. Mayo Clinic or Johns Hopkins Hospital',
    nameLabel: "Authorized Physician / User's Name",
    namePlaceholder: 'e.g. Dr. Jane Reynolds, Chief Radiologist',
    emailLabel: 'Work Email Address',
    emailPlaceholder: 'e.g. j.reynolds@hospital.org'
  },
  clinic: {
    id: 'clinic',
    label: 'Clinic / Diagnostic Centre',
    icon: Activity,
    orgLabel: 'Clinic or Diagnostic Centre Name',
    orgPlaceholder: 'e.g. Apex Neuro Imaging Diagnostic Centre',
    nameLabel: 'Radiologist / Authorized Contact Name',
    namePlaceholder: 'e.g. Dr. Marcus Vance, Diagnostic Radiologist',
    emailLabel: 'Clinic / Work Email Address',
    emailPlaceholder: 'e.g. diagnostics@apexneuro.com'
  },
  student: {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    orgLabel: 'College or University Name',
    orgPlaceholder: 'e.g. Stanford University or MIT',
    nameLabel: "Student's Full Name",
    namePlaceholder: 'e.g. Alex Mercer',
    emailLabel: 'Student Email Address',
    emailPlaceholder: 'e.g. alex.mercer@stanford.edu'
  },
  researcher: {
    id: 'researcher',
    label: 'Researcher',
    icon: Microscope,
    orgLabel: 'Research Institution / Laboratory Name',
    orgPlaceholder: 'e.g. Broad Institute or Neuro AI Lab',
    nameLabel: 'Researcher / Principal Investigator Name',
    namePlaceholder: 'e.g. Dr. Aris Thorne, Lead AI Investigator',
    emailLabel: 'Institutional / Academic Email',
    emailPlaceholder: 'e.g. a.thorne@broadinstitute.org'
  }
};

export default function RegisterView({ onRegisterSuccess, onNavigate }) {
  const [role, setRole] = useState('hospital'); // 'hospital' | 'clinic' | 'student' | 'researcher'
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentRoleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.hospital;

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Field Validations
    if (!fullName.trim()) {
      setErrorMsg(`Please provide the ${currentRoleConfig.nameLabel.toLowerCase()}.`);
      return;
    }

    if (!organization.trim()) {
      setErrorMsg(`Please provide your ${currentRoleConfig.orgLabel.toLowerCase()}.`);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long and contain both letters and digits.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.register({
        role,
        email: email.trim(),
        password,
        confirmPassword,
        fullName: fullName.trim(),
        organization: organization.trim()
      });

      setSuccessMsg(data.message || 'Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        onRegisterSuccess(email.trim());
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create account. Please check your information.');
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
          Create <span className="title-gradient">NeuroScan AI</span> Account
        </h2>
        <p className="auth-subtitle">
          Select your institutional or professional role to register for clinical neuroimaging access
        </p>
      </div>

      {/* 4-Role Selection Grid */}
      <div className="role-selector-container">
        <span className="role-selector-label">Select Your Role</span>
        <div className="role-tabs role-tabs-four">
          {Object.values(ROLE_CONFIGS).map((cfg) => {
            const IconComponent = cfg.icon;
            const isActive = role === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                className={`role-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleRoleChange(cfg.id)}
              >
                <IconComponent size={16} />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
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
          <label className="form-label" htmlFor="reg-org">
            {currentRoleConfig.orgLabel}
          </label>
          <div className="input-wrapper">
            <Building2 size={18} className="input-icon-left" />
            <input
              id="reg-org"
              type="text"
              className="auth-input"
              placeholder={currentRoleConfig.orgPlaceholder}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-fullname">
            {currentRoleConfig.nameLabel}
          </label>
          <div className="input-wrapper">
            <User size={18} className="input-icon-left" />
            <input
              id="reg-fullname"
              type="text"
              className="auth-input"
              placeholder={currentRoleConfig.namePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">
            {currentRoleConfig.emailLabel}
          </label>
          <div className="input-wrapper">
            <Mail size={18} className="input-icon-left" />
            <input
              id="reg-email"
              type="email"
              className="auth-input"
              placeholder={currentRoleConfig.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">
            <span>Password</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>min 8 chars, 1 letter, 1 digit</span>
          </label>
          <div className="input-wrapper">
            <Lock size={18} className="input-icon-left" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Create a secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="new-password"
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
          <label className="form-label" htmlFor="reg-confirm-password">
            Confirm Password
          </label>
          <div className="input-wrapper">
            <Lock size={18} className="input-icon-left" />
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="new-password"
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
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <div>
          Already have an account?{' '}
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
