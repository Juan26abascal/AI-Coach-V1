import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openaiClient';
import { requireSessionUser } from '@/lib/auth';
import { buildFileSearchTool, hasFileSearchResults, VECTOR_STORE_ID } from '@/lib/openai';
import {
  buildFullPrompt,
  computeAthleteState,
  formatGateResultsForPrompt,
  formatStateForPrompt,
  parseCoachResponse,
  runDecisionGates,
  type ConversationMessage,
  type CoachResponse,
} from '@/lib/coach';

// CoachBlock type for structured output
type CoachBlock = {
  title: string;
  bullets: string[];
};

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

function buildBlocks(response: CoachResponse): CoachBlock[] {
  const blocks: CoachBlock[] = [];
  
  // Main message block
  if (response.message) {
    blocks.push({
      title: 'Coach',
      bullets: [response.message],
    });
  }
  
  // Session block if present
  if (response.session) {
    const sessionBullets: string[] = [];
    sessionBullets.push(`Type: ${response.session.type}`);
    sessionBullets.push(`Title: ${response.session.title}`);
    if (response.session.duration) sessionBullets.push(`Duration: ${response.session.duration}`);
    if (response.session.effort) sessionBullets.push(`Effort: ${response.session.effort}`);
    if (response.session.totalTime) sessionBullets.push(`Total Time: ${response.session.totalTime}`);
    
    blocks.push({
      title: 'Workout',
      bullets: sessionBullets,
    });
  }
  
  // Alert block if present
  if (response.alert) {
    blocks.push({
      title: response.alert.title,
      bullets: [response.alert.details],
    });
  }
  
  return blocks;
}

// Fallback response when things go wrong
function fallbackCoachResponse(): CoachResponse {
  return {
    message: "I'm having trouble processing that right now. Could you try rephrasing your question?",
    confidence: 'low',
  };
}

function normalizeConversationHistory(conversationHistory?: ConversationMessage[]) {
  return (conversationHistory ?? []).map((message) => ({
    role: message.role === 'user' ? 'user' as const : 'assistant' as const,
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

    console.info('coach: computing athlete state');
    
    // Compute athlete state with proper input
    const stateInput = {
      workouts: [],
      checkIns: [],
      profile: undefined,
      goalDate: undefined,
      scheduledToday: undefined,
    };
    const athleteState = computeAthleteState(stateInput);
    
    console.info('coach: running decision gates');
    const gateContext = {
      state: athleteState,
      userMessage: message,
      requestedSession: undefined,
      timeAvailable: undefined,
    };
    const decisionGates = runDecisionGates(gateContext);
    
    const stateText = formatStateForPrompt(athleteState);
    const gatesText = formatGateResultsForPrompt(decisionGates);
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

      const responseText = finalResponse.output_text ?? outputText;
      const parseResult = parseCoachResponse(responseText);
      
      let validated: CoachResponse;
      if (parseResult.success && parseResult.data) {
        validated = parseResult.data;
      } else {
        // If parsing failed, use raw text as message
        validated = {
          message: responseText,
          confidence: 'low',
        };
      }
      
      const blocks = buildBlocks(validated);

      return NextResponse.json({ ...validated, blocks });
    } catch (error) {
      console.error('coach: OpenAI request failed', error);
      const fallback = fallbackCoachResponse();
      const blocks = buildBlocks(fallback);
      return NextResponse.json({ ...fallback, blocks }, { status: 200 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Coach response failed.' }, { status: 500 });
  }
}