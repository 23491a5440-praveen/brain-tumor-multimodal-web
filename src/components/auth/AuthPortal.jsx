import { useState } from 'react';
import LoginView from './LoginView';
import RegisterView from './RegisterView';
import ForgotPasswordView from './ForgotPasswordView';
import './Auth.css';

export default function AuthPortal({ onLoginSuccess }) {
  const [activeView, setActiveView] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [prefilledUserId, setPrefilledUserId] = useState('');

  const handleRegisterSuccess = (userId) => {
    if (userId) {
      setPrefilledUserId(userId);
    }
  };

  const handleSwitchToLogin = (userId = '') => {
    if (userId) {
      setPrefilledUserId(userId);
    }
    setActiveView('login');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {activeView === 'login' && (
          <LoginView
            initialUserId={prefilledUserId}
            onSuccess={onLoginSuccess}
            onLoginSuccess={onLoginSuccess}
            onSwitchToRegister={() => setActiveView('register')}
            onSwitchToForgotPassword={() => setActiveView('forgot-password')}
            onNavigate={(view) => setActiveView(view)}
          />
        )}

        {activeView === 'register' && (
          <RegisterView
            onRegisteredSuccess={handleRegisterSuccess}
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={handleSwitchToLogin}
            onNavigate={(view) => setActiveView(view)}
          />
        )}

        {activeView === 'forgot-password' && (
          <ForgotPasswordView
            onSwitchToLogin={handleSwitchToLogin}
            onResetSuccess={() => setActiveView('login')}
            onNavigate={(view) => setActiveView(view)}
          />
        )}
      </div>
    </div>
  );
}
