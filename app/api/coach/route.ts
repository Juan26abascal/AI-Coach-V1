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

function toChatMessages(conversationHistory?: ConversationMessage[]): ChatMessage[] {
  if (!conversationHistory?.length) return [];
  return conversationHistory.map((message, index) => ({
    id: `history-${index}`,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
    timestamp: new Date().toISOString(),
  }));
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
    const conversationHistory = Array.isArray(body?.conversationHistory)
      ? (body.conversationHistory as ConversationMessage[])
      : undefined;

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const safety = deriveSafetyFlags(message, {
      recentMessages: toChatMessages(conversationHistory),
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
        max_tokens: 1000,
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
      const blocks = buildBlocks(
        validated.summary,
        validated.prescription,
        validated.integrationNote
      );

      return NextResponse.json({ ...validated, blocks });
    } catch (error) {
      console.error('coach: OpenAI request failed', error);
      const fallback = fallbackCoachResponse(safety);
      const blocks = buildBlocks(fallback.summary, fallback.prescription, fallback.integrationNote);
      return NextResponse.json({ ...fallback, blocks }, { status: 200 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Coach response failed.' }, { status: 500 });
  }
}
