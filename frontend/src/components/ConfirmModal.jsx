import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',   // 'danger' | 'warning' | 'default'
  loading = false,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;
    const raf = requestAnimationFrame(() => confirmRef.current?.focus());

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconStyle = {
    danger: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: <Trash2 size={17} style={{ color: '#f87171' }} /> },
    warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: <AlertTriangle size={17} style={{ color: '#fbbf24' }} /> },
    default: null,
  }[variant];

  const confirmCls = variant === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">

        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4">
          {iconStyle && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: iconStyle.bg, border: `1px solid ${iconStyle.border}` }}
            >
              {iconStyle.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 id="cm-title" className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            {description && (
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon shrink-0 -mt-1 -mr-1"><X size={15} /></button>
        </div>

        <hr className="divider mx-5" />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-4 px-5">
          <button onClick={onClose} disabled={loading} className="btn-secondary text-sm">
            {cancelLabel}
          </button>
          <button ref={confirmRef} onClick={onConfirm} disabled={loading} className={`${confirmCls} text-sm`}>
            {loading ? <><span className="spinner" />&nbsp;Please wait…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
