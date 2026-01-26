import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { addWorkout } from '@/lib/db';
import type { Workout } from '@/types';

export async function POST(request: Request) {
  try {
    const user = requireSessionUser();
    const body = (await request.json()) as Workout;
    const workout = await addWorkout(user.id, {
      date: body.date,
      title: body.title,
      durationMinutes: Number(body.durationMinutes),
      effort: body.effort,
      notes: body.notes,
      pain: body.pain,
    });
    return NextResponse.json({ workout });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
