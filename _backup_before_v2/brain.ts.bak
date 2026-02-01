import { COACH_DEVELOPER_PROMPT, COACH_SYSTEM_PROMPT } from '@/lib/coach/prompt';
import { CoachResponseSchema, type CoachResponse } from '@/lib/coach/schema';

export type ConversationMessage = {
  role: 'user' | 'assistant' | 'coach';
  content: string;
};

export type AthleteState = {
  summary: string;
  signals: {
    painMentioned: boolean;
    fatigueMentioned: boolean;
    confidenceMentioned: boolean;
  };
};

export type DecisionGate = {
  label: string;
  status: 'pass' | 'caution';
  note: string;
};

const PAIN_PATTERN = /\b(pain|injury|hurt|sore|shin|knee|ankle)\b/i;
const FATIGUE_PATTERN = /\b(tired|fatigue|exhausted|drained|sleep)\b/i;
const CONFIDENCE_PATTERN = /\b(confident|confidence|ready|strong)\b/i;

function summarizeHistory(conversationHistory?: ConversationMessage[]): string {
  if (!conversationHistory?.length) return 'No prior messages provided.';
  const recent = conversationHistory.slice(-6).map((message) => `${message.role}: ${message.content}`);
  return recent.join(' | ');
}

export function computeAthleteState(
  message: string,
  conversationHistory?: ConversationMessage[]
): AthleteState {
  const historySummary = summarizeHistory(conversationHistory);
  const combined = [message, historySummary].join(' ');
  return {
    summary: `Latest request: ${message}. Recent chat: ${historySummary}`,
    signals: {
      painMentioned: PAIN_PATTERN.test(combined),
      fatigueMentioned: FATIGUE_PATTERN.test(combined),
      confidenceMentioned: CONFIDENCE_PATTERN.test(combined),
    },
  };
}

export function runDecisionGates(state: AthleteState): DecisionGate[] {
  return [
    {
      label: 'Safety',
      status: state.signals.painMentioned ? 'caution' : 'pass',
      note: state.signals.painMentioned ? 'Pain or injury mentioned.' : 'No pain flags detected.',
    },
    {
      label: 'Recovery',
      status: state.signals.fatigueMentioned ? 'caution' : 'pass',
      note: state.signals.fatigueMentioned
        ? 'Fatigue or sleep issues mentioned.'
        : 'No fatigue flags detected.',
    },
    {
      label: 'Confidence',
      status: state.signals.confidenceMentioned ? 'pass' : 'caution',
      note: state.signals.confidenceMentioned
        ? 'Positive readiness signals detected.'
        : 'No explicit confidence signals detected.',
    },
  ];
}

export function formatStateForPrompt(state: AthleteState): string {
  return [
    `Summary: ${state.summary}`,
    `Signals: pain=${state.signals.painMentioned ? 'yes' : 'no'}, fatigue=${
      state.signals.fatigueMentioned ? 'yes' : 'no'
    }, confidence=${state.signals.confidenceMentioned ? 'yes' : 'no'}`,
  ].join('\n');
}

export function formatDecisionGatesForPrompt(gates: DecisionGate[]): string {
  return gates.map((gate) => `${gate.label}: ${gate.status.toUpperCase()} — ${gate.note}`).join('\n');
}

export function buildFullPrompt(stateText: string, gatesText: string): string {
  return [
    COACH_SYSTEM_PROMPT,
    '',
    'ATHLETE STATE',
    stateText,
    '',
    'DECISION GATES',
    gatesText,
    '',
    COACH_DEVELOPER_PROMPT,
  ].join('\n');
}

export function parseCoachResponse(outputText: string | null): CoachResponse | null {
  if (!outputText) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    return null;
  }

  const result = CoachResponseSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
