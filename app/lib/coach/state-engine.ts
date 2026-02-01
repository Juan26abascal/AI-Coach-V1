/**
 * COACH v2.0 - State Engine
 * 
 * Computes the current state of the athlete based on:
 * - Training history (sessions)
 * - Check-in data (daily wellness)
 * - Goals and schedule
 */

import type { WorkoutLog, DailyCheckIn, AthleteProfile, FitnessMetrics } from './types';

// ============================================
// ATHLETE STATE
// ============================================

export interface AthleteState {
  // Training load
  acuteLoad: number;      // Last 7 days
  chronicLoad: number;    // Last 28 days
  acRatio: number;        // Acute:Chronic ratio
  loadTrend: 'increasing' | 'stable' | 'decreasing';
  
  // Subjective state (from check-ins)
  readiness: number;      // 0-100
  soreness: number;       // 0-100
  sleepQuality: number;   // 0-100
  motivation: number;     // 0-100
  
  // Trends
  readinessTrend: 'improving' | 'stable' | 'declining';
  
  // Injury
  hasActiveInjury: boolean;
  injuryDetails?: string;
  
  // Schedule
  daysToGoal?: number;
  currentPhase: string;
  scheduledToday?: string;
  
  // Patterns
  completionRate: number; // 0-100
  bestTrainingDay?: string;
}

// ============================================
// LOAD CALCULATION
// ============================================

const INTENSITY_FACTORS: Record<string, number> = {
  easy: 1.0,
  recovery: 0.8,
  long: 1.2,
  moderate: 1.5,
  threshold: 2.0,
  tempo: 2.0,
  speed: 2.5,
  track: 2.5,
  race: 3.0,
};

function calculateSessionLoad(workout: WorkoutLog): number {
  const duration = workout.actualDuration || workout.plannedDuration || 30;
  const factor = INTENSITY_FACTORS[workout.type] || 1.0;
  return duration * factor;
}

function calculateAcuteLoad(workouts: WorkoutLog[]): number {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentWorkouts = workouts.filter(w => 
    new Date(w.date).getTime() > sevenDaysAgo && 
    w.status === 'completed'
  );
  return recentWorkouts.reduce((sum, w) => sum + calculateSessionLoad(w), 0);
}

function calculateChronicLoad(workouts: WorkoutLog[]): number {
  const twentyEightDaysAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const recentWorkouts = workouts.filter(w => 
    new Date(w.date).getTime() > twentyEightDaysAgo && 
    w.status === 'completed'
  );
  // Weekly average
  const totalLoad = recentWorkouts.reduce((sum, w) => sum + calculateSessionLoad(w), 0);
  return totalLoad / 4; // 4 weeks
}

function calculateLoadTrend(workouts: WorkoutLog[]): 'increasing' | 'stable' | 'decreasing' {
  // Compare last 2 weeks to previous 2 weeks
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  
  const recentLoad = workouts
    .filter(w => new Date(w.date).getTime() > twoWeeksAgo && w.status === 'completed')
    .reduce((sum, w) => sum + calculateSessionLoad(w), 0);
    
  const previousLoad = workouts
    .filter(w => {
      const time = new Date(w.date).getTime();
      return time > fourWeeksAgo && time <= twoWeeksAgo && w.status === 'completed';
    })
    .reduce((sum, w) => sum + calculateSessionLoad(w), 0);
  
  const change = previousLoad > 0 ? (recentLoad - previousLoad) / previousLoad : 0;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

// ============================================
// SUBJECTIVE STATE
// ============================================

function calculateAverageCheckIn(checkIns: DailyCheckIn[], field: keyof DailyCheckIn, days: number = 3): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = checkIns
    .filter(c => new Date(c.date).getTime() > cutoff)
    .map(c => c[field] as number)
    .filter(v => typeof v === 'number');
  
  if (recent.length === 0) return 70; // Default
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function calculateTrend(checkIns: DailyCheckIn[], field: keyof DailyCheckIn): 'improving' | 'stable' | 'declining' {
  const recent = checkIns
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(c => c[field] as number)
    .filter(v => typeof v === 'number');
  
  if (recent.length < 3) return 'stable';
  
  // Simple linear trend
  const first = recent.slice(-2).reduce((a, b) => a + b, 0) / 2;
  const last = recent.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
  const change = last - first;
  
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

// ============================================
// COMPLETION RATE
// ============================================

function calculateCompletionRate(workouts: WorkoutLog[]): number {
  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const recent = workouts.filter(w => new Date(w.date).getTime() > fourWeeksAgo);
  
  if (recent.length === 0) return 80; // Default for new users
  
  const completed = recent.filter(w => w.status === 'completed' || w.status === 'modified').length;
  return Math.round((completed / recent.length) * 100);
}

function findBestTrainingDay(workouts: WorkoutLog[]): string | undefined {
  const dayStats: Record<string, { completed: number; total: number }> = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (const workout of workouts) {
    const day = days[new Date(workout.date).getDay()];
    if (!dayStats[day]) dayStats[day] = { completed: 0, total: 0 };
    dayStats[day].total++;
    if (workout.status === 'completed') dayStats[day].completed++;
  }
  
  let bestDay: string | undefined;
  let bestRate = 0;
  
  for (const [day, stats] of Object.entries(dayStats)) {
    if (stats.total >= 3) { // Need at least 3 samples
      const rate = stats.completed / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = day;
      }
    }
  }
  
  return bestDay;
}

// ============================================
// MAIN FUNCTION
// ============================================

export interface ComputeStateInput {
  workouts: WorkoutLog[];
  checkIns: DailyCheckIn[];
  profile?: AthleteProfile;
  goalDate?: string;
  scheduledToday?: string;
}

export function computeAthleteState(input: ComputeStateInput): AthleteState {
  const { workouts, checkIns, profile, goalDate, scheduledToday } = input;
  
  // Training load
  const acuteLoad = calculateAcuteLoad(workouts);
  const chronicLoad = calculateChronicLoad(workouts);
  const acRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;
  
  // Check for active injury
  const recentCheckIn = checkIns
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
  return {
    acuteLoad: Math.round(acuteLoad),
    chronicLoad: Math.round(chronicLoad),
    acRatio: Math.round(acRatio * 100) / 100,
    loadTrend: calculateLoadTrend(workouts),
    
    readiness: Math.round(calculateAverageCheckIn(checkIns, 'readiness')),
    soreness: Math.round(calculateAverageCheckIn(checkIns, 'soreness')),
    sleepQuality: Math.round(calculateAverageCheckIn(checkIns, 'sleepQuality')),
    motivation: Math.round(calculateAverageCheckIn(checkIns, 'motivation')),
    
    readinessTrend: calculateTrend(checkIns, 'readiness'),
    
    hasActiveInjury: recentCheckIn?.hasInjury || false,
    injuryDetails: recentCheckIn?.injuryNotes,
    
    daysToGoal: goalDate ? Math.ceil((new Date(goalDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : undefined,
    currentPhase: 'build', // TODO: Calculate from goal date
    scheduledToday,
    
    completionRate: calculateCompletionRate(workouts),
    bestTrainingDay: findBestTrainingDay(workouts),
  };
}

// ============================================
// FORMAT FOR PROMPT
// ============================================

export function formatStateForPrompt(state: AthleteState): string {
  const lines: string[] = [];
  
  // Load status
  const acStatus = state.acRatio < 0.8 ? '⚠️ LOW' : 
                   state.acRatio > 1.3 ? '⚠️ HIGH' : 
                   '✓ OPTIMAL';
  lines.push(`LOAD: AC=${state.acRatio.toFixed(2)} ${acStatus} | Trend: ${state.loadTrend}`);
  
  // Subjective
  lines.push(`READINESS: ${state.readiness}/100 (${state.readinessTrend})`);
  lines.push(`SORENESS: ${state.soreness}/100 | SLEEP: ${state.sleepQuality}/100 | MOTIVATION: ${state.motivation}/100`);
  
  // Injury
  if (state.hasActiveInjury) {
    lines.push(`⚠️ INJURY: ${state.injuryDetails || 'Active concern'}`);
  }
  
  // Schedule
  if (state.daysToGoal) {
    lines.push(`GOAL: ${state.daysToGoal} days away | Phase: ${state.currentPhase}`);
  }
  if (state.scheduledToday) {
    lines.push(`TODAY: ${state.scheduledToday}`);
  }
  
  // Patterns
  lines.push(`PATTERNS: ${state.completionRate}% completion${state.bestTrainingDay ? ` | Best day: ${state.bestTrainingDay}` : ''}`);
  
  return lines.join('\n');
}