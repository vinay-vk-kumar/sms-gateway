import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sms_user') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => {
    const legacyToken = localStorage.getItem('sms_token');
    return legacyToken || (localStorage.getItem('sms_user') ? 'cookie_managed' : null);
  });

  const login = useCallback((tokenVal, userData) => {
    // tokenVal is ignored as it's set in an HttpOnly cookie, but we keep it in args for backwards compatibility.
    localStorage.setItem('sms_user', JSON.stringify(userData));
    setToken('cookie_managed'); // Just a flag to say we are authenticated
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(import.meta.env.VITE_API_BASE_URL + '/auth/logout', {
        method: 'POST',
        credentials: 'true'
      });
    } catch (e) {
      console.error('Logout request failed', e);
    }
    localStorage.removeItem('sms_token'); // Clean up old token if it exists
    localStorage.removeItem('sms_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('sms_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
