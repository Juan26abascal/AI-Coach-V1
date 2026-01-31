import { NextResponse } from 'next/server';
import { getModel, getOpenAIClient, getVectorStoreId, getChatLimits } from '@/lib/openai';
import { computeAthleteState, formatStateForPrompt } from '@/lib/coach/state-engine';
import { runDecisionGates, formatGateResultsForPrompt } from '@/lib/coach/decision-engine';
import { SYSTEM_PROMPT, buildFullPrompt } from '@/lib/coach/system-prompt';
import { parseCoachResponse, sanitizeResponse } from '@/lib/coach/response-parser';
import type { ConversationMessage, CoachResponse } from '@/lib/coach/types';

export const runtime = 'nodejs';

// Request types
type ChatRequest = {
  message: string;
  conversationHistory?: ConversationMessage[];
};

// --- Simple in-memory rate limit ---
const buckets = new Map<string, { start: number; count: number }>();

function getClientId(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'local';
}

function rateLimitOk(clientId: string) {
  const { windowMs, max } = getChatLimits();
  const now = Date.now();
  const b = buckets.get(clientId);
  if (!b || now - b.start > windowMs) {
    buckets.set(clientId, { start: now, count: 1 });
    return { ok: true, remaining: max - 1, resetMs: windowMs };
  }
  if (b.count >= max) {
    return { ok: false, remaining: 0, resetMs: windowMs - (now - b.start) };
  }
  b.count += 1;
  return { ok: true, remaining: max - b.count, resetMs: windowMs - (now - b.start) };
}

function errorResponse(message: string, status: number = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(req: Request) {
  // Rate limiting
  const clientId = getClientId(req);
  const rl = rateLimitOk(clientId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  // Parse request body
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return errorResponse('Invalid JSON body.');
  }

  // Validate message
  const { maxChars } = getChatLimits();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return errorResponse('"message" is required.');
  }
  if (message.length > maxChars) {
    return errorResponse(`Message too long (max ${maxChars} chars).`);
  }

  // Process conversation history
  const history = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
  const recentHistory = history.slice(-10); // Keep last 10 messages

  try {
    // ============================================
    // COACH BRAIN PROCESSING
    // ============================================

    // Step 1: Compute athlete state
    let athleteState;
    let stateString = '';
    try {
      athleteState = computeAthleteState();
      stateString = formatStateForPrompt(athleteState);
    } catch (stateError) {
      console.warn('Could not compute athlete state:', stateError);
      stateString = '=== ATHLETE STATE ===\nNo athlete data available.\n=== END STATE ===';
    }

    // Step 2: Run decision gates
    let gateResults;
    let gateString = '';
    try {
      if (athleteState) {
        gateResults = runDecisionGates(athleteState);
        gateString = formatGateResultsForPrompt(gateResults);
      }
    } catch (gateError) {
      console.warn('Could not run decision gates:', gateError);
    }

    // Step 3: Build the full prompt
    const conversationString = recentHistory
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');

    const fullPrompt = buildFullPrompt(stateString, gateString, conversationString);

    // Step 4: Call OpenAI
    const openai = getOpenAIClient();
    const vectorStoreId = getVectorStoreId();

    console.log('Calling OpenAI with coach brain...');

    const response = await openai.responses.create({
      model: getModel(),
      instructions: fullPrompt,
      input: [{ role: 'user' as const, content: message }],
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vectorStoreId],
        },
      ],
      temperature: 0.4,
    });

    // Step 5: Extract and parse response
    const rawText = response.output_text?.trim();
    
    if (!rawText) {
      return NextResponse.json(
        { 
          error: 'No response from coach.',
          fallback: {
            message: "I couldn't process that request. Could you try again?",
            confidence: 'low' as const
          }
        },
        { status: 502 }
      );
    }

    console.log('Raw coach response:', rawText.substring(0, 200) + '...');

    // Step 6: Parse the response into structured format
    let parsedResponse: CoachResponse;
    try {
      parsedResponse = parseCoachResponse(rawText);
      parsedResponse = sanitizeResponse(parsedResponse);
    } catch (parseError) {
      console.warn('Response parsing failed, using raw text:', parseError);
      parsedResponse = {
        message: rawText,
        confidence: 'low'
      };
    }

    // Step 7: Return the structured response
    return NextResponse.json(parsedResponse, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (err: unknown) {
    console.error('Chat API error:', err);
    
    // Type-safe error handling
    const error = err as { status?: number; code?: string; name?: string; message?: string };
    const status = typeof error.status === 'number' ? error.status : 500;
    const code = error.code || error.name || 'unknown';

    // Return a fallback response so the UI doesn't completely break
    const fallbackResponse: CoachResponse = {
      message: "I'm having trouble connecting right now. Please try again in a moment.",
      confidence: 'low'
    };

    return NextResponse.json(
      {
        ...fallbackResponse,
        error: 'Chat service temporarily unavailable.',
        debug: process.env.NODE_ENV === 'development' ? { code, status, message: error.message } : undefined,
      },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      ok: true, 
      version: '2.0',
      usage: 'POST { message: string, conversationHistory?: ConversationMessage[] }',
      description: 'AI Running Coach with structured responses'
    },
    { status: 200 }
  );
}