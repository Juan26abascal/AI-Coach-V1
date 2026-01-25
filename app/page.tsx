'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import Card from '@/components/Card';
import Button from '@/components/Button';
import CoachBlock from '@/components/CoachBlock';
import MessageBubble from '@/components/MessageBubble';
import Input from '@/components/Input';
import Chip from '@/components/Chip';
import useNetwork from '@/hooks/useNetwork';
import { useAppStore } from '@/store/useAppStore';

export default function ChatPage() {
  useNetwork();
  const router = useRouter();
  const {
    athlete,
    messages,
    loading,
    error,
    offline,
    sendMessage,
    addCheckIn,
    clearError,
  } = useAppStore();
  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [checkIn, setCheckIn] = useState({ readiness: 3, soreness: 2, sleep: 3, motivation: 4, note: '' });

  useEffect(() => {
    if (!athlete) {
      router.replace('/onboarding');
    }
  }, [athlete, router]);

  const visibleMessages = useMemo(() => {
    if (showAll) return messages;
    return messages.slice(-40);
  }, [messages, showAll]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    await sendMessage(draft.trim());
    setDraft('');
  };

  const handleCheckInSubmit = async () => {
    await addCheckIn({ ...checkIn, createdAt: new Date().toISOString() });
    setCheckIn((prev) => ({ ...prev, note: '' }));
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-sand" />
          <h1 className="text-sm uppercase tracking-[0.4em] text-stone/70">Coach</h1>
        </div>
        {offline && <Chip label="Offline" tone="warning" />}
      </header>

      {error && (
        <Card className="flex items-center justify-between">
          <p className="text-sm text-gold">{error}</p>
          <button className="text-xs uppercase tracking-[0.2em] text-stone/60" onClick={clearError}>
            Dismiss
          </button>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-[0.3em] text-stone/60">Daily Check-in</h2>
          <span className="text-xs text-stone/40">~20 seconds</span>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {([
            { key: 'readiness', label: 'Readiness' },
            { key: 'soreness', label: 'Soreness' },
            { key: 'sleep', label: 'Sleep' },
            { key: 'motivation', label: 'Motivation' },
          ] as const).map((metric) => (
            <label key={metric.key} className="text-xs text-stone/60">
              {metric.label}
              <input
                type="range"
                min={1}
                max={5}
                value={checkIn[metric.key]}
                onChange={(event) =>
                  setCheckIn((prev) => ({ ...prev, [metric.key]: Number(event.target.value) }))
                }
                className="mt-2 w-full accent-sand"
              />
            </label>
          ))}
        </div>
        <Input
          label="Optional note"
          placeholder="Anything I should know?"
          value={checkIn.note}
          onChange={(event) => setCheckIn((prev) => ({ ...prev, note: event.target.value }))}
        />
        <Button onClick={handleCheckInSubmit} disabled={loading}>
          Submit check-in
        </Button>
      </Card>

      <section className="space-y-4">
        {messages.length === 0 && (
          <Card>
            <p className="text-sm text-stone/70">
              No sessions yet. Share your focus for this week and I’ll build the first steps.
            </p>
          </Card>
        )}

        {messages.length > 40 && !showAll && (
          <button
            className="text-xs uppercase tracking-[0.2em] text-stone/50"
            onClick={() => setShowAll(true)}
          >
            View earlier messages
          </button>
        )}

        <div className="flex flex-col gap-4">
          {visibleMessages.map((message) => (
            <div key={message.id} className={clsx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className="space-y-3">
                <MessageBubble tone={message.role}>{message.content}</MessageBubble>
                {message.blocks?.map((block) => (
                  <CoachBlock key={block.title} {...block} />
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <MessageBubble tone="coach">
              <span className="text-stone/70">Coach is thinking…</span>
            </MessageBubble>
          )}
        </div>
      </section>

      <Card className="space-y-3">
        <label className="text-xs uppercase tracking-[0.2em] text-stone/60">Message</label>
        <textarea
          className="focus-ring min-h-[110px] w-full rounded-3xl border border-smoke/70 bg-ink/40 p-4 text-sm text-stone placeholder:text-stone/30"
          placeholder="Ask about today’s session, adjust the plan, or log how you feel."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone/40">Direct, honest notes help me coach you.</span>
          <Button onClick={handleSend} disabled={loading || !draft.trim()}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
