import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { addMessage, clearConversation, savePlan, upsertAthlete } from '@/lib/db';
import { generateStarterPlan, generateWelcomeMessages } from '@/lib/demo';
import type { Athlete } from '@/types';

type OnboardingPayload = Omit<Athlete, 'id'>;

export async function POST(request: Request) {
  try {
    const user = requireSessionUser();
    const body = (await request.json()) as OnboardingPayload;
    const athlete = await upsertAthlete(user.id, {
      name: body.name,
      goal: body.goal,
      daysPerWeek: Number(body.daysPerWeek),
      pr5k: body.pr5k,
      pr10k: body.pr10k,
      injuryHistory: body.injuryHistory,
      availabilityNotes: body.availabilityNotes,
    });

    const starterPlan = generateStarterPlan(athlete);
    const plan = await savePlan(user.id, {
      weekOf: starterPlan.weekOf,
      days: starterPlan.days,
      nextSession: starterPlan.nextSession,
    });

    await clearConversation(user.id);
    const welcomeMessages = generateWelcomeMessages(athlete, plan);
    const messages = [];
    for (const message of welcomeMessages) {
      const created = await addMessage(user.id, {
        role: message.role,
        content: message.content,
        blocks: message.blocks,
        createdAt: message.createdAt,
      });
      messages.push(created);
    }

    return NextResponse.json({ athlete, plan, messages, workouts: [], checkIns: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
