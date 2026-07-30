import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Smartphone, ScrollText, KeyRound,
  LogOut, Menu, X, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/devices', label: 'Devices', icon: Smartphone, end: false },
  { to: '/logs', label: 'SMS Logs', icon: ScrollText, end: false },
  { to: '/api-keys', label: 'API Keys', icon: KeyRound, end: false },
];

/* ── Single nav link ── */
function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className="block">
      {({ isActive }) => (
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
          style={{
            color: isActive ? '#ededed' : '#888',
            background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.color = '#ededed';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <Icon size={15} strokeWidth={isActive ? 2 : 1.75} style={{ color: isActive ? '#ffffff' : 'inherit', flexShrink: 0 }} />
          <span className="flex-1 truncate">{label}</span>
          {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#ffffff' }} />}
        </div>
      )}
    </NavLink>
  );
}

/* ── Logo bar — shared between desktop top + mobile drawer top ── */
function LogoBar({ onClose }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-4 shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-transparent"
        >
          <img src="/logo.png" alt="SMSGW Logo" className="w-full h-full object-cover scale-[1.3]" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>SMS Gateway</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Delivery Platform</p>
        </div>
      </div>
      {/* Close button — only shown inside mobile drawer */}
      {onClose && (
        <button onClick={onClose} className="btn-icon" aria-label="Close menu">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/* ── Nav + user footer ── */
function SidebarContent({ onNavClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>

      {/* Navigation — scrollable if many items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <p
          className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          Navigation
        </p>
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNavClick} />
        ))}
      </nav>

      {/* User footer — always pinned at bottom, never scrolls away */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        {/* User info */}
        <div
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-1"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: '#222222' }}
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.email || 'User'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Free plan</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={14} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </div>
  );
}

/* ── Root export ── */
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close drawer on navigation
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // ESC to close drawer
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* ─── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-[220px] shrink-0 h-screen sticky top-0"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        <LogoBar />           {/* Logo at top, no close button */}
        <SidebarContent />    {/* Nav + user footer fill remaining height */}
      </aside>

      {/* ─── Mobile: sticky top bar (hamburger only) ─────────── */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-50"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-transparent"
          >
            <img src="/logo.png" alt="SMSGW Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>SMS Gateway</span>
        </div>
        <button onClick={() => setOpen(true)} className="btn-icon" aria-label="Open menu">
          <Menu size={18} />
        </button>
      </header>

      {/* ─── Mobile drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mobile-drawer-overlay"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
              className="mobile-drawer-panel flex flex-col fixed top-0 left-0 h-full w-[260px] z-[60] shadow-2xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <LogoBar onClose={() => setOpen(false)} />
              <SidebarContent onNavClick={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
