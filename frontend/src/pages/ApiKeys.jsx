import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { handleApiError } from '../api/errorHandler';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import {
  KeyRound, Eye, EyeOff, Copy, RefreshCw,
  Terminal, Code2, Check, AlertTriangle,
  Shield, Zap,
} from 'lucide-react';

/* Copy button */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };
  return (
    <button onClick={handle} className="btn-icon shrink-0" title={copied ? 'Copied!' : 'Copy'}>
      {copied ? <Check size={14} style={{ color: '#4ade80' }} /> : <Copy size={14} />}
    </button>
  );
}

/* Code Block */
function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };
  return (
    <div className="relative group">
      <pre className="code-block p-4 sm:p-5 overflow-x-auto text-[11px] sm:text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handle}
        className="absolute top-3 right-3 btn-icon opacity-100 group-hover:opacity-100 transition-opacity"
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? <Check size={13} style={{ color: '#4ade80' }} /> : <Copy size={13} />}
      </button>
      <span
        className="absolute bottom-2.5 right-3 text-[10px] font-mono opacity-25 select-none"
        style={{ color: 'var(--text-muted)' }}
      >
        {lang}
      </span>
    </div>
  );
}

const makeSnippets = (baseUrl) => ({
  curl: `curl -X POST ${baseUrl}/api/sms/queue \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+91XXXXXXXXXX",
    "message": "Your OTP is 123456",
    "deviceId": "YOUR_DEVICE_ID",
    "type": "otp"
  }'`,

  powershell: `Invoke-RestMethod -Method POST \`
  -Uri "${baseUrl}/api/sms/queue" \`
  -Headers @{ "x-api-key" = "YOUR_API_KEY"; "Content-Type" = "application/json" } \`
  -Body '{"to":"+91XXXXXXXXXX","message":"Your OTP is 123456","deviceId":"YOUR_DEVICE_ID","type":"otp"}'`,

  cmd: `curl.exe -X POST ${baseUrl}/api/sms/queue ^
  -H "x-api-key: YOUR_API_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\\"to\\":\\"+91XXXXXXXXXX\\",\\"message\\":\\"Your OTP is 123456\\",\\"deviceId\\":\\"YOUR_DEVICE_ID\\",\\"type\\":\\"otp\\"}"`,

  node: `import axios from 'axios';

async function sendSms() {
  try {
    const response = await axios.post('${baseUrl}/api/sms/queue', {
      to: '+91XXXXXXXXXX',
      message: 'Your OTP is 123456',
      deviceId: 'YOUR_DEVICE_ID',
      webhookUrl: 'https://your-server.com/sms/callback'
    }, {
      headers: {
        'x-api-key': 'YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

sendSms();`,

  python: `import requests

url = "${baseUrl}/api/sms/queue"
payload = {
    "to": "+91XXXXXXXXXX",
    "message": "Your OTP is 123456",
    "deviceId": "YOUR_DEVICE_ID",
    "webhookUrl": "https://your-server.com/sms/callback"
}
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
});

const TABS = [
  { id: 'curl', label: 'cURL (Linux/Mac)', icon: Terminal },
  { id: 'powershell', label: 'PowerShell', icon: Terminal },
  { id: 'cmd', label: 'CMD', icon: Terminal },
  { id: 'node', label: 'Node.js', icon: Code2 },
  { id: 'python', label: 'Python', icon: Code2 },
];

const LIMITS = [
  { v: '30', p: 'per minute', s: 'Per user', color: '#818cf8' },
  { v: '1000', p: 'per day', s: 'Per user', color: '#4ade80' },
  { v: '100', p: 'per hour', s: 'Per number', color: '#fbbf24' },
]

export default function ApiKeys() {
  const { user, updateUser } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [rTimer, setRTimer] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [tab, setTab] = useState('curl');

  const apiKey = user?.apiKey || '';
  const maskedKey = apiKey ? `${apiKey.slice(0, 10)}${'•'.repeat(22)}${apiKey.slice(-6)}` : '—';

  const reveal = () => {
    setRevealed(true);
    clearTimeout(rTimer);
    let s = 10;
    setCountdown(s);
    const id = setInterval(() => {
      s -= 1;
      setCountdown(s);
      if (s <= 0) { clearInterval(id); setRevealed(false); setCountdown(null); }
    }, 1000);
    setRTimer(setTimeout(() => { clearInterval(id); setRevealed(false); setCountdown(null); }, 10_100));
  };

  const hide = () => {
    clearTimeout(rTimer);
    setRevealed(false);
    setCountdown(null);
  };

  const regen = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/regenerate-api-key');
      updateUser({ apiKey: data.data.apiKey });
      toast.success('API key generated successfully. Previous key revoked.');
      hide();
      setShowConf(false);
    } catch (err) {
      handleApiError(err, 'Failed to rotate API key');
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);
  const snippets = makeSnippets(baseUrl);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in w-full">

      {/* Header */}
      <div>
        <h1 className="page-title">API Keys</h1>
        <p className="page-subtitle">Authenticate your application with the SMS Gateway API</p>
      </div>

      {/* Key card */}
      <div className="card p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <KeyRound size={15} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Production API Key</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Send as x-api-key header</p>
          </div>
        </div>

        {/* Key row */}
        <div className="flex items-center gap-2">
          <div
            className="input flex-1 py-2.5 font-mono text-xs sm:text-sm truncate"
            style={{
              color: revealed ? '#a5f3fc' : 'var(--text-muted)',
              letterSpacing: revealed ? 'normal' : '0.08em',
              userSelect: 'all',
              cursor: 'text',
            }}
            title={revealed ? apiKey : 'Click the eye icon to reveal your key'}
          >
            {revealed ? apiKey : maskedKey}
          </div>
          <button onClick={revealed ? hide : reveal} className="btn-icon shrink-0" title={revealed ? 'Hide key' : 'Reveal for 10s'}>
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <CopyBtn text={apiKey} />
        </div>

        {revealed && countdown !== null && (
          <div
            className="flex items-start sm:items-center gap-2 px-3 py-2.5 rounded-lg text-xs animate-fade-in leading-relaxed"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)', color: '#fcd34d' }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-[2px] sm:mt-0" />
            <span>Key visible for <strong>{countdown}s</strong> — don't share or screenshot this value.</span>
          </div>
        )}

        <hr className="divider" />

        {/* Rotate row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Rotate key</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Immediately invalidates current key</p>
          </div>
          <button onClick={() => setShowConf(true)} className="btn-secondary text-xs gap-1.5">
            <RefreshCw size={12} /> Rotate Key
          </button>
        </div>
      </div>

      {/* Rate limits */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={13} style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Rate Limits</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {LIMITS.map(({ v, p, s, color }) => (
            <div
              key={p}
              className="rounded-xl p-3 sm:p-4 text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-xl sm:text-2xl font-bold" style={{ color }}>{v}</p>
              <p className="text-[10px] sm:text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{p}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Need higher limits? Contact us at <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@yourdomain.com'}`} className="text-white hover:underline transition-all">{import.meta.env.VITE_SUPPORT_EMAIL || 'support@yourdomain.com'}</a> to request a limit increase.
        </p>
      </div>

      {/* Code snippets */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Integration Examples</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Copy and paste into your backend application</p>
        </div>

        {/* Language tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 overflow-x-auto overflow-y-hidden whitespace-nowrap pb-2 scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0"
                style={active
                  ? { background: '#111111', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }
                  : { color: 'var(--text-muted)' }
                }
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Icon size={11} /> {label}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6 pt-3">
          <CodeBlock code={snippets[tab]} lang={tab} />
        </div>

        {/* Tip */}
        <div className="px-4 sm:px-6 pb-5 space-y-3">
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
          >
            <Zap size={11} className="shrink-0 mt-0.5" />
            <p>
              Replace <code className="font-mono text-[11px] text-white">&lt;your-device-id&gt;</code> with a Device ID from the Devices page.
            </p>
          </div>
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
          >
            <Shield size={11} className="shrink-0 mt-0.5" />
            <p>
              Need help? Check out our <Link to="/docs" className="text-white hover:underline transition-colors">Documentation</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={showConf}
        onClose={() => setShowConf(false)}
        onConfirm={regen}
        loading={loading}
        title="Rotate API Key?"
        description="Your current API key will be immediately invalidated. Any application or integration using the old key will stop working until updated with the new key."
        confirmLabel="Yes, Rotate"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
