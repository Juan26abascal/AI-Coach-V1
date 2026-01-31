import Card from '@/components/Card';
import type { CoachResponse } from '@/lib/coach/types';

type AlertCardProps = {
  alert: CoachResponse['alert'];
};

const severityMeta: Record<
  NonNullable<AlertCardProps['alert']>['severity'],
  { icon: string; border: string; bg: string; text: string }
> = {
  warning: {
    icon: '⚠️',
    border: 'border-amber-500/70',
    bg: 'bg-amber-500/10',
    text: 'text-amber-200',
  },
  critical: {
    icon: '🛑',
    border: 'border-rose-500/70',
    bg: 'bg-rose-500/10',
    text: 'text-rose-200',
  },
};

export default function AlertCard({ alert }: AlertCardProps) {
  const meta = severityMeta[alert.severity];

  return (
    <Card className={`space-y-3 border-l-4 ${meta.border} ${meta.bg}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{meta.icon}</span>
        <h4 className={`text-sm font-semibold ${meta.text}`}>{alert.title}</h4>
      </div>
      <p className="text-sm text-stone/80">{alert.details}</p>
    </Card>
  );
}
