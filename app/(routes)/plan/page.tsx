'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Chip from '@/components/Chip';
import WeekGrid from '@/components/WeekGrid';
import useNetwork from '@/hooks/useNetwork';
import { useAppStore } from '@/store/useAppStore';

export default function PlanPage() {
  useNetwork();
  const { plan, loading, error, offline } = useAppStore();
  const [selectedDay, setSelectedDay] = useState(0);

  if (!plan && loading) {
    return (
      <Card>
        <p className="text-sm text-stone/70">Generating your weekly plan…</p>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-stone/70">No plan yet. Complete onboarding to generate a week.</p>
        {offline && <Chip label="Offline" tone="warning" />}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg text-stone">Weekly Overview</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-stone/50">Week of {new Date(plan.weekOf).toDateString()}</p>
        </div>
        {offline && <Chip label="Offline" tone="warning" />}
      </header>

      {error && (
        <Card>
          <p className="text-sm text-gold">{error}</p>
        </Card>
      )}

      <WeekGrid week={plan.days} selectedDay={selectedDay} onSelect={setSelectedDay} />

      <Card className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.2em] text-stone/60">Session details</h2>
        <p className="text-base text-stone">{plan.days[selectedDay]?.title ?? 'Rest / No plan'}</p>
        <p className="text-sm text-stone/70">{plan.days[selectedDay]?.details ?? 'Coach will refine this day.'}</p>
        <Button variant="secondary">Discuss with Coach</Button>
      </Card>
    </div>
  );
}
