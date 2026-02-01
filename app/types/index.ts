import type { CoachResponse } from '@/lib/coach/schema';

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

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structuredContent?: CoachResponse;
  timestamp: string;
  // Add createdAt as alias for timestamp (for compatibility)
  createdAt?: string;
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

// CoachBlock type for structured output display
export type CoachBlock = {
  title: string;
  bullets: string[];
};

// Re-export CoachResponse for convenience
export type { CoachResponse } from '@/lib/coach/schema';