import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { MessageSquare, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

function FormInput({ id, label, type, value, onChange, placeholder, error, icon: Icon, right, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: error ? 'rgba(248,113,113,0.8)' : 'var(--text-muted)' }}
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`input ${Icon ? 'pl-9' : ''} ${right ? 'pr-10' : ''} ${error ? 'input-error' : ''}`}
        />
        {right && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: '#f87171' }}>
          <AlertCircle size={11} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>or</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  );
}

export default function Login() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login, isAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuth) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuth, navigate]);

  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (tab === 'register' && password.length < 8)
      e.password = 'At least 8 characters required';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, {
        email: email.trim().toLowerCase(),
        password,
      });
      login(data.data.token, { email: email.trim().toLowerCase(), apiKey: data.data.apiKey });
      toast.success(tab === 'login' ? 'Welcome back!' : 'Account created! 🎉');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Try again.';
      const status = err.response?.status;
      if (status === 401 || status === 400 || status === 409) {
        setErrors({ form: msg });
      } else if (status === 429) {
        setErrors({ form: 'Too many attempts — wait a moment before trying again.' });
      } else if (!err.response) {
        setErrors({ form: 'Cannot connect to server. Check your internet connection.' });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGLoading(true);
    try {
      const { data } = await api.post('/auth/google', {
        idToken: credentialResponse.credential,
      });
      login(data.data.token, { email: data.data.email, apiKey: data.data.apiKey });
      toast.success('Signed in with Google!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Google sign-in failed. Try again.';
      setErrors({ form: msg });
    } finally {
      setGLoading(false);
    }
  };

  const switchTab = (t) => { setTab(t); setErrors({}); };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 grid-bg relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background glow orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '-15%', width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-20%', right: '-15%', width: '45vw', height: '45vw',
          background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)',
        }}
      />

      <div className="w-full max-w-[380px] animate-slide-up relative z-10">

        {/* Logo & heading */}
        <div className="text-center mb-7">
          <div
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 0 32px rgba(99,102,241,0.38)' }}
          >
            <MessageSquare size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {tab === 'login' ? 'Sign in to SMS Gateway' : 'Create your account'}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            {tab === 'login'
              ? 'Enter your credentials to continue'
              : 'Start sending SMS via your Android device'
            }
          </p>
        </div>

        {/* Card */}
        <div className="card p-5 sm:p-6">
          {/* Tab switcher */}
          <div
            className="flex p-0.5 rounded-lg mb-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            {[{ id: 'login', label: 'Sign In' }, { id: 'register', label: 'Create Account' }].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                style={tab === id ? {
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-sm)',
                } : {
                  color: 'var(--text-muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Global form error */}
            {errors.form && (
              <div
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs animate-fade-in"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#fca5a5' }}
              >
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {errors.form}
              </div>
            )}

            <FormInput
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined, form: undefined })); }}
              placeholder="you@example.com"
              error={errors.email}
              icon={Mail}
              autoComplete="email"
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="label mb-0">Password</label>
                {tab === 'login' && (
                  <Link
                    to="/forgot-password"
                    className="text-xs transition-colors hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseOver={(e) => e.target.style.color = '#818cf8'}
                    onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: errors.password ? 'rgba(248,113,113,0.8)' : 'var(--text-muted)' }}
                />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined, form: undefined })); }}
                  placeholder={tab === 'register' ? 'Min. 8 characters' : '••••••••'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  className={`input pl-9 pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="btn-icon w-6 h-6"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: '#f87171' }}>
                  <AlertCircle size={11} className="shrink-0" /> {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || gLoading}
              className="btn-primary w-full py-2.5 mt-1 text-sm"
            >
              {loading ? (
                <><span className="spinner" />&nbsp;{tab === 'login' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                <>{tab === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          {googleEnabled && (
            <>
              <OrDivider />
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrors({ form: 'Google sign-in was cancelled or failed.' })}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  width="332"
                  text={tab === 'login' ? 'signin_with' : 'signup_with'}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer link */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          {tab === 'login' ? (
            <>Don't have an account?{' '}
              <button
                onClick={() => switchTab('register')}
                className="underline underline-offset-2 transition-colors hover:text-white"
                style={{ color: 'var(--text-secondary)' }}
              >
                Create one free
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button
                onClick={() => switchTab('login')}
                className="underline underline-offset-2 transition-colors hover:text-white"
                style={{ color: 'var(--text-secondary)' }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
