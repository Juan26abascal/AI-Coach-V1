'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Chip from '@/components/Chip';
import Input from '@/components/Input';
import useNetwork from '@/hooks/useNetwork';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  useNetwork();
  const { athlete, updateAthlete, offline, error, loading } = useAppStore();
  const { signOut } = useAuth();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    goal: '',
    daysPerWeek: 4,
    pr5k: '',
    pr10k: '',
    injuryHistory: '',
    availabilityNotes: '',
  });

  useEffect(() => {
    if (athlete) {
      setForm({
        name: athlete.name,
        goal: athlete.goal,
        daysPerWeek: athlete.daysPerWeek,
        pr5k: athlete.pr5k ?? '',
        pr10k: athlete.pr10k ?? '',
        injuryHistory: athlete.injuryHistory,
        availabilityNotes: athlete.availabilityNotes ?? '',
      });
    }
  }, [athlete]);

  if (!athlete) {
    return (
      <Card>
        <p className="text-sm text-stone/70">Complete onboarding to build your profile.</p>
      </Card>
    );
  }

  const handleChange = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!athlete) return;
    await updateAthlete({
      ...athlete,
      ...form,
      daysPerWeek: Number(form.daysPerWeek),
      pr5k: form.pr5k || undefined,
      pr10k: form.pr10k || undefined,
      availabilityNotes: form.availabilityNotes || undefined,
    });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg text-stone">Athlete Profile</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-stone/50">Foundation data for your plan</p>
        </div>
        {offline && <Chip label="Offline" tone="warning" />}
      </header>

      {error && (
        <Card>
          <p className="text-sm text-gold">{error}</p>
        </Card>
      )}

      <Card className="space-y-4">
        <Input
          label="Athlete name"
          value={form.name}
          onChange={(event) => handleChange('name', event.target.value)}
        />
        <Input
          label="Primary goal"
          value={form.goal}
          onChange={(event) => handleChange('goal', event.target.value)}
        />
        <Input
          label="Days per week"
          type="number"
          min={1}
          max={7}
          value={form.daysPerWeek}
          onChange={(event) => handleChange('daysPerWeek', Number(event.target.value))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="5k PR (optional)"
            value={form.pr5k}
            onChange={(event) => handleChange('pr5k', event.target.value)}
          />
          <Input
            label="10k PR (optional)"
            value={form.pr10k}
            onChange={(event) => handleChange('pr10k', event.target.value)}
          />
        </div>
        <Input
          label="Injury history"
          value={form.injuryHistory}
          onChange={(event) => handleChange('injuryHistory', event.target.value)}
        />
        <Input
          label="Availability notes"
          value={form.availabilityNotes}
          onChange={(event) => handleChange('availabilityNotes', event.target.value)}
        />
        <div className="flex items-center justify-between">
          <Button onClick={handleSave} disabled={loading}>
            Save profile
          </Button>
          {saved && <span className="text-xs uppercase tracking-[0.2em] text-sand">Saved</span>}
        </div>
        <Button variant="secondary" onClick={() => signOut()}>
          Sign out
        </Button>
      </Card>
    </div>
  );
}
