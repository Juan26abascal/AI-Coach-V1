import type { Athlete, TrainingPlan, Workout, CheckIn, ChatMessage } from '@/types';
import { CoachResponseSchema, type CoachResponse } from '@/lib/coach/schema';

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

const STANDARD_PRESCRIPTION =
  '35 min easy run, then 4 x 20s strides, 60s rest between strides.';

const RECOVERY_PRESCRIPTION =
  '25 min easy walk, then 2 x 6 diaphragmatic breaths, 60s rest, then 2 x 8 glute bridges, 60s rest.';

const REHAB_PRESCRIPTION =
  '20 min easy walk, then 2 x 8 glute bridges, 60s rest, then 2 x 8 calf raises, 60s rest.';

const STANDARD_RESPONSE: CoachResponse = {
  summary: 'Here is a concise session aligned to your current plan focus.',
  prescription: STANDARD_PRESCRIPTION,
  integrationNote: 'Log RPE and any pain score tonight to calibrate the next session.',
};

const RECOVERY_RESPONSE: CoachResponse = {
  summary: 'Readiness is red, so today is recovery and prehab only.',
  prescription: RECOVERY_PRESCRIPTION,
  integrationNote: 'Keep it gentle and note how you feel within two hours post-session.',
};

const REHAB_RESPONSE: CoachResponse = {
  summary: 'Rehab mode today to protect the issue and keep load light.',
  prescription: REHAB_PRESCRIPTION,
  integrationNote: 'Stop if pain increases and reassess before the next run.',
};

const OPTION_PATTERN = /option\s*(a\/b|a|b)\b/gi;
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
  return text.replace(OPTION_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
}

function limitQuestions(text: string, maxQuestions = 2): string {
  let count = 0;
  return text.replace(QUESTION_PATTERN, () => {
    count += 1;
    return count <= maxQuestions ? '?' : '.';
  });
}

function sanitizeText(text: string): string {
  return limitQuestions(stripOptions(text));
}

function hasStructuredPrescription(prescription: string): boolean {
  const hasSets = /\b\d+\s*x\s*\d+\b/i.test(prescription);
  const hasRest = /\brest\b/i.test(prescription);
  return hasSets && hasRest;
}

function withMedicalEscalation(response: CoachResponse): CoachResponse {
  if (response.integrationNote.includes(MEDICAL_ESCALATION_LINE)) {
    return response;
  }
  return {
    ...response,
    integrationNote: `${response.integrationNote} ${MEDICAL_ESCALATION_LINE}`.trim(),
  };
}

function ensurePrescriptionStructure(
  response: CoachResponse,
  safety: SafetyFlags
): CoachResponse {
  if (hasStructuredPrescription(response.prescription)) {
    return response;
  }

  if (safety.rehabMode) {
    return { ...response, prescription: REHAB_PRESCRIPTION };
  }

  if (safety.readinessRed) {
    return { ...response, prescription: RECOVERY_PRESCRIPTION };
  }

  return { ...response, prescription: STANDARD_PRESCRIPTION };
}

export function fallbackCoachResponse(safety: SafetyFlags): CoachResponse {
  if (safety.rehabMode) {
    return safety.persistentOrWorsening ? withMedicalEscalation(REHAB_RESPONSE) : REHAB_RESPONSE;
  }
  if (safety.readinessRed) {
    return safety.persistentOrWorsening ? withMedicalEscalation(RECOVERY_RESPONSE) : RECOVERY_RESPONSE;
  }
  return safety.persistentOrWorsening ? withMedicalEscalation(STANDARD_RESPONSE) : STANDARD_RESPONSE;
}

export function finalizeCoachResponse(
  response: CoachResponse,
  safety: SafetyFlags
): CoachResponse {
  let next = {
    summary: sanitizeText(response.summary),
    prescription: sanitizeText(response.prescription),
    integrationNote: sanitizeText(response.integrationNote),
  };

  if (safety.rehabMode) {
    next = fallbackCoachResponse(safety);
  } else if (safety.readinessRed) {
    next = fallbackCoachResponse({ ...safety, rehabMode: false });
  }

  if (safety.persistentOrWorsening) {
    next = withMedicalEscalation(next);
  }

  next = ensurePrescriptionStructure(next, safety);

  return CoachResponseSchema.parse(next);
}
