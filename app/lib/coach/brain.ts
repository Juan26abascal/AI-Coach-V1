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
    anxietyMentioned: boolean;
    frustrationMentioned: boolean;
    demotivationMentioned: boolean;
  };
};

export type DecisionGate = {
  label: string;
  status: 'pass' | 'caution' | 'triggered';
  note: string;
};

// Enhanced pattern detection
const PAIN_PATTERN = /\b(pain|injury|hurt|sore|shin|knee|ankle|hip|hamstring|calf|achilles|plantar|it band|iliotibial)\b/i;
const FATIGUE_PATTERN = /\b(tired|fatigue|exhausted|drained|sleep|worn out|beat|wiped)\b/i;
const CONFIDENCE_PATTERN = /\b(confident|confidence|ready|strong|great|amazing|powerful)\b/i;
const ANXIETY_PATTERN = /\b(not ready|worried|nervous|stressed|anxious|scared|fear|doubt|uncertain)\b/i;
const FRUSTRATION_PATTERN = /\b(terrible|couldn't hit|not working|frustrated|angry|annoyed|stuck|failing)\b/i;
const DEMOTIVATION_PATTERN = /\b(not feeling it|grind|losing motivation|unmotivated|don't want to|can't be bothered|low energy|burned out)\b/i;

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
      anxietyMentioned: ANXIETY_PATTERN.test(combined),
      frustrationMentioned: FRUSTRATION_PATTERN.test(combined),
      demotivationMentioned: DEMOTIVATION_PATTERN.test(combined),
    },
  };
}

export function runDecisionGates(state: AthleteState): DecisionGate[] {
  return [
    {
      label: 'Safety',
      status: state.signals.painMentioned ? 'triggered' : 'pass',
      note: state.signals.painMentioned ? 'Pain or injury mentioned - assess before prescribing.' : 'No pain flags detected.',
    },
    {
      label: 'Recovery',
      status: state.signals.fatigueMentioned ? 'caution' : 'pass',
      note: state.signals.fatigueMentioned
        ? 'Fatigue or sleep issues mentioned - consider reducing load.'
        : 'No fatigue flags detected.',
    },
    {
      label: 'Emotional',
      status: (state.signals.anxietyMentioned || state.signals.frustrationMentioned || state.signals.demotivationMentioned) ? 'caution' : 'pass',
      note: state.signals.anxietyMentioned
        ? 'Anxiety detected - address before prescription.'
        : state.signals.frustrationMentioned
        ? 'Frustration detected - acknowledge and contextualize.'
        : state.signals.demotivationMentioned
        ? 'Low motivation detected - simplify and remove pressure.'
        : 'No emotional flags detected.',
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
  const signals = state.signals;
  const flags = [
    signals.painMentioned && 'PAIN',
    signals.fatigueMentioned && 'FATIGUE',
    signals.anxietyMentioned && 'ANXIETY',
    signals.frustrationMentioned && 'FRUSTRATION',
    signals.demotivationMentioned && 'DEMOTIVATION',
    signals.confidenceMentioned && 'CONFIDENT',
  ].filter(Boolean);

  return [
    `Summary: ${state.summary}`,
    `Active signals: ${flags.length > 0 ? flags.join(', ') : 'None'}`,
  ].join('\n');
}

export function formatDecisionGatesForPrompt(gates: DecisionGate[]): string {
  const triggered = gates.filter(g => g.status === 'triggered' || g.status === 'caution');
  if (triggered.length === 0) return '';

  return triggered.map((gate) => `${gate.label}: ${gate.status.toUpperCase()} — ${gate.note}`).join('\n');
}

export function buildFullPrompt(stateText: string, gatesText: string): string {
  const sections = [
    COACH_SYSTEM_PROMPT,
    '',
    '=== ATHLETE STATE ===',
    stateText,
    '=== END STATE ===',
  ];

  if (gatesText && gatesText.trim()) {
    sections.push('');
    sections.push('=== DECISION GATES (TRIGGERED) ===');
    sections.push(gatesText);
    sections.push('=== END GATES ===');
  }

  sections.push('');
  sections.push(COACH_DEVELOPER_PROMPT);

  return sections.join('\n');
}

/**
 * Extract JSON from potentially messy AI response
 */
function extractJSON(text: string): unknown | null {
  // First, try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue to other methods
  }

  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to fix common issues
      let fixed = jsonMatch[0];

      // Fix trailing commas
      fixed = fixed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

      try {
        return JSON.parse(fixed);
      } catch {
        // Give up
      }
    }
  }

  return null;
}

/**
 * Remove emojis from text
 */
function stripEmojis(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '').trim();
}

/**
 * Strip option language patterns
 */
function stripOptions(text: string): string {
  return text
    .replace(/option\s*(a\/b|a|b)\b/gi, '')
    .replace(/\b(you could|either|or you could|option 1|option 2|if you prefer)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseCoachResponse(outputText: string | null): CoachResponse | null {
  if (!outputText) return null;

  const parsed = extractJSON(outputText);

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;

    // Sanitize message if present
    if (typeof obj.message === 'string') {
      obj.message = stripOptions(stripEmojis(obj.message));
    }

    // Try to validate with schema
    const result = CoachResponseSchema.safeParse(obj);
    if (result.success) {
      return result.data;
    }

    // If has message field, return partial response
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return {
        message: obj.message,
        confidence: 'low',
      };
    }

    // Check for legacy format (summary field)
    if (typeof obj.summary === 'string' && obj.summary.trim()) {
      return {
        message: stripOptions(stripEmojis(obj.summary as string)),
        confidence: 'low',
      };
    }
  }

  // Last resort: use raw text as message
  const cleanText = stripOptions(stripEmojis(outputText)).trim();
  if (cleanText) {
    return {
      message: cleanText,
      confidence: 'low',
    };
  }

  return null;
}
