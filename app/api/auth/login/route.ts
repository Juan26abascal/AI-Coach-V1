import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const user = {
    id: email,
    email,
    name: name || 'Athlete',
  };

  cookies().set(AUTH_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  return NextResponse.json({ user });
}
