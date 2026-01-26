import { NextResponse } from 'next/server';
import { CoachResponseSchema, coachResponseJsonSchema, type CoachResponse } from '@/lib/coach/schema';
import { getOpenAIClient } from '@/lib/openaiClient';
import { COACH_DEVELOPER_PROMPT, COACH_SYSTEM_PROMPT } from '@/lib/coach/prompt';
import {
  deriveSafetyFlags,
  fallbackCoachResponse,
  finalizeCoachResponse,
  type CoachRequestContext,
} from '@/lib/coach/guardrails';
import type { CoachBlock } from '@/types';
import { requireSessionUser } from '@/lib/auth';

function buildBlocks(summary: string, prescription: string, integrationNote: string): CoachBlock[] {
  const normalizeBullets = (value: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  return [
    {
      title: 'Summary',
      bullets: normalizeBullets(summary),
    },
    {
      title: 'Prescription',
      bullets: normalizeBullets(prescription),
    },
    {
      title: 'Integration Note',
      bullets: normalizeBullets(integrationNote),
    },
  ];
}

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

type SummaryStreamState = {
  keyIndex: number;
  foundKey: boolean;
  seenColon: boolean;
  inString: boolean;
  escaped: boolean;
  done: boolean;
};

const SUMMARY_KEY = '"summary"';

function decodeEscapedChar(char: string): string {
  switch (char) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    case 'r':
      return '\r';
    case '"':
      return '"';
    case '\\':
      return '\\';
    default:
      return char;
  }
}

function extractSummaryDelta(state: SummaryStreamState, delta: string): string {
  let output = '';

  for (const char of delta) {
    if (state.done) break;

    if (!state.foundKey) {
      if (char === SUMMARY_KEY[state.keyIndex]) {
        state.keyIndex += 1;
        if (state.keyIndex === SUMMARY_KEY.length) {
          state.foundKey = true;
        }
      } else {
        state.keyIndex = char === SUMMARY_KEY[0] ? 1 : 0;
      }
      continue;
    }

    if (!state.seenColon) {
      if (char === ':') {
        state.seenColon = true;
      }
      continue;
    }

    if (!state.inString) {
      if (char === '"') {
        state.inString = true;
      }
      continue;
    }

    if (state.escaped) {
      output += decodeEscapedChar(char);
      state.escaped = false;
      continue;
    }

    if (char === '\\') {
      state.escaped = true;
      continue;
    }

    if (char === '"') {
      state.done = true;
      state.inString = false;
      continue;
    }

    output += char;
  }

  return output;
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

export async function POST(request: Request) {
  try {
    requireSessionUser();
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const safety = deriveSafetyFlags(message, body?.context);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const summaryState: SummaryStreamState = {
          keyIndex: 0,
          foundKey: false,
          seenColon: false,
          inString: false,
          escaped: false,
          done: false,
        };
        let fullText = '';

        try {
          const openai = getOpenAIClient();
          const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
          const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

          if (!process.env.OPENAI_API_KEY) {
            throw new Error('Missing OPENAI_API_KEY.');
          }

          if (!vectorStoreId) {
            throw new Error('Missing OPENAI_VECTOR_STORE_ID.');
          }

          const response = await openai.responses.stream({
            model,
            input: [
              { role: 'system', content: COACH_SYSTEM_PROMPT },
              { role: 'developer', content: COACH_DEVELOPER_PROMPT },
              {
                role: 'user',
                content: `User request: ${message}\n\nContext:\n${formatContext(body?.context)}`,
              },
            ],
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

          for await (const event of response) {
            if (event.type !== 'response.output_text.delta') continue;
            const delta = event.delta ?? '';
            fullText += delta;
            const summaryDelta = extractSummaryDelta(summaryState, delta);
            if (summaryDelta) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'delta', text: summaryDelta }) + '\n')
              );
            }
          }

          const finalResponse = await response.finalResponse();
          const outputText = finalResponse.output_text ?? fullText;
          const parsed = parseCoachResponse(outputText);
          const validated = parsed ? finalizeCoachResponse(parsed, safety) : fallbackCoachResponse(safety);
          const blocks = buildBlocks(
            validated.summary,
            validated.prescription,
            validated.integrationNote
          );

          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'final', data: { ...validated, blocks } }) + '\n')
          );
        } catch (error) {
          const fallback = fallbackCoachResponse(safety);
          const blocks = buildBlocks(
            fallback.summary,
            fallback.prescription,
            fallback.integrationNote
          );
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'final', data: { ...fallback, blocks } }) + '\n')
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Coach response failed.' }, { status: 500 });
  }
}
