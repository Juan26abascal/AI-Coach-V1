import type { CoachResponse } from '@/lib/coach/types';

export type Athlete = {
  id: string;
  name: string;
  goal: string;
  daysPerWeek: number;
  pr5k?: string;
  pr10k?: string;
  injuryHistory: string;
  availabilityNotes?: string;
};

export type PlanDay = {
  title: string;
  details: string;
  focus?: string;
};

export type TrainingPlan = {
  id: string;
  weekOf: string;
  lastUpdated: string;
  days: PlanDay[];
  nextSession: PlanDay | null;
  nextSessionRationale?: string;
};

export type Workout = {
  id: string;
  date: string;
  title: string;
  durationMinutes: number;
  effort: 'Easy' | 'Moderate' | 'Hard';
  notes?: string;
  pain?: string;
};

export type CoachBlock = {
  title: string;
  bullets: string[];
  note?: string;
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structuredContent?: CoachResponse;
  timestamp: string;
  blocks?: CoachBlock[];
}

export type ChatMessage = Message;

export type CheckIn = {
  readiness: number;
  soreness: number;
  sleep: number;
  motivation: number;
  note?: string;
  createdAt: string;
};
