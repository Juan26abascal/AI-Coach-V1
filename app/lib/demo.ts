import type { Athlete, TrainingPlan, Message } from '@/types';
import type { CoachResponse, SessionPrescription } from '@/lib/coach/types';

export function generateStarterPlan(athlete: Athlete): TrainingPlan {
  const days = Array.from({ length: 7 }, (_, index) => {
    if (index === 1) {
      return { title: 'Easy Run', details: '35–40 min easy + 4 strides', focus: 'Aerobic' };
    }
    if (index === 3) {
      return { title: 'Tempo Touch', details: '3 x 6 min comfortably hard', focus: 'Threshold' };
    }
    if (index === 5) {
      return { title: 'Long Run', details: '55 min easy, smooth effort', focus: 'Endurance' };
    }
    return { title: 'Recovery', details: 'Rest or 25 min easy', focus: 'Recovery' };
  });

  return {
    id: crypto.randomUUID(),
    weekOf: new Date().toISOString(),
    days,
    nextSession: days[1],
  };
}

export function generateWelcomeMessages(athlete: Athlete, plan: TrainingPlan): Message[] {
  return [
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Welcome, ${athlete.name}. I built your first week around ${athlete.daysPerWeek} run days. We’ll adjust based on your feedback.`,
      timestamp: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Your next session is ready. Keep it conversational and smooth.',
      timestamp: new Date().toISOString(),
      structuredContent: {
        message: 'Here are the details for the next key session.',
        confidence: 'high',
        session: {
          type: 'long',
          title: plan.nextSession?.title ?? 'Long aerobic run',
          warmup: {
            duration: '10 min',
            description: 'Easy spin with 2 x 20s strides to open the hips.',
          },
          main: {
            structure: '4 x 12 min steady with 2 min jog recoveries',
            target: 'Hold comfortably hard, ~30s slower than 5K pace',
            recovery: '2 min easy jog',
            notes: plan.nextSession?.focus ?? 'Stay smooth, keep cadence high.',
          },
          cooldown: {
            duration: '8 min',
            description: 'Cruise back with easy jogging and a few stretch strides.',
          },
          totalTime: '55 min',
          totalDistance: '7.0 miles',
          calibration: 'If today feels heavy, back off 10–15 sec per mile for the first half.',
        } satisfies SessionPrescription,
      } satisfies CoachResponse,
    },
  ];
}
