import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

const MAP = {
  sent: { label: 'Sent', dot: 'bg-green-500' },
  failed: { label: 'Failed', dot: 'bg-red-500' },
  pending: { label: 'Pending', dot: 'bg-yellow-500' },
  processing: { label: 'Processing', dot: 'bg-blue-500 animate-pulse' },
  online: { label: 'Online', dot: 'bg-green-500' },
  offline: { label: 'Offline', dot: 'bg-red-500' },
};

export default function StatusBadge({ status }) {
  const cfg = MAP[status] || MAP.pending;
  const { label, dot } = cfg;
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
