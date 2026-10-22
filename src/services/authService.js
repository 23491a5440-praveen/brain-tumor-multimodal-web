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

async function parseApiResponse(response, defaultMsg) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Authentication service endpoint not found (HTTP 404). The backend server may still be deploying.');
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error(`The backend server is temporarily unavailable or restarting (HTTP ${response.status}). Please try again shortly.`);
    }
    const message = data && data.detail ? data.detail : defaultMsg;
    throw new Error(message);
  }

  return data;
}

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
    return await parseApiResponse(response, 'Registration failed. Please check your information.');
  },

  async login({ email, password }) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await parseApiResponse(response, 'Invalid email or password.');
    if (data && data.token && data.user) {
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
    return await parseApiResponse(response, 'Unable to request verification code. Please try again.');
  },

  async verifyPasswordResetOtp(email, otp) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    return await parseApiResponse(response, 'Invalid verification code.');
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
    return await parseApiResponse(response, 'Failed to update password.');
  }
};

