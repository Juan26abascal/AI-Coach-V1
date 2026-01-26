import { NextResponse } from 'next/server';
import { generateCoachResponse } from '@/lib/coach/service';
import { CoachResponseSchema } from '@/lib/coach/schema';
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

export async function POST(request: Request) {
  try {
    requireSessionUser();
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const response = await generateCoachResponse({
      message,
      context: body?.context,
    });

    const validated = CoachResponseSchema.parse(response);

    return NextResponse.json({
      ...validated,
      blocks: buildBlocks(validated.summary, validated.prescription, validated.integrationNote),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Coach response failed.' }, { status: 500 });
  }
}
