'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Input from '@/components/Input';
import { useAppStore } from '@/store/useAppStore';

const steps = [
  { id: 'name', label: 'Your name', placeholder: 'Alex' },
  { id: 'goal', label: 'Primary goal', placeholder: 'Sub-40 10k' },
  { id: 'daysPerWeek', label: 'Days per week', placeholder: '4', type: 'number' },
  { id: 'pr5k', label: '5k PR (optional)', placeholder: '19:45' },
  { id: 'pr10k', label: '10k PR (optional)', placeholder: '41:30' },
  { id: 'injuryHistory', label: 'Injury history', placeholder: 'Any recurring issues?' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const setAthlete = useAppStore((state) => state.setAthlete);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    name: '',
    goal: '',
    daysPerWeek: 4,
    pr5k: '',
    pr10k: '',
    injuryHistory: '',
  });

  const current = steps[stepIndex];

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    setAthlete({
      id: crypto.randomUUID(),
      name: form.name || 'Runner',
      goal: form.goal || 'Consistency and speed',
      daysPerWeek: Number(form.daysPerWeek) || 4,
      pr5k: form.pr5k || undefined,
      pr10k: form.pr10k || undefined,
      injuryHistory: form.injuryHistory || 'No current issues',
    });
    router.replace('/');
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-stone/40">AI Running Coach</p>
        <h1 className="text-2xl text-stone">Let’s build your training baseline.</h1>
        <p className="text-sm text-stone/60">
          I’ll ask a few focused questions. It should take under two minutes.
        </p>
      </header>

      <Card className="space-y-6">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-stone/50">
          <span>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <span>{current.label}</span>
        </div>
        <Input
          label={current.label}
          placeholder={current.placeholder}
          type={current.type ?? 'text'}
          value={form[current.id as keyof typeof form] as string | number}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              [current.id]: current.type === 'number' ? Number(event.target.value) : event.target.value,
            }))
          }
        />
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => setStepIndex(Math.max(stepIndex - 1, 0))}>
            Back
          </Button>
          <Button onClick={handleNext}>{stepIndex === steps.length - 1 ? 'Finish' : 'Next'}</Button>
        </div>
      </Card>
    </div>
  );
}
