'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Chip from '@/components/Chip';
import Input from '@/components/Input';
import useNetwork from '@/hooks/useNetwork';
import { useAppStore } from '@/store/useAppStore';

export default function ProfilePage() {
  useNetwork();
  const { athlete, updateAthlete, offline, error } = useAppStore();
  const [saved, setSaved] = useState(false);

  if (!athlete) {
    return (
      <Card>
        <p className="text-sm text-stone/70">Complete onboarding to build your profile.</p>
      </Card>
    );
  }

  const handleChange = (key: keyof typeof athlete, value: string | number) => {
    updateAthlete({ ...athlete, [key]: value });
    setSaved(false);
  };

  const handleSave = () => {
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
          value={athlete.name}
          onChange={(event) => handleChange('name', event.target.value)}
        />
        <Input
          label="Primary goal"
          value={athlete.goal}
          onChange={(event) => handleChange('goal', event.target.value)}
        />
        <Input
          label="Days per week"
          type="number"
          min={1}
          max={7}
          value={athlete.daysPerWeek}
          onChange={(event) => handleChange('daysPerWeek', Number(event.target.value))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="5k PR (optional)"
            value={athlete.pr5k ?? ''}
            onChange={(event) => handleChange('pr5k', event.target.value)}
          />
          <Input
            label="10k PR (optional)"
            value={athlete.pr10k ?? ''}
            onChange={(event) => handleChange('pr10k', event.target.value)}
          />
        </div>
        <Input
          label="Injury history"
          value={athlete.injuryHistory}
          onChange={(event) => handleChange('injuryHistory', event.target.value)}
        />
        <Input
          label="Availability notes"
          value={athlete.availabilityNotes ?? ''}
          onChange={(event) => handleChange('availabilityNotes', event.target.value)}
        />
        <div className="flex items-center justify-between">
          <Button onClick={handleSave}>Save profile</Button>
          {saved && <span className="text-xs uppercase tracking-[0.2em] text-sand">Saved</span>}
        </div>
      </Card>
    </div>
  );
}
