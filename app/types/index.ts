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
  days: PlanDay[];
  nextSession: PlanDay | null;
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

export type ChatMessage = {
  id: string;
  role: 'coach' | 'user';
  content: string;
  createdAt: string;
  blocks?: CoachBlock[];
};

export type CoachBlock = {
  title: string;
  bullets: string[];
  note?: string;
};

export type CheckIn = {
  readiness: number;
  soreness: number;
  sleep: number;
  motivation: number;
  note?: string;
  createdAt: string;
};
