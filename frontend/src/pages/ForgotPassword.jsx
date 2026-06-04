import { useState, useRef, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  MessageSquare, Mail, Lock, Eye, EyeOff,
  ArrowLeft, ArrowRight, AlertCircle,
  CheckCircle, RefreshCw, Shield,
} from 'lucide-react';

/* Step indicator */
function Steps({ current }) {
  const steps = ['Email', 'OTP', 'New Password'];
  return (
    <div className="mb-6 w-full max-w-xs mx-auto">
      {/* Row 1: circles + connector lines — all in same flex row so lines are perfectly centred */}
      <div className="flex items-center justify-between px-4">
        {steps.map((_, i) => {
          const done = i < current;
          const act = i === current;
          return (
            <Fragment key={i}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0"
                style={{
                  background: done ? '#4ade80' : act ? '#6366f1' : 'var(--bg-elevated)',
                  border: `1.5px solid ${done ? '#4ade80' : act ? '#6366f1' : 'var(--border)'}`,
                  color: done || act ? '#fff' : 'var(--text-muted)',
                }}
              >
                {done ? <CheckCircle size={13} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px mx-2 transition-all duration-300"
                  style={{ background: done ? '#4ade80' : 'var(--border)' }} />
              )}
            </Fragment>
          );
        })}
      </div>
      {/* Row 2: labels — justify-between mirrors the circle positions */}
      <div className="flex justify-between px-1 mt-2">
        {steps.map((label, i) => {
          const done = i < current;
          const act = i === current;
          return (
            <span
              key={i}
              className="text-[10px] font-medium transition-colors"
              style={{ color: done ? '#4ade80' : act ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* OTP input: 6 individual boxes */
function OtpInput({ value, onChange, disabled }) {
  const refs = Array.from({ length: 6 }, () => useRef(null));

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) refs[i - 1].current?.focus();
      const arr = value.split('');
      arr[i] = '';
      onChange(arr.join(''));
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs[i - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs[i + 1].current?.focus();
    }
  };

  const handleChange = (i, e) => {
    let val = e.target.value.replace(/\D/g, '');
    
    // If multiple characters were pasted or autofilled (e.g. Android keyboard OTP)
    if (val.length > 1) {
      const pasted = val.slice(0, 6);
      onChange(pasted);
      if (pasted.length === 6) refs[5].current?.focus();
      else if (pasted.length > 0) refs[pasted.length - 1].current?.focus();
      return;
    }
    
    // Standard single character typing
    const ch = val;
    const arr = value.padEnd(6, '').split('');
    arr[i] = ch;
    onChange(arr.join('').trimEnd());
    if (ch && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    if (!pasteData) return;
    
    const pasted = pasteData.replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      if (pasted.length === 6) refs[5].current?.focus();
      else refs[pasted.length - 1].current?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-11 h-12 text-center text-lg font-bold rounded-lg border transition-all outline-none"
          style={{
            background: 'var(--bg-elevated)',
            border: `1.5px solid ${value[i] ? '#6366f1' : 'var(--border)'}`,
            color: 'var(--text-primary)',
            fontSize: '1.2rem',
          }}
          onFocus={(e) => e.target.style.borderColor = '#6366f1'}
          onBlur={(e) => e.target.style.borderColor = value[i] ? '#6366f1' : 'var(--border)'}
        />
      ))}
    </div>
  );
}

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
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCd, setResendCd] = useState(0);   // countdown seconds
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const navigate = useNavigate();

  /* Countdown for resend button */
  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setTimeout(() => setResendCd((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCd]);

  /* Step 1: send OTP */
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setAttemptsLeft(data.data?.attemptsLeft ?? null);
      setStep(1);
      setResendCd(60);
      toast.success('OTP sent — check your inbox');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send OTP. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* Step 2: verify OTP */
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) { setError('Enter the full 6-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp,
      });
      setResetToken(data.data.resetToken);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired OTP.';
      setError(msg);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  /* Step 3: reset password */
  const handleReset = async (e) => {
    e?.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, password });
      toast.success('Password reset! Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Reset failed. Please start over.';
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
      {/* Glow orbs */}
      <div className="absolute pointer-events-none" style={{ top: '-20%', left: '-15%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-20%', right: '-15%', width: '45vw', height: '45vw', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[400px] animate-slide-up relative z-10">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 0 32px rgba(99,102,241,0.38)' }}>
            <MessageSquare size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {step === 0 && 'Reset your password'}
            {step === 1 && 'Check your email'}
            {step === 2 && 'Set new password'}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            {step === 0 && "We'll send a 6-digit code to your email"}
            {step === 1 && `Enter the code sent to ${email}`}
            {step === 2 && 'Choose a strong new password'}
          </p>
        </div>

        {/* Card */}
        <div className="card p-5 sm:p-6 space-y-4">
          <Steps current={step} />

          <ErrBanner msg={error} />

          {/* ── Step 0: Email ── */}
          {step === 0 && (
            <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
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
                {loading ? <><span className="spinner" />&nbsp;Sending…</> : <>Send OTP <ArrowRight size={14} /></>}
              </button>
            </form>
          )}

          {/* ── Step 1: OTP ── */}
          {step === 1 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
              <div className="space-y-3">
                <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(''); }} disabled={loading} />
                {attemptsLeft !== null && (
                  <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Shield size={11} className="inline mr-1" />
                    {attemptsLeft} OTP request{attemptsLeft !== 1 ? 's' : ''} remaining today
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {loading ? <><span className="spinner" />&nbsp;Verifying…</> : <>Verify OTP <ArrowRight size={14} /></>}
              </button>

              {/* Resend */}
              <div className="text-center">
                <button
                  type="button"
                  disabled={resendCd > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-xs inline-flex items-center gap-1.5 transition-colors"
                  style={{ color: resendCd > 0 ? 'var(--text-muted)' : '#818cf8' }}
                >
                  <RefreshCw size={11} />
                  {resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
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

        {/* Back to login */}
        <div className="text-center mt-5">
          <Link
            to="/login"
            className="text-xs inline-flex items-center gap-1.5 transition-colors hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={12} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
