/**
 * Usage:
 *   import { handleApiError } from '../api/errorHandler';
 *   try { ... } catch (err) { handleApiError(err, 'Could not load devices'); }
 */
import toast from 'react-hot-toast';

const ID = {
  network: 'err-network',
  rateLimit: 'err-rate-limit',
  server: 'err-server',
};

export function handleApiError(err, fallback = 'Something went wrong') {

  if (err?._interceptorHandled) return '';

  if (!err?.response) {
    const msg = 'Cannot reach the server — check your connection';
    toast.error(msg, {
      id: ID.network,
      duration: 7000,
      icon: '📡',
    });
    return msg;
  }

  const status = err.response.status;
  const body = err.response.data?.error;

  // ── 401 Unauthorized — handled by axios interceptor ──
  if (status === 401) return '';

  // ── 429 Too Many Requests ──
  if (status === 429) {
    const msg = 'Too many requests — please slow down and try again';
    toast.error(msg, {
      id: ID.rateLimit,
      duration: 8000,
      icon: '🚦',
    });
    return msg;
  }

  // ── 5xx Server Errors ──
  if (status >= 500) {
    const msg = status === 503
      ? 'Service temporarily unavailable — try again in a moment'
      : `Server error (${status}) — our team has been notified`;
    toast.error(msg, {
      id: ID.server,
      duration: 8000
    });
    return msg;
  }

  // ── 4xx Client Errors (400, 403, 404, 409 …) ──
  const msg = body || fallback;
  toast.error(msg, { duration: 5000 });
  return msg;
}

export function getErrorMessage(err, fallback = 'Something went wrong') {
  if (!err?.response) return 'Cannot connect to server. Check your internet.';
  const status = err.response.status;
  if (status === 429) return 'Too many attempts — please wait a moment.';
  if (status >= 500) return `Server error (${status}) — try again shortly.`;
  return err.response.data?.error || fallback;
}
