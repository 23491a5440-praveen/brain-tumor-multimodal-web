// Authentication API Client Service for NeuroScan AI (User ID + Password + Recovery PIN)

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
      throw new Error('Authentication endpoint not found (HTTP 404). Please ensure the backend is active.');
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error(`The backend server is temporarily waking up (HTTP ${response.status}). Please try again shortly.`);
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
  async register({ role, fullName, organization, password, confirmPassword, recoveryPin, confirmRecoveryPin }) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        full_name: fullName,
        organization,
        password,
        confirm_password: confirmPassword,
        recovery_pin: recoveryPin,
        confirm_recovery_pin: confirmRecoveryPin
      })
    });
    return await parseApiResponse(response, 'Registration failed. Please check your information.');
  },

  async login({ userId, password }) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        password
      })
    });
    const data = await parseApiResponse(response, 'Invalid User ID or password.');
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

  async resetPassword({ userId, recoveryPin, newPassword, confirmPassword }) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        recovery_pin: recoveryPin,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    return await parseApiResponse(response, 'Failed to reset password. Please check your User ID and Recovery PIN.');
  }
};
