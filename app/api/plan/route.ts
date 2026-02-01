import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { savePlan, updatePlan } from '@/lib/db';
import type { TrainingPlan } from '@/types';

export async function POST(request: Request) {
  try {
    const user = requireSessionUser();
    const body = (await request.json()) as TrainingPlan;
    const plan = await savePlan(user.id, {
      weekOf: body.weekOf,
      lastUpdated: body.lastUpdated ?? new Date().toISOString(),
      days: body.days,
      nextSession: body.nextSession,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = requireSessionUser();
    const body = (await request.json()) as TrainingPlan;
    const plan = await updatePlan(user.id, body);
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
