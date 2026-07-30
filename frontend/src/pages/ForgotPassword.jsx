import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Mail, Lock, Eye, EyeOff,
  ArrowLeft, ArrowRight, AlertCircle,
} from 'lucide-react';

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

/* Error banner */
function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs animate-fade-in"
      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#fca5a5' }}
    >
      <AlertCircle size={13} className="shrink-0 mt-0.5" />
      {msg}
    </div>
  );
}

/* Main */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0: Enter email, Step 1: Reset link sent, Step 2: Set new password (token in URL)
  const [step, setStep] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  useEffect(() => {
    if (token) {
      setStep(2);
    }
  }, [token]);

  /* Step 0: send Magic Link */
  const handleSendLink = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      let recaptchaToken = null;
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha('forgot_password');
      }

      await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
        recaptchaToken
      });
      setStep(1);
      toast.success('Password reset link sent.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send reset link. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* Step 2: reset password */
  const handleReset = async (e) => {
    e?.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Reset failed. Link may be invalid or expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 grid-bg relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="absolute pointer-events-none" style={{ top: '-20%', left: '-15%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-20%', right: '-15%', width: '45vw', height: '45vw', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[400px] animate-slide-up relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 overflow-hidden bg-transparent">
            <img src="/logo.png" alt="SMSGW Logo" className="w-full h-full object-cover scale-[1.3]" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {step === 0 && 'Reset your password'}
            {step === 1 && 'Check your email'}
            {step === 2 && 'Set new password'}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            {step === 0 && "We'll send a link to your email"}
            {step === 1 && `Click the link sent to ${email}`}
            {step === 2 && 'Choose a strong new password'}
          </p>
        </div>

        <div className="card p-5 sm:p-6 space-y-4">
          <ErrBanner msg={error} />

          {/* ── Step 0: Email ── */}
          {step === 0 && (
            <form onSubmit={handleSendLink} className="space-y-4" noValidate>
              <div>
                <label htmlFor="fp-email" className="label">Email address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="input pl-9"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm">
                {loading ? <><span className="spinner" />&nbsp;Sending…</> : <>Send Reset Link <ArrowRight size={14} /></>}
              </button>
            </form>
          )}

          {/* ── Step 1: Link Sent ── */}
          {step === 1 && (
            <div className="text-center py-4 space-y-6">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                We've sent a link to securely reset your password. The link will expire in 10 minutes.
              </p>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="btn-secondary py-2 px-4 text-sm"
              >
                Use a different email
              </button>
            </div>
          )}

          {/* ── Step 2: New password ── */}
          {step === 2 && (
            <form onSubmit={handleReset} className="space-y-4" noValidate>
              <div>
                <label htmlFor="fp-pw" className="label">New password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    id="fp-pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="input pl-9 pr-10"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="btn-icon w-6 h-6 absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="fp-confirm" className="label">Confirm password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    id="fp-confirm"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="input pl-9"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm">
                {loading ? <><span className="spinner" />&nbsp;Resetting…</> : <>Reset Password <ArrowRight size={14} /></>}
              </button>
            </form>
          )}
        </div>

        {step !== 1 && (
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft size={12} />
              Back to sign in
            </Link>
          </div>
        )}

        {/* reCAPTCHA TOS */}
        <div className="text-center mt-6 text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          This site is protected by reCAPTCHA and the Google <br />
          <a href="https://policies.google.com/privacy" className="underline hover:text-white" target="_blank" rel="noreferrer">Privacy Policy</a> and{' '}
          <a href="https://policies.google.com/terms" className="underline hover:text-white" target="_blank" rel="noreferrer">Terms of Service</a> apply.
        </div>
      </div>
    </div>
  );
}
