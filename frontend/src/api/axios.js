import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
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
      const hadToken = !!localStorage.getItem('sms_token');

      // Clear credentials
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');

      if (hadToken) {
        toast.error('Your session has expired — please sign in again', {
          id: 'session-expired',
          duration: 5000,
          icon: '🔒',
        });

        setTimeout(() => window.location.replace('/login'), 1200);
      }

      err._interceptorHandled = true;
    }

    return Promise.reject(err);
  }
);

export default api;
