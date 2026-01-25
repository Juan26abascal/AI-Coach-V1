import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export default function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'focus-ring inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition',
        variant === 'primary' &&
          'bg-sand text-ink hover:bg-stone active:bg-sand/80',
        variant === 'secondary' &&
          'border border-smoke/70 text-stone hover:border-stone/60 hover:text-sand',
        variant === 'ghost' && 'text-stone/70 hover:text-stone',
        className
      )}
      {...props}
    />
  );
}
