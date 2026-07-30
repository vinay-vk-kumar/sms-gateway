import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { handleApiError } from '../api/errorHandler';
import toast from 'react-hot-toast';
import { RefreshCw, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const { user, login, updateUser, isAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuth && user?.isVerified) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuth, user, navigate]);

  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  const [email, setEmail] = useState(location.state?.email || user?.email || '');

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(email);
  const [savingEmail, setSavingEmail] = useState(false);

  const verificationAttempted = useRef(false);

  useEffect(() => {
    if (!token && !email) {
      navigate('/login', { replace: true });
      return;
    }

    if (token && !verificationAttempted.current) {
      verificationAttempted.current = true;
      verifyToken(token);
    }
  }, [token, email, navigate]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Magic Polling: Check if the email was verified on another device
  useEffect(() => {
    if (token || !email || editingEmail) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await api.get(`/auth/check-verification?email=${encodeURIComponent(email)}`);
        if (data?.data?.isVerified) {
          clearInterval(pollInterval);
          toast.success('Email verified successfully! Please sign in to continue.', { duration: 5000 });
          navigate('/login', { replace: true });
        }
      } catch (err) {
        // Silent catch for polling
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [token, email, editingEmail, navigate]);

  const verifyToken = async (t) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { token: t });
      toast.success('Email verified successfully.');

      login(data.data.token, {
        email: data.data.email,
        apiKey: data.data.apiKey,
        isVerified: true
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      handleApiError(err, 'Verification failed. Link may be expired.');
      navigate('/verify-email', { state: { email }, replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('Verification link sent.');
      setCooldown(60);
    } catch (err) {
      handleApiError(err, 'Failed to resend link');
    } finally {
      setResending(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return setEditingEmail(false);
    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      toast.error('Invalid email address.');
      return;
    }

    setSavingEmail(true);
    try {
      const { data } = await api.post('/auth/change-email', { email, newEmail });
      setEmail(data.data.newEmail);
      if (user) updateUser({ email: data.data.newEmail });
      toast.success(data.data.message);
      setEditingEmail(false);
      setCooldown(60);
    } catch (err) {
      handleApiError(err, 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] animate-slide-up relative z-10"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 overflow-hidden bg-transparent">
            <img src="/logo.png" alt="SMSGW Logo" className="w-full h-full object-cover scale-[1.3]" />
          </div>

          <h1 className="text-lg sm:text-xl font-bold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {token ? 'Verifying email...' : editingEmail ? 'Change your email' : 'Check your email'}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            {!token && !editingEmail && `We've sent a link to ${email}`}
            {editingEmail && 'Enter your new email address below'}
          </p>
        </div>

        <div className="card p-5 sm:p-6 space-y-4 text-center">
          {token ? (
            <div className="py-8 flex flex-col items-center">
              <span className="spinner w-8 h-8 border-4 mb-4" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text-primary)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Validating your link...</p>
            </div>
          ) : editingEmail ? (
            <form onSubmit={handleEmailChange} className="space-y-4 text-left" noValidate>
              <div>
                <label htmlFor="new-email" className="label">New Email address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    className="input pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingEmail(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={savingEmail} className="btn-primary flex-1 py-2.5 text-sm">
                  {savingEmail ? <><span className="spinner" />&nbsp;Saving…</> : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div className="py-2 space-y-6">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Click the link in your email to securely log in. The link will expire in 10 minutes.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setEditingEmail(true); setNewEmail(email); }}
                  className="btn-secondary w-full py-2.5 text-sm"
                >
                  Use a different email
                </button>

                <div className="pt-5 mt-2 border-t flex flex-col items-center" style={{ borderColor: 'var(--border)' }}>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-3">Didn't receive the email?</p>
                  <button
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                    className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-sm"
                  >
                    {resending ? <span className="spinner w-3 h-3 border-2" /> : <RefreshCw size={14} />}
                    {resending ? 'Sending...' : cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend Link'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 text-xs hover:text-white transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={12} />
            Back to sign in
          </button>
        </div>
      </motion.div>
    </div>
  );
}
