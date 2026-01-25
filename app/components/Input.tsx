import clsx from 'clsx';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
};

export default function Input({ label, helper, className, ...props }: InputProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-stone">
      {label && <span className="text-xs uppercase tracking-[0.2em] text-stone/60">{label}</span>}
      <input
        className={clsx(
          'focus-ring w-full rounded-2xl border border-smoke/70 bg-ink/40 px-4 py-3 text-sm text-stone placeholder:text-stone/30',
          className
        )}
        {...props}
      />
      {helper && <span className="text-xs text-stone/50">{helper}</span>}
    </label>
  );
}
