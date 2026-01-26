import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getAthlete, upsertAthlete } from '@/lib/db';
import type { Athlete } from '@/types';

export async function GET() {
  try {
    const user = requireSessionUser();
    const athlete = await getAthlete(user.id);
    return NextResponse.json({ athlete });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = requireSessionUser();
    const body = (await request.json()) as Athlete;
    const updated = await upsertAthlete(user.id, {
      name: body.name,
      goal: body.goal,
      daysPerWeek: Number(body.daysPerWeek) || 1,
      pr5k: body.pr5k,
      pr10k: body.pr10k,
      injuryHistory: body.injuryHistory,
      availabilityNotes: body.availabilityNotes,
    });
    return NextResponse.json({ athlete: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
