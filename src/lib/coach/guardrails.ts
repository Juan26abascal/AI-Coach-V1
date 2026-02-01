import type { Athlete, TrainingPlan, Workout, CheckIn, ChatMessage } from '@/types';
import { CoachResponseSchema, type CoachResponse, type SessionPrescription } from '@/lib/coach/schema';

export type CoachRequestContext = {
  athlete?: Athlete | null;
  plan?: TrainingPlan | null;
  workouts?: Workout[];
  checkIns?: CheckIn[];
  recentMessages?: ChatMessage[];
};

type SafetyFlags = {
  painScore: number | null;
  painWorsening: boolean;
  readinessRed: boolean;
  rehabMode: boolean;
  persistentOrWorsening: boolean;
};

const MEDICAL_ESCALATION_LINE = 'If pain is persistent or worsening, seek medical evaluation.';

// Default sessions for different states
const STANDARD_SESSION: SessionPrescription = {
  type: 'easy',
  title: 'Easy Run with Strides',
  duration: '35 min',
  effort: 'Conversational pace',
  totalTime: '45 min',
  warmup: {
    duration: '10 min',
    description: 'Easy jog',
  },
  main: {
    structure: '20 min easy + 6 x 20s strides',
    target: 'Conversational pace, strides at controlled fast',
    recovery: '60s walk between strides',
  },
  cooldown: {
    duration: '5 min',
    description: 'Easy walk',
  },
};

const RECOVERY_SESSION: SessionPrescription = {
  type: 'recovery',
  title: 'Recovery Walk & Prehab',
  duration: '25 min',
  effort: 'Very easy walk',
  notes: 'Focus on gentle movement and breathing exercises.',
  totalTime: '25 min',
};

const REHAB_SESSION: SessionPrescription = {
  type: 'recovery',
  title: 'Rehab Day',
  duration: '20 min',
  effort: 'Very easy walk only',
  notes: 'No running today. Focus on gentle movement.',
  totalTime: '20 min',
};

const STANDARD_RESPONSE: CoachResponse = {
  message: 'Here is a session aligned to your current plan focus.',
  session: STANDARD_SESSION,
  confidence: 'high',
};

const RECOVERY_RESPONSE: CoachResponse = {
  message: 'Readiness is low today. Recovery and prehab only.',
  session: RECOVERY_SESSION,
  confidence: 'high',
};

const REHAB_RESPONSE: CoachResponse = {
  message: 'Protecting the issue today. Light movement only, no running.',
  session: REHAB_SESSION,
  confidence: 'high',
};

const OPTION_PATTERN = /option\s*(a\/b|a|b)\b/gi;
const EITHER_OR_PATTERN = /\b(you could|either|or you could|option 1|option 2|if you prefer)\b/gi;
const EMOJI_PATTERN = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
const QUESTION_PATTERN = /\?/g;
const WORSENING_PATTERN = /(worsen|worsening|get(ting)? worse|worse|increasing|persistent)/i;

const isFiniteNumber = (value: number) => Number.isFinite(value);

function normalizePainScore(value: number): number | null {
  if (!isFiniteNumber(value)) return null;
  if (value < 0 || value > 10) return null;
  return value;
}

function extractPainScore(text?: string): number | null {
  if (!text) return null;
  const matches = [...text.matchAll(/(\d{1,2})(?:\s*\/\s*10)?/g)];
  const candidates = matches
    .map((match) => normalizePainScore(Number(match[1])))
    .filter((value): value is number => value !== null);
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function hasWorseningLanguage(text?: string): boolean {
  if (!text) return false;
  return WORSENING_PATTERN.test(text);
}

function aggregateNotes(context?: CoachRequestContext, message?: string): string {
  const notes = [
    message,
    context?.checkIns?.[0]?.note,
    ...(context?.recentMessages ?? []).map((entry) => entry.content),
  ].filter(Boolean);
  return notes.join(' ');
}

export function deriveSafetyFlags(message: string, context?: CoachRequestContext): SafetyFlags {
  const painFromMessage = extractPainScore(message);
  const painFromWorkouts = (context?.workouts ?? [])
    .map((workout) => extractPainScore(workout.pain))
    .filter((value): value is number => value !== null);

  const painScore = [painFromMessage, ...painFromWorkouts]
    .filter((value): value is number => value !== null)
    .reduce((max, value) => (value > max ? value : max), -1);

  const readiness = context?.checkIns?.[0]?.readiness;
  const readinessRed = typeof readiness === 'number' && readiness <= 2;

  const aggregatedNotes = aggregateNotes(context, message);
  const painWorsening = hasWorseningLanguage(aggregatedNotes);

  const normalizedPain = painScore >= 0 ? painScore : null;
  const rehabMode = (normalizedPain !== null && normalizedPain >= 5) || painWorsening;

  return {
    painScore: normalizedPain,
    painWorsening,
    readinessRed,
    rehabMode,
    persistentOrWorsening: painWorsening || /persistent/i.test(aggregatedNotes),
  };
}

function stripOptions(text: string): string {
  return text
    .replace(OPTION_PATTERN, '')
    .replace(EITHER_OR_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripEmojis(text: string): string {
  return text.replace(EMOJI_PATTERN, '').trim();
}

function limitQuestions(text: string, maxQuestions = 2): string {
  let count = 0;
  return text.replace(QUESTION_PATTERN, () => {
    count += 1;
    return count <= maxQuestions ? '?' : '.';
  });
}

function sanitizeText(text: string): string {
  return limitQuestions(stripEmojis(stripOptions(text)));
}

function withMedicalEscalation(response: CoachResponse): CoachResponse {
  if (response.message.includes(MEDICAL_ESCALATION_LINE)) {
    return response;
  }
  return {
    ...response,
    message: `${response.message} ${MEDICAL_ESCALATION_LINE}`.trim(),
  };
}

function withAlert(response: CoachResponse, alert: CoachResponse['alert']): CoachResponse {
  return {
    ...response,
    alert,
  };
}

export function fallbackCoachResponse(safety: SafetyFlags): CoachResponse {
  if (safety.rehabMode) {
    const response = safety.persistentOrWorsening
      ? withMedicalEscalation(REHAB_RESPONSE)
      : REHAB_RESPONSE;
    return withAlert(response, {
      severity: 'warning',
      title: 'Pain Detected',
      details: 'Switching to rehab mode. No running until pain subsides.',
    });
  }

  if (safety.readinessRed) {
    return safety.persistentOrWorsening
      ? withMedicalEscalation(RECOVERY_RESPONSE)
      : RECOVERY_RESPONSE;
  }

  return safety.persistentOrWorsening
    ? withMedicalEscalation(STANDARD_RESPONSE)
    : STANDARD_RESPONSE;
}

export function finalizeCoachResponse(
  response: CoachResponse,
  safety: SafetyFlags
): CoachResponse {
  // Start with sanitized message
  let next: CoachResponse = {
    ...response,
    message: sanitizeText(response.message),
    confidence: response.confidence ?? 'medium',
  };

  // Override with safety-based response if needed
  if (safety.rehabMode) {
    next = fallbackCoachResponse(safety);
  } else if (safety.readinessRed) {
    next = fallbackCoachResponse({ ...safety, rehabMode: false });
  }

  // Add medical escalation if persistent or worsening
  if (safety.persistentOrWorsening) {
    next = withMedicalEscalation(next);
  }

  // Validate against schema
  const result = CoachResponseSchema.safeParse(next);
  return result.success ? result.data : fallbackCoachResponse(safety);
}
