import type { Alert } from '@/lib/coach/schema';

const severityMeta = {
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: '⚠️',
  },
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: '🛑',
  },
};

type AlertCardProps = {
  alert: Alert | undefined;
};

export default function AlertCard({ alert }: AlertCardProps) {
  if (!alert) return null;

  const meta = severityMeta[alert.severity];
  if (!meta) return null;

  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{meta.icon}</span>
        <div>
          <h4 className={`text-sm font-semibold ${meta.text}`}>{alert.title}</h4>
          <p className="mt-1 text-sm text-stone/80">{alert.details}</p>
        </div>
      </div>
    </div>
  );
}