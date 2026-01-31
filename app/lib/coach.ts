import type { AppState } from '@/store/useAppStore';
import type { Message } from '@/types';
import type { CoachResponse, SessionPrescription } from '@/lib/coach/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildSessionPrescription = (): SessionPrescription => ({
  type: 'threshold',
  title: 'Tempo focus',
  warmup: {
    duration: '10 min',
    description: 'Easy spin with 3 x 20s quick pickups and dynamic drills.',
  },
  main: {
    structure: '3 x 8 min tempo with 3 min jog recoveries',
    target: 'Hold odd-sustainable rhythm just below 10K pace',
    recovery: '3 min easy jog',
    notes: 'Stay tall, think efficient turnover, keep shoulders relaxed.',
  },
  cooldown: {
    duration: '10 min',
    description: 'Easy jog with leg swings and focused breath.',
  },
  totalTime: '55 min',
  totalDistance: '7.2 miles',
  calibration: 'If lactate spikes, drop effort until breathing steadies—stay controlled.',
});

export async function getMockCoachResponse(input: string, _state: AppState): Promise<Message> {
  await delay(600);

  const lower = input.toLowerCase();
  const painSignals = ['pain', 'injury', 'shin', 'knee', 'ankle', 'hurt'];
  const mentionsPain = painSignals.some((signal) => lower.includes(signal));

  const defaultCoachResponse: CoachResponse = {
    message:
      'Logged. Keep the notes honest — they help me adjust your plan with precision. Anything else I should know before the next session?',
    confidence: 'medium',
    actions: [
      { label: 'Share training log', value: 'share_log' },
      { label: 'Adjust upcoming goal', value: 'adjust_goal' },
    ],
  };

  if (mentionsPain) {
    const painResponse: CoachResponse = {
      ...defaultCoachResponse,
      message:
        'Pause intensity today. If pain is sharp or worsening, stop and consider professional guidance. I can adapt your week once you tell me severity and location.',
      confidence: 'high',
      alert: {
        severity: 'warning',
        title: 'Pain detected',
        details:
          'Treat today as active recovery. Share location, severity, and whether you felt it while running or walking.',
      },
    };

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: painResponse.message,
      timestamp: new Date().toISOString(),
      structuredContent: painResponse,
    };
  }

  if (lower.includes('plan') || lower.includes('week')) {
    const sessionResponse: CoachResponse = {
      message: 'Your week stays simple: consistency, then quality. Here is the next key session.',
      confidence: 'high',
      session: buildSessionPrescription(),
      actions: [{ label: 'Flag for coach review', value: 'flag_review' }],
    };

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: sessionResponse.message,
      timestamp: new Date().toISOString(),
      structuredContent: sessionResponse,
    };
  }

  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: defaultCoachResponse.message,
    timestamp: new Date().toISOString(),
    structuredContent: defaultCoachResponse,
  };
}
