import type { AppState } from '@/store/useAppStore';
import type { ChatMessage } from '@/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getMockCoachResponse(input: string, _state: AppState): Promise<ChatMessage> {
  await delay(600);

  const lower = input.toLowerCase();
  const painSignals = ['pain', 'injury', 'shin', 'knee', 'ankle', 'hurt'];
  const mentionsPain = painSignals.some((signal) => lower.includes(signal));

  if (mentionsPain) {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Pause intensity today. If pain is sharp or worsening, stop and consider professional guidance. I can adapt your week once you tell me severity and location.',
      timestamp: new Date().toISOString(),
      blocks: [
        {
          title: 'Immediate next steps',
          bullets: [
            'Keep today to light mobility or rest only.',
            'Rate pain 1–10 and describe the exact location.',
            'If pain changes your gait, stop running for now.',
          ],
          note: 'Safety first. We build consistency by protecting your body.',
        },
      ],
    };
  }

  if (lower.includes('plan') || lower.includes('week')) {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Your week stays simple: consistency, then quality. Here is the next key session.',
      timestamp: new Date().toISOString(),
      blocks: [
        {
          title: 'Next key session',
          bullets: ['45 min easy (RPE 4–5)', '4 x 20s strides, full recovery'],
          note: 'We build aerobic base and keep speed sharp without fatigue.',
        },
      ],
    };
  }

  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content:
      'Logged. Keep the notes honest — they help me adjust your plan with precision. Anything else I should know before the next session?',
    timestamp: new Date().toISOString(),
  };
}
