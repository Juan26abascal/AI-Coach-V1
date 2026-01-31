/**
 * Type definitions for the COACH app
 * 
 * This file contains all shared types used across the coach brain system.
 */

// Add new card type definitions

export type SessionType =
  | 'easy'
  | 'recovery'
  | 'long'
  | 'threshold'
  | 'tempo'
  | 'speed'
  | 'track'
  | 'race';

export type WorkoutCardType = 'simple' | 'standard' | 'complex';

// SIMPLE CARD
export interface SimpleWorkoutCard {
  type: 'easy' | 'recovery' | 'long';
  title: string;
  duration: string;
  effort: string;
  notes?: string;
  totalTime: string;
  totalDistance?: string;
}

// STANDARD CARD (existing structure)
export interface StandardWorkoutCard {
  type: 'threshold' | 'tempo';
  title: string;
  warmup: {
    duration: string;
    description: string;
  };
  main: {
    structure: string;
    target: string;
    recovery: string;
    notes?: string;
  };
  cooldown: {
    duration: string;
    description: string;
  };
  totalTime: string;
  totalDistance?: string;
}

// COMPLEX CARD
export interface ComplexWorkoutCard extends StandardWorkoutCard {
  type: 'speed' | 'track' | 'race';
  warmup: {
    duration: string;
    description: string;
    drills?: string[];
  };
  cooldown: {
    duration: string;
    description: string;
    stretches?: string[];
  };
  equipmentNeeded?: string[];
}

export type WorkoutCard = SimpleWorkoutCard | StandardWorkoutCard | ComplexWorkoutCard;

// ============================================
// ATHLETE STATE TYPES
// ============================================

/**
 * The complete state of the athlete at any given moment
 * This is computed by the state engine and injected into every prompt
 */
export interface AthleteState {
  physiological: {
    acuteLoad: number;
    chronicLoad: number;
    acRatio: number;
    fatigueTrend: 'increasing' | 'stable' | 'decreasing';
    lastSessionDate: string | null;
    lastSessionType: string | null;
    lastSessionFeedback: string | null;
  };
  subjective: {
    readiness: number; // 0-100
    soreness: number; // 0-100
    sleepQuality: number; // 0-100
    motivation: number; // 0-100
    notes: string | null;
    checkInDate: string | null;
  };
  schedule: {
    availableTimeMinutes: number | null;
    currentPhase: string;
    daysToEvent: number | null;
    eventName: string | null;
  };
  injury: {
    hasActiveInjury: boolean;
    injuryDescription: string | null;
    injuryGrade: 1 | 2 | 3 | 4 | null;
    injuryLocation: string | null;
  };
  history: {
    totalSessions: number;
    completionRate: number;
    pushbackRate: number;
    averageSessionsPerWeek: number;
  };
}

// ============================================
// SESSION TYPES
// ============================================

/**
 * A workout prescription from the coach
 */
export interface SessionPrescription {
  type: 'threshold' | 'easy' | 'long' | 'speed' | 'recovery' | 'race';
  title: string;
  warmup: {
    duration: string;
    description: string;
  };
  main: {
    structure: string;
    target: string;
    recovery?: string;
    notes?: string;
  };
  cooldown: {
    duration: string;
    description: string;
  };
  totalTime: string;
  totalDistance?: string;
}

/**
 * A logged training session (planned + actual)
 */
export interface SessionLog {
  id: string;
  date: string;
  plannedSession: SessionPrescription;
  status: 'completed' | 'modified' | 'skipped';
  actualDuration?: number;
  actualDistance?: number;
  feedback?: string;
  coachAnalysis?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * The structured response from the coach
 * This is what the API returns and the UI renders
 */
export interface CoachResponse {
  message: string;
  session?: SessionPrescription;
  weekOverview?: WeekOverview;
  alert?: {
    severity: 'warning' | 'critical';
    title: string;
    details: string;
  };
  actions?: {
    label: string;
    value: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Weekly plan overview
 */
export interface WeekOverview {
  startDate: string;
  endDate: string;
  days: {
    date: string;
    day: string;
    type: string;
    summary: string;
    isToday: boolean;
  }[];
  weekFocus?: string;
}

// ============================================
// CHECK-IN TYPES
// ============================================

/**
 * Daily check-in data from the athlete
 */
export interface CheckInData {
  readiness: number;
  soreness: number;
  sleepQuality: number;
  motivation: number;
  notes?: string;
  timestamp: string;
}

// ============================================
// CONVERSATION TYPES
// ============================================

/**
 * A message in the conversation
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structuredContent?: CoachResponse;
  timestamp: string;
}

// ============================================
// DECISION ENGINE TYPES
// ============================================

/**
 * Result from checking a decision gate
 */
export interface GateResult {
  gate: 'safety' | 'recovery' | 'schedule' | 'methodology';
  triggered: boolean;
  reason?: string;
  action?: string;
}

// ============================================
// PROFILE TYPES
// ============================================

/**
 * Athlete profile - basic info and preferences
 */
export interface AthleteProfile {
  name: string;
  goalEvent?: {
    name: string;
    date: string;
    distance: string;
    goalTime?: string;
  };
  methodology: string;
  currentPhase: string;
  weeklyRunDays: number;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================
// INTENT TYPES
// ============================================

/**
 * Classified intent of a user message
 */
export type Intent =
  | 'SESSION_REQUEST'
  | 'SESSION_MODIFICATION'
  | 'SESSION_FEEDBACK'
  | 'PLAN_QUERY'
  | 'PLAN_MODIFICATION'
  | 'INJURY_REPORT'
  | 'INJURY_FOLLOWUP'
  | 'PROGRESS_QUERY'
  | 'KNOWLEDGE_QUERY'
  | 'MOTIVATION_ISSUE'
  | 'GENERAL_CHAT'
  | 'COMPLIANCE_REPORT'
  | 'SKIP_REPORT'
  | 'CLARIFICATION';

// Add new card type definitions