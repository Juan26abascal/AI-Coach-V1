import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openaiClient';
import { requireSessionUser } from '@/lib/auth';
import { buildFileSearchTool, hasFileSearchResults, VECTOR_STORE_ID } from '@/lib/openai';
import {
  buildFullPrompt,
  computeAthleteState,
  deriveSafetyFlags,
  fallbackCoachResponse,
  finalizeCoachResponse,
  formatDecisionGatesForPrompt,
  formatStateForPrompt,
  parseCoachResponse,
  runDecisionGates,
  type ConversationMessage,
} from '@/lib/coach';
import type { CoachResponse } from '@/lib/coach/schema';
import type { CoachBlock, ChatMessage } from '@/types';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientId(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

function buildBlocksFromResponse(response: CoachResponse): CoachBlock[] {
  const blocks: CoachBlock[] = [];

  // Add message block
  if (response.message) {
    blocks.push({
      title: 'Summary',
      bullets: response.message.split('\n').map(line => line.trim()).filter(Boolean),
    });
  }

  // Add session block if present
  if (response.session) {
    const session = response.session;
    const sessionBullets: string[] = [];

    if (session.duration) {
      sessionBullets.push(`Duration: ${session.duration}`);
    }
    if (session.effort) {
      sessionBullets.push(`Effort: ${session.effort}`);
    }
    if (session.warmup) {
      sessionBullets.push(`Warmup: ${session.warmup.duration} - ${session.warmup.description}`);
    }
    if (session.main) {
      sessionBullets.push(`Main: ${session.main.structure}`);
      if (session.main.target) {
        sessionBullets.push(`Target: ${session.main.target}`);
      }
      if (session.main.recovery) {
        sessionBullets.push(`Recovery: ${session.main.recovery}`);
      }
    }
    if (session.cooldown) {
      sessionBullets.push(`Cooldown: ${session.cooldown.duration} - ${session.cooldown.description}`);
    }
    if (session.totalTime) {
      sessionBullets.push(`Total time: ${session.totalTime}`);
    }

    blocks.push({
      title: session.title || 'Workout',
      bullets: sessionBullets,
    });
  }

  // Add alert block if present
  if (response.alert) {
    blocks.push({
      title: response.alert.title,
      bullets: [response.alert.details],
      note: `Severity: ${response.alert.severity}`,
    });
  }

  return blocks;
}

function normalizeConversationHistory(conversationHistory?: ConversationMessage[]) {
  return (conversationHistory ?? []).map((message) => ({
    role: message.role === 'coach' ? 'assistant' : message.role,
    content: message.content,
  }));
}

export async function POST(request: Request) {
  try {
    requireSessionUser();
    const clientId = getClientId(request);
    if (isRateLimited(clientId)) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    // Extract context from the request body (sent by the store)
    const context = body?.context ?? {};
    const athlete = context.athlete ?? null;
    const plan = context.plan ?? null;
    const workouts = Array.isArray(context.workouts) ? context.workouts : [];
    const checkIns = Array.isArray(context.checkIns) ? context.checkIns : [];
    const recentMessages = Array.isArray(context.recentMessages) ? context.recentMessages : [];

    // Convert recentMessages to ConversationMessage format
    const conversationHistory: ConversationMessage[] = recentMessages.map((msg: ChatMessage) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const safety = deriveSafetyFlags(message, {
      athlete,
      plan,
      workouts,
      checkIns,
      recentMessages,
    });

    console.info('coach: computing athlete state');
    const athleteState = computeAthleteState(message, conversationHistory);
    console.info('coach: running decision gates');
    const decisionGates = runDecisionGates(athleteState);
    const stateText = formatStateForPrompt(athleteState);
    const gatesText = formatDecisionGatesForPrompt(decisionGates);
    const fullPrompt = buildFullPrompt(stateText, gatesText);

    try {
      const openai = getOpenAIClient();
      const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY.');
      }

      if (!VECTOR_STORE_ID) {
        console.warn('coach: missing vector store id, skipping file search');
      }

      console.info('coach: requesting OpenAI response');
      const fileSearchTool = buildFileSearchTool();
      const responseStream = await openai.responses.stream({
        model,
        input: [
          { role: 'system', content: fullPrompt },
          ...normalizeConversationHistory(conversationHistory),
          { role: 'user', content: message },
        ],
        tools: fileSearchTool ? [fileSearchTool] : undefined,
        tool_choice: 'auto',
        max_output_tokens: 1000,
      });

      let outputText = '';
      for await (const event of responseStream) {
        if (event.type !== 'response.output_text.delta') continue;
        outputText += event.delta ?? '';
      }

      const finalResponse = await responseStream.finalResponse();
      if (!hasFileSearchResults(finalResponse)) {
        console.info('coach: file search returned no results');
      }

      const parsed = parseCoachResponse(finalResponse.output_text ?? outputText);
      const validated = parsed ? finalizeCoachResponse(parsed, safety) : fallbackCoachResponse(safety);
      const blocks = buildBlocksFromResponse(validated);

      return NextResponse.json({ ...validated, blocks });
    } catch (error) {
      console.error('coach: OpenAI request failed', error);
      const fallback = fallbackCoachResponse(safety);
      const blocks = buildBlocksFromResponse(fallback);
      return NextResponse.json({ ...fallback, blocks }, { status: 200 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Coach response failed.' }, { status: 500 });
  }
}
