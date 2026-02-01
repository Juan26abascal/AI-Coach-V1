import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { addMessage } from '@/lib/db';
import type { ChatMessage } from '@/types';

export async function POST(request: Request) {
  try {
    const user = requireSessionUser();
    const body = (await request.json()) as ChatMessage;
    const message = await addMessage(user.id, {
      role: body.role,
      content: body.content,
      blocks: body.blocks,
      timestamp: body.timestamp,
    });
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
