import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user });
}
