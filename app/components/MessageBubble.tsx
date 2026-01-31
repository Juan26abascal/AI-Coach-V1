import clsx from 'clsx';
import ActionButtons from './ActionButtons';
import AlertCard from './AlertCard';
import WorkoutCard from './WorkoutCard';
import type { Message } from '@/types';

type MessageBubbleProps = {
  message: Message;
  tone: 'coach' | 'user';
  onAction?: (value: string) => void;
};

export default function MessageBubble({ message, tone, onAction }: MessageBubbleProps) {
  const handleAction = (value: string) => {
    onAction?.(value);
  };

  return (
    <div
      className={clsx(
        'max-w-[75%] rounded-3xl px-4 py-3 text-sm leading-relaxed',
        tone === 'coach'
          ? 'bg-smoke/60 text-stone shadow-inset'
          : 'ml-auto bg-sand text-ink'
      )}
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed">{message.content}</p>

        {message.structuredContent?.session && (
          <WorkoutCard session={message.structuredContent.session} />
        )}

        {message.structuredContent?.alert && <AlertCard alert={message.structuredContent.alert} />}

        {message.structuredContent?.actions && message.structuredContent.actions.length > 0 && (
          <ActionButtons actions={message.structuredContent.actions} onAction={handleAction} />
        )}
      </div>
    </div>
  );
}
