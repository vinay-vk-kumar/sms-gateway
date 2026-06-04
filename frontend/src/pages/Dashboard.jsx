
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { handleApiError } from '../api/errorHandler';
import StatusBadge from '../components/StatusBadge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  MessageSquare, Send, AlertCircle, TrendingUp,
  RefreshCw, ArrowRight, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

function Sk({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

function StatCard({ icon: Icon, label, value, sub, accent, loading }) {
  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}
        >
          <Icon size={15} style={{ color: accent }} strokeWidth={2} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div>
        {loading
          ? <><Sk className="h-8 w-20 mb-1" /><Sk className="h-3 w-16 mt-2" /></>
          : <>
              <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                {value ?? '—'}
              </p>
              {sub && <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
            </>
        }
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2.5 text-xs shadow-xl">
      <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: p.color, display: 'inline-block' }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TableSk({ rows = 5 }) {
  const ws = ['w-28', 'w-full', 'w-16', 'w-20', 'w-20', 'w-24'];
  return Array(rows).fill(0).map((_, i) => (
    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
      {ws.map((w, j) => (
        <td key={j} className="px-4 sm:px-5 py-3">
          <Sk className={`h-3.5 ${w}`} />
        </td>
      ))}
    </tr>
  ));
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      className="card p-4 flex items-center gap-3"
      style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.18)' }}
    >
      <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>Failed to load dashboard</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(252,165,165,0.7)' }}>
          {message || 'Check your connection or backend server.'}
        </p>
      </div>
      <button onClick={onRetry} className="btn-secondary text-xs shrink-0">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [chart,   setChart]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);   // null = no error, string = error message
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async (notify = false) => {
    setLoading(true);
    setError(null);
    try {
      const [sr, lr] = await Promise.all([
        api.get('/api/sms/stats'),
        api.get('/api/sms/logs?limit=10&page=1'),
      ]);
      const s = sr.data.data;
      setStats({ sentAll: s.sentAll, sentToday: s.sentToday, failedToday: s.failedToday, successRate: s.successRate });
      setChart(s.chart || []);
      setRecent(lr.data.data.messages || []);
      setUpdated(new Date());
      if (notify) toast.success('Dashboard refreshed');
    } catch (err) {
      const msg = handleApiError(err, 'Failed to load dashboard data');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const STATS = [
    { icon: MessageSquare, label: 'Total Sent',   value: stats?.sentAll,                           sub: 'All time',       accent: '#818cf8' },
    { icon: Send,          label: 'Sent Today',   value: stats?.sentToday,                         sub: 'Since midnight', accent: '#4ade80' },
    { icon: AlertCircle,   label: 'Failed Today', value: stats?.failedToday,                       sub: 'Since midnight', accent: '#f87171' },
    { icon: TrendingUp,    label: 'Success Rate', value: stats ? `${stats.successRate}%` : null,   sub: 'All time',       accent: '#a78bfa' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1400px] animate-fade-in">

      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle flex items-center gap-1.5">
            {updated
              ? <><Clock size={11} /> Updated {updated.toLocaleTimeString('en-IN', { timeStyle: 'short' })}</>
              : 'Your SMS delivery overview'
            }
          </p>
        </div>
        <button onClick={() => load(true)} disabled={loading} className="btn-secondary text-xs gap-1.5">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Chart */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>SMS Volume</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Last 7 days</p>
          </div>
          <div className="flex items-center gap-4">
            {[{ label: 'Sent', color: '#6366f1' }, { label: 'Failed', color: '#ef4444' }].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="inline-block w-3 h-[2px] rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {loading
          ? <Sk className="h-40 sm:h-48 w-full" />
          : chart.length === 0
            ? (
              <div className="h-40 sm:h-48 flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data yet — send your first SMS!</p>
              </div>
            )
            : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                  <Area type="monotone" dataKey="sent"   stroke="#6366f1" strokeWidth={1.5} fill="url(#gS)" dot={false} name="Sent" />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={1.5} fill="url(#gF)" dot={false} name="Failed" />
                </AreaChart>
              </ResponsiveContainer>
            )
        }
      </div>

      {/* Recent messages */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Messages</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Latest 10 records</p>
          </div>
          <Link
            to="/logs"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="w-full min-w-[540px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                {['To', 'Message', 'Type', 'Status', 'Device', 'Time'].map((h) => (
                  <th key={h} className="px-4 sm:px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <TableSk rows={5} />
                : recent.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center">
                        <Send size={24} className="mx-auto mb-2.5" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No messages yet</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Queue your first SMS via the API.</p>
                      </td>
                    </tr>
                  )
                  : recent.map((m) => (
                    <tr key={m._id} className="table-row text-xs">
                      <td className="px-4 sm:px-5 py-3.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{m.to}</td>
                      <td className="px-4 sm:px-5 py-3.5 max-w-[180px]">
                        <span className="block truncate" title={m.message} style={{ color: 'var(--text-secondary)' }}>{m.message}</span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 capitalize" style={{ color: 'var(--text-muted)' }}>{m.type}</td>
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap"><StatusBadge status={m.status} /></td>
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1.5">
                          {m.deviceId?.isOnline && <span className="online-dot" />}
                          {m.deviceId?.deviceName || '—'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
