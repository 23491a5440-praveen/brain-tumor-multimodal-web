// Authentication API Client Service for NeuroScan AI (Restricted Access)

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

export function formatApiError(detail, defaultMsg = 'An unexpected error occurred. Please try again.') {
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  
  if (Array.isArray(detail)) {
    return detail.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const fieldName = Array.isArray(item.loc) && item.loc.length > 0 
          ? String(item.loc[item.loc.length - 1]).replace(/_/g, ' ') 
          : '';
        const msg = item.msg || 'Invalid value';
        return fieldName ? `${fieldName}: ${msg}` : msg;
      }
      return String(item);
    }).join('. ');
  }

  if (typeof detail === 'object') {
    try {
      return Object.entries(detail)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('. ');
    } catch {
      return defaultMsg;
    }
  }

  return String(detail);
}

async function parseApiResponse(response, defaultMsg) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Authentication service endpoint not found (HTTP 404). Please ensure the backend is active.');
    }
    if (response.status === 429) {
      throw new Error('Too many failed login attempts. Please wait 15 minutes before trying again.');
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error(`The backend server is temporarily waking up or restarting (HTTP ${response.status}). Please wait a moment and try again.`);
    }
    const rawDetail = data && data.detail !== undefined ? data.detail : (data && data.message !== undefined ? data.message : null);
    const message = formatApiError(rawDetail, defaultMsg);
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
  async login({ userId, password }) {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          password
        })
      });
      const data = await parseApiResponse(response, 'Invalid User ID or password. Access is restricted to authorized accounts.');
      const token = data.token || data.session_token;
      if (data && token && data.user) {
        this.saveSession(token, data.user);
      }
      return data;
    } catch (err) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      throw new Error('Unable to connect to NeuroScan AI server. Please check your network connection.');
    }
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
      // In case of offline/network glitch, fallback to cached user if valid
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
        // Ignore logout errors
      }
    }
    this.clearSession();
  }
};
