import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Athlete, TrainingPlan, Workout, ChatMessage, CheckIn } from '@/types';

type AthleteRecord = Athlete & { userId: string; createdAt: string; updatedAt: string };
type TrainingPlanRecord = TrainingPlan & { userId: string; createdAt: string; updatedAt: string };
type WorkoutRecord = Workout & { userId: string; createdAt: string };
type CheckInRecord = CheckIn & { id: string; userId: string };
type MessageRecord = ChatMessage & { userId: string };

type Database = {
  athletes: AthleteRecord[];
  plans: TrainingPlanRecord[];
  workouts: WorkoutRecord[];
  checkIns: CheckInRecord[];
  messages: MessageRecord[];
};

const DB_PATH = path.join(process.cwd(), 'src/lib/db/data.json');

const emptyDatabase: Database = {
  athletes: [],
  plans: [],
  workouts: [],
  checkIns: [],
  messages: [],
};

async function readDatabase(): Promise<Database> {
  try {
    const file = await fs.readFile(DB_PATH, 'utf-8');
    return { ...emptyDatabase, ...JSON.parse(file) };
  } catch (error) {
    return { ...emptyDatabase };
  }
}

async function writeDatabase(data: Database) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function getBootstrapData(userId: string) {
  const db = await readDatabase();
  const athlete = db.athletes.find((item) => item.userId === userId) ?? null;
  const plan = db.plans.filter((item) => item.userId === userId).sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0] ?? null;
  const workouts = db.workouts
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const messages = db.messages
    .filter((item) => item.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const checkIns = db.checkIns
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { athlete, plan, workouts, messages, checkIns };
}

export async function getAthlete(userId: string) {
  const db = await readDatabase();
  return db.athletes.find((item) => item.userId === userId) ?? null;
}

export async function upsertAthlete(userId: string, input: Omit<Athlete, 'id'>) {
  const db = await readDatabase();
  const existingIndex = db.athletes.findIndex((item) => item.userId === userId);
  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    const updated = { ...db.athletes[existingIndex], ...input, updatedAt: now };
    db.athletes[existingIndex] = updated;
    await writeDatabase(db);
    return updated;
  }

  const created: AthleteRecord = {
    id: randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  db.athletes.push(created);
  await writeDatabase(db);
  return created;
}

export async function savePlan(userId: string, input: Omit<TrainingPlan, 'id'>) {
  const db = await readDatabase();
  const now = new Date().toISOString();
  const plan: TrainingPlanRecord = {
    id: randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  db.plans = db.plans.filter((item) => item.userId !== userId);
  db.plans.push(plan);
  await writeDatabase(db);
  return plan;
}

export async function updatePlan(userId: string, input: TrainingPlan) {
  const db = await readDatabase();
  const existingIndex = db.plans.findIndex((item) => item.userId === userId && item.id === input.id);
  if (existingIndex >= 0) {
    db.plans[existingIndex] = { ...db.plans[existingIndex], ...input, updatedAt: new Date().toISOString() };
    await writeDatabase(db);
    return db.plans[existingIndex];
  }

  return savePlan(userId, input);
}

export async function addWorkout(userId: string, input: Omit<Workout, 'id'>) {
  const db = await readDatabase();
  const workout: WorkoutRecord = {
    id: randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.workouts.push(workout);
  await writeDatabase(db);
  return workout;
}

export async function addCheckIn(userId: string, input: Omit<CheckIn, 'createdAt'> & { createdAt?: string }) {
  const db = await readDatabase();
  const checkIn: CheckInRecord = {
    id: randomUUID(),
    userId,
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  db.checkIns.push(checkIn);
  await writeDatabase(db);
  return checkIn;
}

export async function addMessage(userId: string, input: Omit<ChatMessage, 'id' | 'createdAt'> & { createdAt?: string }) {
  const db = await readDatabase();
  const message: MessageRecord = {
    id: randomUUID(),
    userId,
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  db.messages.push(message);
  await writeDatabase(db);
  return message;
}

export async function clearConversation(userId: string) {
  const db = await readDatabase();
  db.messages = db.messages.filter((message) => message.userId !== userId);
  await writeDatabase(db);
}
