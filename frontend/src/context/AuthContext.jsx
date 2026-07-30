import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Verify session on mount with the backend
  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        if (res.data?.data) {
          setUser(res.data.data);
          setToken('cookie_managed'); // Just a flag indicating user have an active session
        }
      })
      .catch(err => {
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  const login = useCallback((tokenVal, userData) => {
    setToken('cookie_managed');
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout request failed', e);
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser, isAuth: !!token, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
