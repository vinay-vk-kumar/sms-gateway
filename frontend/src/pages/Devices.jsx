import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { handleApiError, getErrorMessage } from '../api/errorHandler';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import {
  Smartphone, Plus, Wifi, WifiOff, Trash2,
  Copy, X, AlertTriangle, RefreshCw, Check,
  Clock, MessageSquare, ShieldCheck, AlertCircle,
} from 'lucide-react';

/* Relative time */
const relativeTime = (date) => {
  if (!date) return 'Never';
  const d = Date.now() - new Date(date).getTime();
  if (d < 60_000) return 'Just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
};

/* Skeleton */
function Sk({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

/* Copy Button */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed — please select manually');
    }
  };
  return (
    <button onClick={handle} className="btn-icon shrink-0" title={copied ? 'Copied!' : 'Copy'}>
      {copied ? <Check size={13} style={{ color: '#4ade80' }} /> : <Copy size={13} />}
    </button>
  );
}

/* Credential Row */
function CredRow({ label, value, icon: Icon, color }) {
  return (
    <div>
      <label className="label flex items-center gap-1">
        <Icon size={10} style={{ color }} /> {label}
      </label>
      <div className="flex items-center gap-2">
        <div
          className="input flex-1 py-2.5 font-mono text-xs truncate"
          title={value}
          style={{ color, userSelect: 'all' }}
        >
          {value}
        </div>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

/* Add Device Modal */
function AddDeviceModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState(null);
  const [devId, setDevId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (secret) return;
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [secret, onClose]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Device name is required';
    if (!token.trim()) e.token = 'FCM token is required';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/api/devices/register', { fcmToken: token.trim(), deviceName: name.trim() });
      setSecret(data.data.deviceSecret);
      setDevId(data.data.deviceId);
      onAdded();
      toast.success('Device registered!');
    } catch (err) {
      const msg = getErrorMessage(err, 'Registration failed');
      if (err.response?.status === 400 || err.response?.status === 409) {
        setErrors({ form: msg });
      } else {
        handleApiError(err, 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !secret) onClose(); }}>
      <div className="modal animate-slide-up w-full">

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={secret
                ? { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }
                : { background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }
              }
            >
              {secret
                ? <AlertTriangle size={14} style={{ color: '#fbbf24' }} />
                : <Smartphone size={14} style={{ color: '#818cf8' }} />
              }
            </div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {secret ? 'Save Your Credentials' : 'Register New Device'}
            </h2>
          </div>
          {!secret && (
            <button onClick={onClose} className="btn-icon"><X size={15} /></button>
          )}
        </div>

        {/* Form */}
        {!secret && (
          <form onSubmit={submit} className="p-5 space-y-4">
            {errors.form && (
              <div
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#fca5a5' }}
              >
                <AlertCircle size={12} className="shrink-0 mt-0.5" />{errors.form}
              </div>
            )}

            <div>
              <label className="label">Device Name</label>
              <input
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="My Device"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                autoFocus
              />
              {errors.name && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.name}</p>}
            </div>

            <div>
              <label className="label">
                FCM Token
                <span className="label-hint ml-1.5">(Android app → Settings → Copy token)</span>
              </label>
              <textarea
                className={`input resize-none h-24 font-mono text-xs leading-relaxed ${errors.token ? 'input-error' : ''}`}
                placeholder="Paste your FCM registration token here…"
                value={token}
                onChange={(e) => { setToken(e.target.value); setErrors((p) => ({ ...p, token: undefined })); }}
              />
              {errors.token && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.token}</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm">
                {loading ? <><span className="spinner" />&nbsp;Registering…</> : 'Register Device'}
              </button>
            </div>
          </form>
        )}

        {/* One-time secret display */}
        {secret && (
          <div className="p-5 space-y-4">
            <div
              className="flex items-start gap-2.5 p-3.5 rounded-lg text-xs"
              style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', color: '#fcd34d' }}
            >
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <p>
                <strong>Shown only once.</strong> Copy and paste both values into your Android app Settings screen. This dialog cannot be reopened.
              </p>
            </div>

            <CredRow label="Device ID" value={devId} icon={ShieldCheck} color="#818cf8" />
            <CredRow label="Device Secret" value={secret} icon={ShieldCheck} color="#4ade80" />

            <button onClick={onClose} className="btn-primary w-full text-sm">
              <Check size={14} /> I've saved both — Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Device Card */
function DeviceCard({ device, onDelete }) {
  const online = device.isOnline;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(device._id);
    setCopied(true);
    toast.success('Device ID copied to clipboard!', {
      icon: '📋',
      style: { borderRadius: '10px', background: '#333', color: '#fff' }
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-200 group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: online ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${online ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
              }}
            >
              <Smartphone size={17} style={{ color: online ? '#4ade80' : 'var(--text-muted)' }} strokeWidth={1.75} />
            </div>
            {online && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: 'var(--bg-card)', background: 'var(--bg-card)' }}
              >
                <span className="online-dot" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{device.deviceName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }} title={device._id}>
                {String(device._id).slice(0, 16)}…
              </p>
              <button
                onClick={handleCopy}
                className="opacity-90 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-white/10 active:scale-95"
                style={{ color: copied ? '#4ade80' : 'var(--text-muted)' }}
                title="Copy Device ID"
              >
                {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(device._id, device.deviceName)}
          className="btn-icon shrink-0"
          title="Remove device"
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <hr className="divider" />

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5" style={{ color: online ? '#4ade80' : 'var(--text-muted)' }}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? 'Online' : 'Offline'}
        </span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <Clock size={11} /> {relativeTime(device.lastSeenAt)}
        </span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <MessageSquare size={11} />
          <strong style={{ color: 'var(--text-primary)' }}>{device.smsSentCount ?? 0}</strong>&nbsp;sent
        </span>
      </div>
    </div>
  );
}

/* Device Skeleton */
function DeviceSk() {
  return (
    <div className="card p-4 sm:p-5 space-y-3.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Sk className="w-10 h-10 rounded-xl" />
          <div className="space-y-2"><Sk className="h-3.5 w-28" /><Sk className="h-3 w-36" /></div>
        </div>
        <Sk className="w-8 h-8 rounded-lg" />
      </div>
      <hr className="divider" />
      <div className="flex justify-between"><Sk className="h-3 w-14" /><Sk className="h-3 w-16" /><Sk className="h-3 w-12" /></div>
    </div>
  );
}

/* Main page  */
export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/api/devices');
      setDevices(data.data.devices || []);
    } catch (err) {
      setError(true);
      handleApiError(err, 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/devices/${delTarget.id}`);
      toast.success(`"${delTarget.name}" removed`);
      setDevices((prev) => prev.filter((d) => d._id !== delTarget.id));
      setDelTarget(null);
    } catch (err) {
      handleApiError(err, 'Failed to remove device');
    } finally {
      setDeleting(false);
    }
  };

  const online = devices.filter((d) => d.isOnline).length;
  const offline = devices.length - online;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1200px] animate-fade-in">

      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">Manage your connected Android phones</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-icon" disabled={loading} title="Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            <Plus size={14} strokeWidth={2.5} />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && !error && devices.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap animate-fade-in">
          <span className="chip">
            <span className="online-dot" />
            {online} online
          </span>
          {offline > 0 && (
            <span className="chip" style={{ color: 'var(--text-muted)' }}>{offline} offline</span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} total
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-5 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)' }}>
          <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>Failed to load devices</p>
          </div>
          <button onClick={load} className="btn-secondary text-xs"><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {/* Skeletons */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array(3).fill(0).map((_, i) => <DeviceSk key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && devices.length === 0 && (
        <div className="card p-10 sm:p-16 flex flex-col items-center text-center gap-4">
          <div className="empty-icon-wrap">
            <Smartphone size={24} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No devices registered</p>
            <p className="text-sm mt-1.5 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Add your Android phone to start delivering SMS through your SIM card.
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm mt-1">
            <Plus size={14} /> Add First Device
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && devices.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => (
            <DeviceCard key={d._id} device={d} onDelete={(id, name) => setDelTarget({ id, name })} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onAdded={load} />}

      <ConfirmModal
        isOpen={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Remove "${delTarget?.name}"?`}
        description="This device will be deactivated immediately. Any pending messages assigned to it will not be delivered. You can re-register it later."
        confirmLabel="Remove Device"
        cancelLabel="Keep Device"
        variant="danger"
      />
    </div>
  );
}
