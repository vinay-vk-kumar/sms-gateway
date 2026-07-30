import { useEffect } from 'react';
import toast from 'react-hot-toast';

const OFFLINE_TOAST_ID = 'network-offline';

export default function NetworkStatus() {
  useEffect(() => {
    const handleOffline = () => {
      toast.error(
        "Network connection lost. Retrying...",
        {
          id: OFFLINE_TOAST_ID,
          duration: Infinity,
          style: {
            background: '#1f1f1f',
            color: '#ededed',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }
        }
      );
    };

    const handleOnline = () => {
      toast.dismiss(OFFLINE_TOAST_ID);
      toast.success('Network connection restored.', {
        duration: 3000,
        style: {
          borderRadius: '8px',
          background: '#050505',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // If the page loads while already offline (e.g. PWA)
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}
