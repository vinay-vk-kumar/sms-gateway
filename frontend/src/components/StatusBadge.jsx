import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

const MAP = {
  sent: { label: 'Sent', cls: 'badge-sent', Icon: CheckCircle2, spin: false },
  failed: { label: 'Failed', cls: 'badge-failed', Icon: XCircle, spin: false },
  pending: { label: 'Pending', cls: 'badge-pending', Icon: Clock, spin: false },
  processing: { label: 'Processing', cls: 'badge-processing', Icon: Loader2, spin: true },
};

export default function StatusBadge({ status }) {
  const cfg = MAP[status] || MAP.pending;
  const { label, cls, Icon, spin } = cfg;
  return (
    <span className={cls}>
      <Icon size={10} className={spin ? 'animate-spin' : ''} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      {label}
    </span>
  );
}
