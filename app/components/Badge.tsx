import clsx from 'clsx';

type BadgeProps = {
  label: string;
  tone?: 'soft' | 'alert';
};

export default function Badge({ label, tone = 'soft' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em]',
        tone === 'soft' && 'bg-smoke/60 text-stone/70',
        tone === 'alert' && 'bg-gold/20 text-gold'
      )}
    >
      {label}
    </span>
  );
}
