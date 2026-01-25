import clsx from 'clsx';

type MessageBubbleProps = {
  children: React.ReactNode;
  tone: 'coach' | 'user';
};

export default function MessageBubble({ children, tone }: MessageBubbleProps) {
  return (
    <div
      className={clsx(
        'max-w-[75%] rounded-3xl px-4 py-3 text-sm leading-relaxed',
        tone === 'coach'
          ? 'bg-smoke/60 text-stone shadow-inset'
          : 'ml-auto bg-sand text-ink'
      )}
    >
      {children}
    </div>
  );
}
