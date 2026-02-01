/**
 * COACH v2.0 - Type Definitions
 */

// Re-export CoachResponse from schema for backwards compatibility
export type { CoachResponse, Session, Alert, SessionPrescription } from './schema';

// ============================================
// ATHLETE TYPES
// ============================================

export interface AthleteProfile {
  id: string;
  name: string;
  email?: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goalType?: string;
  goalRace?: string;
  goalDate?: string;
  goalTime?: string;
  weeklyRunDays: number;
  longRunDay: string;
  preferredUnits: 'km' | 'miles';
}

export interface TrainingZones {
  easy: { min: string; max: string };
  moderate: { min: string; max: string };
  threshold: { min: string; max: string };
  interval: { min: string; max: string };
  max: { min: string; max: string };
}

export interface FitnessMetrics {
  ctl: number;  // Chronic Training Load
  atl: number;  // Acute Training Load
  tsb: number;  // Training Stress Balance
  acRatio: number;  // Acute:Chronic ratio
}

// ============================================
// WORKOUT TYPES
// ============================================

export type SessionType = 
  | 'easy' 
  | 'recovery' 
  | 'long' 
  | 'threshold' 
  | 'tempo' 
  | 'speed' 
  | 'track' 
  | 'race';

export interface WorkoutLog {
  id: string;
  date: string;
  type: SessionType;
  plannedDuration?: number;
  plannedDistance?: number;
  actualDuration?: number;
  actualDistance?: number;
  actualPace?: string;
  actualHrAvg?: number;
  effort?: 'easy' | 'moderate' | 'hard' | 'very-hard';
  status: 'planned' | 'completed' | 'modified' | 'skipped';
  notes?: string;
}

// ============================================
// CHECK-IN TYPES
// ============================================

export interface DailyCheckIn {
  id: string;
  date: string;
  readiness?: number;  // 0-100
  soreness?: number;   // 0-100
  sleepQuality?: number;  // 0-100
  sleepHours?: number;
  motivation?: number;  // 0-100
  stress?: number;  // 0-100
  notes?: string;
  hasInjury?: boolean;
  injuryNotes?: string;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// ============================================
// INTENT TYPES
// ============================================

export enum Intent {
  // Greetings & Social
  GREETING = 'GREETING',
  GRATITUDE = 'GRATITUDE',
  AFFIRMATION = 'AFFIRMATION',
  FAREWELL = 'FAREWELL',
  
  // Workout Related
  SESSION_REQUEST = 'SESSION_REQUEST',
  SESSION_MODIFICATION = 'SESSION_MODIFICATION',
  SESSION_FEEDBACK = 'SESSION_FEEDBACK',
  
  // Check-ins & Logging
  CHECK_IN = 'CHECK_IN',
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT',
  SKIP_REPORT = 'SKIP_REPORT',
  
  // Planning
  PLAN_QUERY = 'PLAN_QUERY',
  PLAN_MODIFICATION = 'PLAN_MODIFICATION',
  
  // Health & Safety
  INJURY_REPORT = 'INJURY_REPORT',
  INJURY_FOLLOWUP = 'INJURY_FOLLOWUP',
  FATIGUE_REPORT = 'FATIGUE_REPORT',
  
  // Emotional
  MOTIVATION_ISSUE = 'MOTIVATION_ISSUE',
  ANXIETY_EXPRESSION = 'ANXIETY_EXPRESSION',
  FRUSTRATION_EXPRESSION = 'FRUSTRATION_EXPRESSION',
  
  // Knowledge
  KNOWLEDGE_QUERY = 'KNOWLEDGE_QUERY',
  PROGRESS_QUERY = 'PROGRESS_QUERY',
  
  // Other
  GENERAL_CHAT = 'GENERAL_CHAT',
  CONFUSION = 'CONFUSION',
  OFF_TOPIC = 'OFF_TOPIC',
}

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  entities: Record<string, string | number>;
  sentiment: 'positive' | 'neutral' | 'negative';
}

// ============================================
// MEMORY TYPES
// ============================================

export interface ImmutableCore {
  name: string;
  experience: string;
  goal?: string;
  constraints?: string;
  style?: string;
}

export interface PerformanceMetrics {
  prs: Array<{ distance: string; time: string; date: string }>;
  zones: TrainingZones;
  hrZones?: { z1: number[]; z2: number[]; z3: number[]; z4: number[]; z5: number[] };
  fitness: FitnessMetrics;
}

export interface BehavioralPatterns {
  trainingResponse: string;
  complianceByDay: Record<string, number>;
  communicationStyle: string;
  emotionalTriggers: string[];
  riskFactors: string[];
}

export interface ActiveThread {
  area: string;
  severity: number;
  status: 'active' | 'monitoring' | 'resolved';
  startDate: string;
  notes?: string;
}

export interface ActiveThreads {
  injuries: ActiveThread[];
  pendingFollowUps: string[];
  focusAreas: string[];
  recentConcerns: string[];
  coachCommitments: string[];
}

export interface SessionMemory {
  recentWorkouts: WorkoutLog[];
  conversationHighlights: string[];
  unresolvedItems: string[];
  todayPlan?: string;
}

export interface CoachMemory {
  core: ImmutableCore;
  metrics: PerformanceMetrics;
  patterns: BehavioralPatterns;
  threads: ActiveThreads;
  session: SessionMemory;
}

// ============================================
// CONTEXT TYPES
// ============================================

export interface MemoryContext {
  athlete: string;
  goal?: string;
  fitness?: string;
  today?: string;
  injury?: string;
  pattern?: string;
  recent?: string;
}

export interface HandlerContext {
  message: string;
  intent: Intent;
  confidence: number;
  athleteId: string;
  memory: CoachMemory;
  memoryContext: MemoryContext;
  conversationHistory: ConversationMessage[];
}

export interface HandlerResult {
  response: {
    message: string;
    session?: any;
    alert?: any;
    actions?: any[];
    confidence?: 'high' | 'medium' | 'low';
  };
  memoryUpdates?: any;
  tokensUsed: number;
  modelUsed: string;
}