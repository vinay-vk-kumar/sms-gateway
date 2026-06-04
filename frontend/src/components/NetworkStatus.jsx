import { useEffect } from 'react';
import toast from 'react-hot-toast';

const OFFLINE_TOAST_ID = 'network-offline';

export default function NetworkStatus() {
  useEffect(() => {
    const handleOffline = () => {
      toast.error(
        (t) => (
          <div className="flex items-start gap-2">
            <span style={{ fontSize: 15 }}>📡</span>
            <div>
              <p className="font-semibold text-xs">No internet connection</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }}>
                API calls will fail until you're back online.
              </p>
            </div>
          </div>
        ),
        {
          id: OFFLINE_TOAST_ID,
          duration: Infinity,   // stays until dismissed
          style: {
            background: '#1f1f1f',
            color: '#ededed',
            border: '1px solid rgba(239,68,68,0.35)',
            borderLeft: '3px solid #ef4444',
            borderRadius: '10px',
          },
        }
      );
    };

    const handleOnline = () => {
      toast.dismiss(OFFLINE_TOAST_ID);
      toast.success('Back online — connection restored', {
        id: 'network-online',
        duration: 4000,
        icon: '✅',
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
