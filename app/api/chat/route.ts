import { NextResponse } from 'next/server';
import { getChatLimits, getModel, getOpenAIClient, getVectorStoreId } from '@/lib/openai';

export const runtime = 'nodejs';

type HistoryItem = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ChatRequest = {
  message: string;
  history?: HistoryItem[];
};

const SYSTEM_INSTRUCTIONS = `You are an elite running coach. You are calm, direct, and safety-first.

Goals:
- Help the runner train consistently and safely.
- Prefer the simplest effective advice.
- When the user mentions pain/injury symptoms, prioritize caution and suggest professional help when appropriate.

Style:
- Keep responses concise.
- Use bullets when helpful.
- Avoid medical diagnosis.

When relevant, ask at most ONE follow-up question.`;

// --- Simple in-memory rate limit (good enough for MVP on a single server).
// If deployed serverless with multiple instances, replace with Redis/Upstash.
const buckets = new Map<string, { start: number; count: number }>();

function getClientId(req: Request) {
  // Prefer x-forwarded-for when behind a proxy.
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
  if (b.count >= max) return { ok: false, remaining: 0, resetMs: windowMs - (now - b.start) };
  b.count += 1;
  return { ok: true, remaining: max - b.count, resetMs: windowMs - (now - b.start) };
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}

export async function POST(req: Request) {
  const clientId = getClientId(req);
  const rl = rateLimitOk(clientId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rl.resetMs / 1000)),
        },
      }
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { maxChars } = getChatLimits();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return badRequest('"message" is required.');
  if (message.length > maxChars) {
    return badRequest(`Message too long (max ${maxChars} chars).`);
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const safeHistory = history
    .filter(
      (h): h is HistoryItem =>
        !!h &&
        (h.role === 'user' || h.role === 'assistant' || h.role === 'system') &&
        typeof h.content === 'string'
    )
    .slice(-12) // keep prompt small + cheap
    .map((h) => ({ role: h.role, content: h.content.slice(0, maxChars) }));

  try {
    const openai = getOpenAIClient();
    const vectorStoreId = getVectorStoreId();

    const input = [
      ...safeHistory,
      { role: 'user' as const, content: message },
    ];

    const response = await openai.responses.create({
      model: getModel(),
      instructions: SYSTEM_INSTRUCTIONS,
      input,
      // Managed retrieval from your existing Vector Store
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vectorStoreId],
        },
      ],
      temperature: 0.4,
    });

    const text = response.output_text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: 'No response text returned from model.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        reply: text,
        meta: {
          model: getModel(),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    // Avoid leaking secrets; return a stable, user-safe error.
    const status = typeof err?.status === 'number' ? err.status : 500;
    const code = err?.code || err?.name;

    return NextResponse.json(
      {
        error: 'Chat service failed. Please retry in a moment.',
        debug: process.env.NODE_ENV === 'development' ? { code, status } : undefined,
      },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, usage: 'POST { message: string, history?: {role, content}[] }' },
    { status: 200 }
  );
}
