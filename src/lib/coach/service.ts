import type { Athlete, TrainingPlan, Workout, CheckIn, ChatMessage } from '@/types';
import { CoachResponseSchema, type CoachResponse, coachResponseJsonSchema } from '@/lib/coach/schema';
import { COACH_SYSTEM_PROMPT, COACH_DEVELOPER_PROMPT } from '@/lib/coach/prompt';
import { getOpenAIClient } from '@/lib/openaiClient';

type CoachRequestContext = {
  athlete?: Athlete | null;
  plan?: TrainingPlan | null;
  workouts?: Workout[];
  checkIns?: CheckIn[];
  recentMessages?: ChatMessage[];
};

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

export async function generateCoachResponse({ message, context }: CoachRequest): Promise<CoachResponse> {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY.');
  }

  if (!vectorStoreId) {
    throw new Error('Missing OPENAI_VECTOR_STORE_ID.');
  }

  const input = [
    { role: 'system' as const, content: COACH_SYSTEM_PROMPT },
    { role: 'developer' as const, content: COACH_DEVELOPER_PROMPT },
    {
      role: 'user' as const,
      content: `User request: ${message}\n\nContext:\n${formatContext(context)}`,
    },
  ];

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
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'coach_response',
        strict: true,
        schema: coachResponseJsonSchema,
      },
    },
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error('OpenAI response was empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw new Error('OpenAI response was not valid JSON.');
  }

  return CoachResponseSchema.parse(parsed);
}
