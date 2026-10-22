// Authentication API Client Service for NeuroScan AI

export function getApiBaseUrl() {
  const rawApiUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:8000'
        : 'https://brain-tumor-backend-6kvr.onrender.com'
    );
  return String(rawApiUrl).replace(/\/+$/, '');
}

const TOKEN_KEY = 'neuroscan_auth_token';
const USER_KEY = 'neuroscan_auth_user';

export const authService = {
  // Session storage helpers
  saveSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Storage unavailable or quota exceeded
    }
  },

  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getCachedUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Storage unavailable
    }
  },

  // API Calls
  async register({ role, email, password, confirmPassword, fullName, organization }) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        email,
        password,
        confirm_password: confirmPassword,
        full_name: fullName,
        organization
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed. Please check your information.');
    }
    return data;
  },

  async login({ email, password }) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Invalid email or password.');
    }

    if (data.token && data.user) {
      this.saveSession(data.token, data.user);
    }
    return data;
  },

  async getMe() {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        this.clearSession();
        return null;
      }

      const data = await response.json();
      if (data && data.user) {
        this.saveSession(token, data.user);
        return data.user;
      }
      return null;
    } catch {
      // In case of network error, return cached user if present
      return this.getCachedUser();
    }
  },

  async logout() {
    const token = this.getToken();
    const baseUrl = getApiBaseUrl();

    if (token) {
      try {
        await fetch(`${baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch {
        // Logout network error ignored
      }
    }
    this.clearSession();
  },

  async requestPasswordResetOtp(email) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/forgot-password/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Unable to request verification code. Please try again.');
    }
    return data;
  },

  async verifyPasswordResetOtp(email, otp) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Invalid verification code.');
    }
    return data;
  },

  async resetPassword({ email, resetToken, newPassword, confirmPassword }) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/forgot-password/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update password.');
    }
    return data;
  }
};
