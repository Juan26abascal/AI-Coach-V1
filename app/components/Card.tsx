import clsx from 'clsx';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('rounded-3xl border border-smoke/70 bg-smoke/30 p-5 shadow-inset', className)}>
      {children}
    </div>
  );
}
