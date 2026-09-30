import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

/**
 * Holds the signed-in user's JWT and profile. Both are persisted to
 * localStorage (ams_token / ams_user) so a session survives a page reload;
 * services/api.js reads the same token to authorise requests.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ams_token'));
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ams_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Store a new session after a successful login/register.
  const login = useCallback((nextToken, nextUser) => {
    localStorage.setItem('ams_token', nextToken);
    if (nextUser) {
      localStorage.setItem('ams_user', JSON.stringify(nextUser));
    }
    setToken(nextToken);
    setUser(nextUser || null);
  }, []);

  // Clear the session and any per-user cached data.
  const logout = useCallback(() => {
    localStorage.removeItem('ams_token');
    localStorage.removeItem('ams_user');
    // Offline calendar cache belongs to this user - don't leave it for the next one.
    localStorage.removeItem('ams_custom_events');
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, isAuthenticated: Boolean(token), login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Access the auth context. Throws if used outside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
