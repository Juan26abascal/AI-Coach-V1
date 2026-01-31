/**
 * Athlete State Engine
 * 
 * Computes the current state of the athlete based on:
 * - Training history (sessions)
 * - Daily check-ins
 * - Athlete profile
 * 
 * This state is injected into every AI prompt so the coach
 * knows exactly who it's talking to.
 */

import type { 
  AthleteState, 
  CheckInData, 
  SessionLog, 
  AthleteProfile,
  SessionPrescription 
} from './types';

import { 
  getRecentCheckIns, 
  getRecentSessions, 
  getAthleteProfile 
} from '../storage';

// ============================================
// TRAINING LOAD CALCULATIONS
// ============================================

/**
 * Intensity multipliers for different session types
 * Used to calculate training load (duration × intensity)
 */
const INTENSITY_MULTIPLIERS: Record<SessionPrescription['type'], number> = {
  easy: 1.0,
  recovery: 0.8,
  long: 1.3,
  threshold: 2.0,
  speed: 2.5,
  race: 3.0,
};

/**
 * Parse a time string like "45-60 min" or "~55 min" into a number
 */
export const parseTimeToMinutes = (timeString: string): number => {
  if (!timeString) return 0;
  
  // Remove "min" and "~" 
  const cleaned = timeString.replace(/min/gi, '').replace(/~/g, '').trim();
  
  // Check for range (e.g., "45-60")
  if (cleaned.includes('-')) {
    const [low, high] = cleaned.split('-').map(s => parseInt(s.trim(), 10));
    return Math.round((low + high) / 2); // Use midpoint
  }
  
  // Single number
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate load score for a single session
 */
const calculateSessionLoad = (session: SessionLog): number => {
  const duration = session.actualDuration || parseTimeToMinutes(session.plannedSession.totalTime);
  const multiplier = INTENSITY_MULTIPLIERS[session.plannedSession.type] || 1.0;
  return duration * multiplier;
};

/**
 * Compute acute (7-day) and chronic (28-day) training loads
 * Also calculates the Acute:Chronic ratio
 */
export const computeTrainingLoads = (sessions: SessionLog[]): {
  acute: number;
  chronic: number;
  acRatio: number;
} => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Separate sessions by time period
  const acuteSessions = sessions.filter(s => new Date(s.date) >= sevenDaysAgo);
  const chronicSessions = sessions.filter(s => new Date(s.date) >= twentyEightDaysAgo);

  // Calculate loads
  const acuteLoad = acuteSessions.reduce((sum, s) => sum + calculateSessionLoad(s), 0);
  
  // Chronic load is weekly average over 28 days
  const totalChronicLoad = chronicSessions.reduce((sum, s) => sum + calculateSessionLoad(s), 0);
  const chronicLoad = totalChronicLoad / 4; // 4 weeks

  // AC Ratio (avoid division by zero)
  const acRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  return {
    acute: Math.round(acuteLoad),
    chronic: Math.round(chronicLoad),
    acRatio: Math.round(acRatio * 100) / 100, // 2 decimal places
  };
};

// ============================================
// TREND ANALYSIS
// ============================================

/**
 * Analyze trends in check-in data
 */
export const analyzeTrends = (checkIns: CheckInData[]): {
  readiness: 'improving' | 'stable' | 'declining';
  fatigue: 'fresh' | 'normal' | 'fatigued' | 'very_fatigued';
} => {
  if (checkIns.length === 0) {
    return { readiness: 'stable', fatigue: 'normal' };
  }

  // Sort by timestamp (most recent first)
  const sorted = [...checkIns].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calculate average readiness
  const avgReadiness = sorted.reduce((sum, c) => sum + c.readiness, 0) / sorted.length;

  // Determine fatigue level based on average readiness
  let fatigue: 'fresh' | 'normal' | 'fatigued' | 'very_fatigued';
  if (avgReadiness > 75) {
    fatigue = 'fresh';
  } else if (avgReadiness > 60) {
    fatigue = 'normal';
  } else if (avgReadiness > 45) {
    fatigue = 'fatigued';
  } else {
    fatigue = 'very_fatigued';
  }

  // Determine readiness trend (compare recent to older)
  let readiness: 'improving' | 'stable' | 'declining' = 'stable';
  if (sorted.length >= 3) {
    const recent = sorted.slice(0, 2); // Last 2
    const older = sorted.slice(2, 4);  // Previous 2 (if exist)
    
    if (older.length > 0) {
      const recentAvg = recent.reduce((sum, c) => sum + c.readiness, 0) / recent.length;
      const olderAvg = older.reduce((sum, c) => sum + c.readiness, 0) / older.length;
      
      const diff = recentAvg - olderAvg;
      if (diff > 5) {
        readiness = 'improving';
      } else if (diff < -5) {
        readiness = 'declining';
      }
    }
  }

  return { readiness, fatigue };
};

// ============================================
// FULL STATE COMPUTATION
// ============================================

/**
 * Compute the complete athlete state
 * This is the main function called before each AI interaction
 */
export const computeAthleteState = (): AthleteState => {
  // Fetch data from storage
  const sessions = getRecentSessions(28);
  const checkIns = getRecentCheckIns(7);
  const profile = getAthleteProfile();

  // Compute training loads
  const { acute, chronic, acRatio } = computeTrainingLoads(sessions);

  // Analyze trends
  const { readiness: readinessTrend, fatigue } = analyzeTrends(checkIns);

  // Get most recent check-in
  const mostRecent = checkIns.length > 0 
    ? [...checkIns].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
    : null;

  // Get most recent session
  const mostRecentSession = sessions.length > 0
    ? [...sessions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
    : null;

  // Calculate days to event
  let daysToEvent: number | null = null;
  if (profile?.goalEvent?.date) {
    const eventDate = new Date(profile.goalEvent.date);
    const today = new Date();
    daysToEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determine fatigue trend direction
  let fatigueTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (readinessTrend === 'declining') fatigueTrend = 'increasing';
  if (readinessTrend === 'improving') fatigueTrend = 'decreasing';

  // Calculate completion rate from sessions
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const completionRate = sessions.length > 0 
    ? Math.round((completedSessions / sessions.length) * 100) 
    : 100;

  // Check for injury mentions in recent check-in notes
  const injuryKeywords = ['pain', 'hurt', 'injury', 'sore', 'ache', 'twinge', 'strain'];
  const hasInjuryMention = checkIns.some(c => 
    c.notes && injuryKeywords.some(keyword => 
      c.notes!.toLowerCase().includes(keyword)
    )
  );

  // Build the state object
  const state: AthleteState = {
    physiological: {
      acuteLoad: acute,
      chronicLoad: chronic,
      acRatio,
      fatigueTrend,
      lastSessionDate: mostRecentSession?.date || null,
      lastSessionType: mostRecentSession?.plannedSession.type || null,
      lastSessionFeedback: mostRecentSession?.feedback || null,
    },
    subjective: {
      readiness: mostRecent?.readiness ?? 70,
      soreness: mostRecent?.soreness ?? 30,
      sleepQuality: mostRecent?.sleepQuality ?? 70,
      motivation: mostRecent?.motivation ?? 70,
      notes: mostRecent?.notes || null,
      checkInDate: mostRecent?.timestamp || null,
    },
    schedule: {
      availableTimeMinutes: null, // Set when user provides
      currentPhase: profile?.currentPhase || 'base',
      daysToEvent,
      eventName: profile?.goalEvent?.name || null,
    },
    injury: {
      hasActiveInjury: hasInjuryMention,
      injuryDescription: hasInjuryMention 
        ? checkIns.find(c => c.notes && injuryKeywords.some(k => c.notes!.toLowerCase().includes(k)))?.notes || null
        : null,
      injuryGrade: null, // Would need explicit tracking
      injuryLocation: null,
    },
    history: {
      totalSessions: sessions.length,
      completionRate,
      pushbackRate: 0, // Would need tracking
      averageSessionsPerWeek: sessions.length > 0 ? Math.round(sessions.length / 4) : 0,
    },
  };

  return state;
};

// ============================================
// PROMPT FORMATTING
// ============================================

/**
 * Format the athlete state into a string for the AI prompt
 */
export const formatStateForPrompt = (state: AthleteState): string => {
  // Helper to format AC ratio with risk level
  const formatAcRatio = (ratio: number): string => {
    if (ratio > 1.5) return `${ratio} [HIGH RISK]`;
    if (ratio > 1.3) return `${ratio} [ELEVATED]`;
    if (ratio < 0.8) return `${ratio} [LOW - possible detraining]`;
    return `${ratio} [OPTIMAL]`;
  };

  // Helper to format fatigue state
  const formatFatigue = (trend: string): string => {
    switch (trend) {
      case 'increasing': return 'Increasing (concerning)';
      case 'decreasing': return 'Decreasing (recovering)';
      default: return 'Stable';
    }
  };

  const lines: string[] = [
    '=== ATHLETE STATE ===',
    '',
    'PHYSIOLOGICAL:',
    `- Acute load (7d): ${state.physiological.acuteLoad} training units`,
    `- Chronic load (28d avg): ${state.physiological.chronicLoad} training units`,
    `- AC Ratio: ${formatAcRatio(state.physiological.acRatio)}`,
    `- Fatigue trend: ${formatFatigue(state.physiological.fatigueTrend)}`,
    state.physiological.lastSessionDate 
      ? `- Last session: ${state.physiological.lastSessionType} on ${new Date(state.physiological.lastSessionDate).toLocaleDateString()}`
      : '- Last session: None recorded',
    state.physiological.lastSessionFeedback
      ? `- Last feedback: "${state.physiological.lastSessionFeedback}"`
      : '',
    '',
    'SUBJECTIVE (most recent check-in):',
    `- Readiness: ${state.subjective.readiness}/100`,
    `- Soreness: ${state.subjective.soreness}/100 ${state.subjective.soreness > 60 ? '[HIGH]' : ''}`,
    `- Sleep quality: ${state.subjective.sleepQuality}/100 ${state.subjective.sleepQuality < 50 ? '[POOR]' : ''}`,
    `- Motivation: ${state.subjective.motivation}/100 ${state.subjective.motivation < 40 ? '[LOW]' : ''}`,
    state.subjective.notes ? `- Notes: "${state.subjective.notes}"` : '',
    state.subjective.checkInDate 
      ? `- Check-in date: ${new Date(state.subjective.checkInDate).toLocaleDateString()}`
      : '- No recent check-in',
    '',
    'SCHEDULE:',
    `- Current phase: ${state.schedule.currentPhase}`,
    state.schedule.eventName 
      ? `- Goal event: ${state.schedule.eventName}`
      : '- No goal event set',
    state.schedule.daysToEvent !== null
      ? `- Days to event: ${state.schedule.daysToEvent}`
      : '',
    state.schedule.availableTimeMinutes
      ? `- Available time today: ${state.schedule.availableTimeMinutes} min`
      : '',
    '',
    'INJURY STATUS:',
    state.injury.hasActiveInjury
      ? `- ACTIVE CONCERN: ${state.injury.injuryDescription || 'See recent notes'}`
      : '- No active injury concerns',
    state.injury.injuryGrade
      ? `- Injury grade: ${state.injury.injuryGrade}`
      : '',
    '',
    'TRAINING HISTORY:',
    `- Sessions (last 28d): ${state.history.totalSessions}`,
    `- Completion rate: ${state.history.completionRate}%`,
    `- Avg sessions/week: ${state.history.averageSessionsPerWeek}`,
    '',
    '=== END STATE ===',
  ];

  // Filter out empty lines and join
  return lines.filter(line => line !== '').join('\n');
};

// ============================================
// UTILITY EXPORTS
// ============================================

/**
 * Quick check if athlete is in a concerning state
 */
export const hasStateConcerns = (state: AthleteState): {
  hasConcerns: boolean;
  concerns: string[];
} => {
  const concerns: string[] = [];

  if (state.physiological.acRatio > 1.3) {
    concerns.push('Training load ratio elevated');
  }
  if (state.subjective.sleepQuality < 50) {
    concerns.push('Poor sleep quality');
  }
  if (state.subjective.soreness > 60) {
    concerns.push('High soreness');
  }
  if (state.subjective.motivation < 40) {
    concerns.push('Low motivation');
  }
  if (state.injury.hasActiveInjury) {
    concerns.push('Possible injury concern');
  }

  return {
    hasConcerns: concerns.length > 0,
    concerns,
  };
};