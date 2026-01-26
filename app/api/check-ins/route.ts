import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { addCheckIn } from '@/lib/db';
import type { CheckIn } from '@/types';

export async function POST(request: Request) {
  try {
    const user = requireSessionUser();
    const body = (await request.json()) as CheckIn;
    const checkIn = await addCheckIn(user.id, {
      readiness: Number(body.readiness),
      soreness: Number(body.soreness),
      sleep: Number(body.sleep),
      motivation: Number(body.motivation),
      note: body.note,
      createdAt: body.createdAt,
    });
    return NextResponse.json({ checkIn });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
