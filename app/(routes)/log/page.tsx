'use client';

import { useState } from 'react';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Chip from '@/components/Chip';
import Input from '@/components/Input';
import useNetwork from '@/hooks/useNetwork';
import { useAppStore } from '@/store/useAppStore';

export default function LogPage() {
  useNetwork();
  const { workouts, addWorkout, loading, error, offline } = useAppStore();
  const [form, setForm] = useState({ title: '', durationMinutes: 30, effort: 'Easy', pain: '', notes: '' });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    addWorkout({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      title: form.title,
      durationMinutes: form.durationMinutes,
      effort: form.effort as 'Easy' | 'Moderate' | 'Hard',
      pain: form.pain || undefined,
      notes: form.notes || undefined,
    });
    setForm({ title: '', durationMinutes: 30, effort: 'Easy', pain: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg text-stone">Workout Log</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-stone/50">Keep it honest for better coaching</p>
        </div>
        {offline && <Chip label="Offline" tone="warning" />}
      </header>

      {error && (
        <Card>
          <p className="text-sm text-gold">{error}</p>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-sm uppercase tracking-[0.2em] text-stone/60">Log a workout</h2>
        <Input
          label="Session title"
          placeholder="Easy run, hill session, long run"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Duration (minutes)"
            type="number"
            min={10}
            max={240}
            value={form.durationMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
          />
          <label className="text-sm text-stone">
            <span className="text-xs uppercase tracking-[0.2em] text-stone/60">Effort</span>
            <select
              className="focus-ring mt-2 w-full rounded-2xl border border-smoke/70 bg-ink/40 px-4 py-3 text-sm text-stone"
              value={form.effort}
              onChange={(event) => setForm((prev) => ({ ...prev, effort: event.target.value }))}
            >
              <option>Easy</option>
              <option>Moderate</option>
              <option>Hard</option>
            </select>
          </label>
        </div>
        <Input
          label="Pain or discomfort (optional)"
          placeholder="e.g., mild left calf tightness"
          value={form.pain}
          onChange={(event) => setForm((prev) => ({ ...prev, pain: event.target.value }))}
        />
        <Input
          label="Notes"
          placeholder="How did it feel?"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
        <Button onClick={handleSubmit} disabled={loading}>
          Save workout
        </Button>
      </Card>

      {workouts.length === 0 ? (
        <Card>
          <p className="text-sm text-stone/70">No workouts logged yet. Start with today’s session.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <Card key={workout.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone">{workout.title}</p>
                  <p className="text-xs text-stone/50">{new Date(workout.date).toDateString()}</p>
                </div>
                <Badge label={workout.effort} tone={workout.effort === 'Hard' ? 'alert' : 'soft'} />
              </div>
              <p className="text-xs text-stone/60">{workout.durationMinutes} minutes</p>
              {workout.pain && <p className="text-xs text-gold">Pain noted: {workout.pain}</p>}
              {workout.notes && <p className="text-xs text-stone/60">{workout.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
