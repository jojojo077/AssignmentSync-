import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

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

  const login = useCallback((nextToken, nextUser) => {
    localStorage.setItem('ams_token', nextToken);
    if (nextUser) {
      localStorage.setItem('ams_user', JSON.stringify(nextUser));
    }
    setToken(nextToken);
    setUser(nextUser || null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ams_token');
    localStorage.removeItem('ams_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, isAuthenticated: Boolean(token), login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
