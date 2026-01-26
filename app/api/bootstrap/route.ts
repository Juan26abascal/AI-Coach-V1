import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getBootstrapData } from '@/lib/db';

export async function GET() {
  try {
    const user = requireSessionUser();
    const data = await getBootstrapData(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
