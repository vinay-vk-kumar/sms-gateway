import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 grid-bg"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="text-center animate-fade-in max-w-sm">
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
        >
          <Zap size={26} className="text-white" strokeWidth={2.5} />
        </div>

        <p className="text-7xl font-bold mb-4" style={{ color: 'rgba(255,255,255,0.08)' }}>404</p>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Page not found
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link to="/" className="btn-primary text-sm gap-2">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
