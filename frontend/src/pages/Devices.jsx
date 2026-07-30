import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { handleApiError, getErrorMessage } from '../api/errorHandler';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import {
  Smartphone, Plus, Wifi, WifiOff, Trash2, Edit2,
  Copy, X, AlertTriangle, RefreshCw, Check,
  Clock, MessageSquare, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
      toast.error('Failed to copy to clipboard.');
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
  const [pairingToken, setPairingToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  useEffect(() => {
    let interval;
    let isMounted = true;
    const initPairing = async () => {
      try {
        const { data } = await api.post('/api/devices/pairing-session');
        if (!isMounted) return;

        setPairingToken(data.data.pairingToken);
        setLoading(false);

        // Start polling
        interval = setInterval(async () => {
          try {
            const res = await api.get(`/api/devices/pairing-status?token=${data.data.pairingToken}`);
            if (res.data.data.status === 'completed') {
              clearInterval(interval);
              if (isMounted) {
                toast.success('Device linked successfully.');
                onAdded();
              }
            }
          } catch (e) {
            // ignore temporary polling errors
          }
        }, 2000);
      } catch (err) {
        if (isMounted) {
          handleApiError(err, 'Failed to initialize pairing');
          onClose();
        }
      }
    };
    initPairing();
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onAdded, onClose]);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

  const qrPayload = pairingToken ? JSON.stringify({
    action: 'smsgw_pair',
    token: pairingToken,
    url: baseUrl
  }) : '';

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal animate-slide-up w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Smartphone size={14} style={{ color: '#818cf8' }} />
            </div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Link New Device
            </h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={15} /></button>
        </div>

        {/* Form */}
        <div className="p-6 flex flex-col items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <span className="spinner w-6 h-6 border-2" />
              <p className="text-xs text-zinc-400">Generating pairing code...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-6 text-center leading-relaxed">
                Open the SMS Gateway app on your Android device and tap <strong className="text-white">Scan QR</strong> to link it to your account.
              </p>

              <div className="p-3 bg-white rounded-xl shadow-lg mb-6">
                <QRCodeSVG value={qrPayload} size={200} level="M" />
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500 bg-white/5 px-4 py-2 rounded-full">
                <span className="spinner w-3 h-3 border-[1.5px]" />
                Waiting for device to scan...
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Rename Modal */
function RenameModal({ device, onClose, onRenamed }) {
  const [name, setName] = useState(device?.deviceName || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name === device.deviceName) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      await api.put(`/api/devices/${device._id}`, { deviceName: name.trim() });
      toast.success('Device renamed successfully.');
      onRenamed();
    } catch (err) {
      handleApiError(err, 'Failed to rename device');
    } finally {
      setLoading(false);
    }
  };

  if (!device) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative w-full max-w-md p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ zIndex: 10 }}>
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Edit2 size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Rename Device</h3>
            <p className="text-sm text-zinc-400">Update how this device appears in your dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Device Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input w-full"
              placeholder="e.g. My Primary Phone"
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || !name.trim() || name === device.deviceName} className="btn-primary flex-1">
              {loading ? <><span className="spinner" />&nbsp;Saving…</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Device Card */
function DeviceCard({ device, onDelete, onEdit }) {
  const online = true;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(device._id);
    setCopied(true);
    toast.success('Device ID copied to clipboard.', {
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
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5"
            >
              <Smartphone size={17} style={{ color: 'var(--text-primary)' }} strokeWidth={1.75} />
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
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Device ID:</span>
              <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }} title={device._id}>
                {String(device._id).slice(0, 20)}…
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(device)}
            className="btn-icon shrink-0"
            title="Rename device"
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Edit2 size={14} />
          </button>
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
      </div>

      <hr className="divider" />

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5" style={{ color: online ? '#4ade80' : 'var(--text-muted)' }}>
          <Wifi size={12} />
          Ready
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
  const [renameTarget, setRenameTarget] = useState(null);
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

  const handleEdit = (device) => {
    setRenameTarget(device);
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/devices/${delTarget.id}`);
      toast.success('Device removed successfully.');
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in w-full">

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
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {devices.map(d => (
            <DeviceCard
              key={d._id}
              device={d}
              onDelete={(id, name) => setDelTarget({ id, name })}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
      {renameTarget && <RenameModal device={renameTarget} onClose={() => setRenameTarget(null)} onRenamed={() => { setRenameTarget(null); load(); }} />}

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
