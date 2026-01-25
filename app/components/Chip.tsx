import clsx from 'clsx';

type ChipProps = {
  label: string;
  tone?: 'neutral' | 'accent' | 'warning';
};

export default function Chip({ label, tone = 'neutral' }: ChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]',
        tone === 'neutral' && 'border-smoke/70 text-stone/70',
        tone === 'accent' && 'border-sand/40 text-sand',
        tone === 'warning' && 'border-gold/60 text-gold'
      )}
    >
      {label}
    </span>
  );
}
