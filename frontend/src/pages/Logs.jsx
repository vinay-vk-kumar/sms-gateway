import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { handleApiError } from '../api/errorHandler';
import StatusBadge from '../components/StatusBadge';
import {
  Search, SlidersHorizontal, ChevronLeft, ChevronRight,
  RefreshCw, AlertCircle, Inbox, X,
} from 'lucide-react';

const STATUS_OPTS = ['pending', 'processing', 'sent', 'failed'];
const LIMIT = 20;

function Sk({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

function TableSk({ rows = 8 }) {
  const ws = ['w-28', 'w-full', 'w-14', 'w-20', 'w-20', 'w-8', 'w-24'];
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

function FilterPill({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
    >
      {label}
      <button
        onClick={onRemove}
        className="hover:text-white transition-colors rounded-full"
        style={{ lineHeight: 0 }}
      >
        <X size={10} />
      </button>
    </span>
  );
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [status, setStatus] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const q = new URLSearchParams({ page, limit: LIMIT });
      if (status) q.set('status', status);
      if (deviceId) q.set('deviceId', deviceId);
      const { data } = await api.get(`/api/sms/logs?${q}`);
      setLogs(data.data.messages || []);
      setTotal(data.data.pagination?.total || 0);
    } catch (err) {
      setError(true);
      handleApiError(err, 'Failed to load SMS logs');
    } finally {
      setLoading(false);
    }
  }, [page, status, deviceId]);   // ← recreated only when these change

  // Single effect — fires once on mount and whenever load() changes
  useEffect(() => { load(); }, [load]);

  // Fetch devices for the filter dropdown (once)
  useEffect(() => {
    api.get('/api/devices')
      .then(({ data }) => setDevices(data.data.devices || []))
      .catch(() => { });
  }, []);

  const handleStatusChange = (val) => { setPage(1); setStatus(val); };
  const handleDeviceChange = (val) => { setPage(1); setDeviceId(val); };

  const displayed = search.trim()
    ? logs.filter(
      (m) => m.to?.includes(search) || m.message?.toLowerCase().includes(search.toLowerCase())
    )
    : logs;

  const totalPages = Math.ceil(total / LIMIT);

  const activeFilters = [
    status && { label: `Status: ${status}`, onRemove: () => handleStatusChange('') },
    deviceId && {
      label: `Device: ${devices.find((d) => d._id === deviceId)?.deviceName || 'selected'}`,
      onRemove: () => handleDeviceChange(''),
    },
    search && { label: `"${search}"`, onRemove: () => setSearch('') },
  ].filter(Boolean);

  const clearAll = () => { handleStatusChange(''); handleDeviceChange(''); setSearch(''); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px] animate-fade-in">

      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">SMS Logs</h1>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : `${total.toLocaleString()} message${total !== 1 ? 's' : ''} total`
            }
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs gap-1.5 shrink-0">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            className="input pl-8 py-2 text-xs w-full"
            placeholder="Search number or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="relative">
          <SlidersHorizontal
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <select
            className="input pl-8 pr-3 py-2 text-xs appearance-none cursor-pointer min-w-[140px]"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ background: 'var(--bg-surface)' }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s} style={{ background: '#111' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Device filter */}
        {devices.length > 0 && (
          <select
            className="input pr-3 py-2 text-xs appearance-none cursor-pointer min-w-[150px]"
            value={deviceId}
            onChange={(e) => handleDeviceChange(e.target.value)}
            style={{ background: 'var(--bg-surface)' }}
          >
            <option value="">All devices</option>
            {devices.map((d) => (
              <option key={d._id} value={d._id} style={{ background: '#111' }}>{d.deviceName}</option>
            ))}
          </select>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap animate-fade-in">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active filters:</span>
          {activeFilters.map((f, i) => <FilterPill key={i} {...f} />)}
          <button
            onClick={clearAll}
            className="text-xs underline underline-offset-2 hover:text-white transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {error ? (
          <div className="p-10 sm:p-14 flex flex-col items-center text-center gap-3">
            <AlertCircle size={28} style={{ color: '#f87171' }} />
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Failed to load logs
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              There was a problem connecting to the backend.
            </p>
            <button onClick={load} className="btn-secondary text-xs mt-1">
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="w-full min-w-[580px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    {['To', 'Message', 'Type', 'Status', 'Device', 'Retries', 'Time'].map((h) => (
                      <th
                        key={h}
                        className="px-4 sm:px-5 py-3 text-left text-xs font-medium whitespace-nowrap"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSk rows={8} />
                  ) : displayed.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <Inbox size={26} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {logs.length === 0 ? 'No messages found' : 'No results match your search'}
                        </p>
                        {activeFilters.length > 0 && (
                          <button
                            onClick={clearAll}
                            className="text-xs mt-2 underline underline-offset-2"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayed.map((m) => (
                      <tr key={m._id} className="table-row text-xs">
                        <td className="px-4 sm:px-5 py-3.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                          {m.to}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 max-w-[180px] sm:max-w-[240px]">
                          <span className="block truncate" title={m.message} style={{ color: 'var(--text-secondary)' }}>
                            {m.message}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 capitalize whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {m.type}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {m.deviceId?.deviceName || '—'}
                        </td>
                        <td
                          className="px-4 sm:px-5 py-3.5 text-center tabular-nums"
                          style={{ color: (m.retries ?? 0) > 0 ? '#fbbf24' : 'var(--text-muted)' }}
                        >
                          {m.retries ?? 0}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div
                className="flex items-center justify-between px-4 sm:px-5 py-3.5 flex-wrap gap-3"
                style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Page{' '}
                  <strong style={{ color: 'var(--text-secondary)' }}>{page}</strong>
                  {' '}of{' '}
                  <strong style={{ color: 'var(--text-secondary)' }}>{totalPages}</strong>
                  {' '}· {total.toLocaleString()} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-icon disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    const isActive = pg === page;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                        style={isActive
                          ? { background: 'rgba(99,102,241,0.14)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.22)' }
                          : { color: 'var(--text-muted)' }
                        }
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {pg}
                      </button>
                    );
                  })}

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-icon disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
