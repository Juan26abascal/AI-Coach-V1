import type { Athlete, TrainingPlan, Workout, CheckIn, ChatMessage } from '@/types';
import { CoachResponseSchema, type CoachResponse, coachResponseJsonSchema } from '@/lib/coach/schema';
import { COACH_SYSTEM_PROMPT, COACH_DEVELOPER_PROMPT } from '@/lib/coach/prompt';
import { getOpenAIClient } from '@/lib/openaiClient';
import {
  deriveSafetyFlags,
  fallbackCoachResponse,
  finalizeCoachResponse,
  type CoachRequestContext,
} from '@/lib/coach/guardrails';

type CoachRequest = {
  message: string;
  context?: CoachRequestContext;
};

function formatContext(context?: CoachRequestContext): string {
  if (!context) return 'No additional context provided.';

  const { athlete, plan, workouts, checkIns, recentMessages } = context;

  const lines: string[] = [];

  if (athlete) {
    lines.push(`Athlete: ${athlete.name}. Goal: ${athlete.goal}. Days/week: ${athlete.daysPerWeek}. PR5K: ${athlete.pr5k ?? 'n/a'}. PR10K: ${athlete.pr10k ?? 'n/a'}. Injury history: ${athlete.injuryHistory}. Availability: ${athlete.availabilityNotes ?? 'n/a'}.`);
  }

  if (plan) {
    lines.push(`Plan week of ${plan.weekOf}. Next session: ${plan.nextSession?.title ?? 'n/a'} - ${plan.nextSession?.details ?? ''}.`);
  }

  if (workouts?.length) {
    const recent = workouts.slice(0, 5).map((workout) => `${workout.date}: ${workout.title} (${workout.durationMinutes} min, ${workout.effort}). Notes: ${workout.notes ?? 'n/a'}. Pain: ${workout.pain ?? 'n/a'}.`);
    lines.push(`Recent workouts: ${recent.join(' | ')}`);
  }

  if (checkIns?.length) {
    const latest = checkIns[0];
    lines.push(`Latest check-in: readiness ${latest.readiness}/5, soreness ${latest.soreness}/5, sleep ${latest.sleep}/5, motivation ${latest.motivation}/5. Note: ${latest.note ?? 'n/a'}.`);
  }

  if (recentMessages?.length) {
    const recent = recentMessages.slice(-6).map((message) => `${message.role}: ${message.content}`);
    lines.push(`Recent chat: ${recent.join(' | ')}`);
  }

  return lines.length ? lines.join('\n') : 'No additional context provided.';
}

async function requestCoachModelResponse(
  input: Array<{ role: 'system' | 'developer' | 'user'; content: string }>
): Promise<string | null> {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY.');
  }

  if (!vectorStoreId) {
    throw new Error('Missing OPENAI_VECTOR_STORE_ID.');
  }

  const response = await openai.responses.create({
    model,
    input,
    tools: [
      {
        type: 'file_search',
        vector_store_ids: [vectorStoreId],
        max_num_results: 4,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'coach_response',
        strict: true,
        schema: coachResponseJsonSchema,
      },
    },
  } as Parameters<typeof openai.responses.create>[0]);

  return (response as { output_text?: string }).output_text ?? null;
}

function parseCoachResponse(outputText: string | null): CoachResponse | null {
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

export async function generateCoachResponse({ message, context }: CoachRequest): Promise<CoachResponse> {
  const safety = deriveSafetyFlags(message, context);

  const input = [
    { role: 'system' as const, content: COACH_SYSTEM_PROMPT },
    { role: 'developer' as const, content: COACH_DEVELOPER_PROMPT },
    {
      role: 'user' as const,
      content: `User request: ${message}\n\nContext:\n${formatContext(context)}`,
    },
  ];

  const firstOutput = await requestCoachModelResponse(input);
  let parsed = parseCoachResponse(firstOutput);

  if (!parsed) {
    const retryOutput = await requestCoachModelResponse([
      ...input,
      {
        role: 'user',
        content:
          'Fix to schema: the previous response did not match the JSON schema. Return ONLY a JSON object that matches the schema exactly.',
      },
    ]);
    parsed = parseCoachResponse(retryOutput);
  }

  if (!parsed) {
    return fallbackCoachResponse(safety);
  }

  return finalizeCoachResponse(parsed, safety);
}
