import type { Athlete, TrainingPlan, ChatMessage } from '@/types';

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

export function generateWelcomeMessages(athlete: Athlete, plan: TrainingPlan): ChatMessage[] {
  return [
    {
      id: crypto.randomUUID(),
      role: 'coach',
      content: `Welcome, ${athlete.name}. I built your first week around ${athlete.daysPerWeek} run days. We’ll adjust based on your feedback.`,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      role: 'coach',
      content: 'Your next session is ready. Keep it conversational and smooth.',
      createdAt: new Date().toISOString(),
      blocks: [
        {
          title: 'Next session',
          bullets: [plan.nextSession?.details ?? '35–40 min easy', '4 x 20s strides'],
          note: 'Fresh legs matter more than speed right now.',
        },
      ],
    },
  ];
}
