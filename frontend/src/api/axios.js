import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.DEV ? '/' : (import.meta.env.VITE_API_BASE_URL || '/');

const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthRoute = err.config.url.startsWith('/auth/login') ||
        err.config.url.startsWith('/auth/register') ||
        err.config.url === '/auth/me';

      if (isAuthRoute) {
        return Promise.reject(err);
      }

      toast.error('Session expired. Please sign in again.', {
        id: 'session-expired',
        duration: 5000,
      });

      setTimeout(() => window.location.replace('/login'), 1200);

      err._interceptorHandled = true;
    }

    return Promise.reject(err);
  }
);

export default api;
