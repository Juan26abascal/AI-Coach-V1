import { NextResponse } from 'next/server';
import { generateCoachResponse } from '@/lib/coach/service';
import type { CoachBlock } from '@/types';

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
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const response = await generateCoachResponse({
      message,
      context: body?.context,
    });

    return NextResponse.json({
      ...response,
      blocks: buildBlocks(response.summary, response.prescription, response.integrationNote),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Coach response failed.' }, { status: 500 });
  }
}
