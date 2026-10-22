import { useState } from 'react';
import LoginView from './LoginView';
import RegisterView from './RegisterView';
import ForgotPasswordView from './ForgotPasswordView';
import './Auth.css';

export default function AuthPortal({ onLoginSuccess }) {
  const [activeView, setActiveView] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [prefilledEmail, setPrefilledEmail] = useState('');

  const handleRegisterSuccess = (email) => {
    setPrefilledEmail(email);
    setActiveView('login');
  };

  const handleResetSuccess = () => {
    setActiveView('login');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {activeView === 'login' && (
          <LoginView
            initialEmail={prefilledEmail}
            onLoginSuccess={onLoginSuccess}
            onNavigate={(view) => setActiveView(view)}
          />
        )}

        {activeView === 'register' && (
          <RegisterView
            onRegisterSuccess={handleRegisterSuccess}
            onNavigate={(view) => setActiveView(view)}
          />
        )}

        {activeView === 'forgot-password' && (
          <ForgotPasswordView
            onResetSuccess={handleResetSuccess}
            onNavigate={(view) => setActiveView(view)}
          />
        )}
      </div>
    </div>
  );
}
