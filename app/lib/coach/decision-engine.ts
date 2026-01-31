/**
 * Decision Engine - The Gate System
 * 
 * Gates are safety checks that run before every response.
 * They can modify or override what the coach would normally prescribe.
 * 
 * Gate Priority (checked in order):
 * 1. Safety - Injury, illness, severe sleep deprivation
 * 2. Recovery - Overtraining, fatigue accumulation
 * 3. Schedule - Time constraints, race proximity
 * 4. Methodology - Ensure session matches training philosophy
 */

import type { AthleteState, GateResult } from './types';

// ============================================
// GATE CHECK FUNCTIONS
// ============================================

/**
 * Safety Gate - Highest priority
 * Triggers on injury, illness, or dangerous conditions
 */
export function checkSafetyGate(state: AthleteState): GateResult {
  // Check for injury
  if (state.injury.hasActiveInjury && state.injury.injuryGrade && state.injury.injuryGrade >= 2) {
    return {
      gate: 'safety',
      triggered: true,
      reason: `Active injury reported (Grade ${state.injury.injuryGrade})`,
      action: 'injury_protocol'
    };
  }

  // Check for very poor sleep
  if (state.subjective.sleepQuality < 30) {
    return {
      gate: 'safety',
      triggered: true,
      reason: `Very poor sleep quality (${state.subjective.sleepQuality}/100)`,
      action: 'recovery_only'
    };
  }

  // Check for illness keywords in notes
  const illnessKeywords = ['sick', 'illness', 'fever', 'covid', 'flu', 'cold', 'infection'];
  if (state.subjective.notes) {
    const notesLower = state.subjective.notes.toLowerCase();
    if (illnessKeywords.some(keyword => notesLower.includes(keyword))) {
      return {
        gate: 'safety',
        triggered: true,
        reason: 'Illness symptoms mentioned',
        action: 'rest'
      };
    }
  }

  return {
    gate: 'safety',
    triggered: false
  };
}

/**
 * Recovery Gate - Second priority
 * Triggers when training load is too high or fatigue is accumulated
 */
export function checkRecoveryGate(state: AthleteState): GateResult {
  const { acRatio } = state.physiological;

  // Very high AC ratio - mandatory recovery
  if (acRatio > 1.5) {
    return {
      gate: 'recovery',
      triggered: true,
      reason: `AC Ratio critically high (${acRatio.toFixed(2)})`,
      action: 'mandatory_recovery'
    };
  }

  // Elevated AC ratio - reduce load
  if (acRatio > 1.3) {
    return {
      gate: 'recovery',
      triggered: true,
      reason: `AC Ratio elevated (${acRatio.toFixed(2)})`,
      action: 'reduce_load'
    };
  }

  // Very fatigued state
  if (state.physiological.fatigueTrend === 'increasing' && state.subjective.readiness < 50) {
    return {
      gate: 'recovery',
      triggered: true,
      reason: `Fatigue accumulating, readiness low (${state.subjective.readiness}/100)`,
      action: 'reduce_intensity'
    };
  }

  // Low readiness
  if (state.subjective.readiness < 40) {
    return {
      gate: 'recovery',
      triggered: true,
      reason: `Very low readiness (${state.subjective.readiness}/100)`,
      action: 'back_off'
    };
  }

  return {
    gate: 'recovery',
    triggered: false
  };
}

/**
 * Schedule Gate - Third priority
 * Triggers on time constraints or race proximity
 */
export function checkScheduleGate(state: AthleteState, requestedType?: string): GateResult {
  const { availableTimeMinutes, daysToEvent } = state.schedule;

  // Race week
  if (daysToEvent !== null && daysToEvent <= 3) {
    return {
      gate: 'schedule',
      triggered: true,
      reason: `Race in ${daysToEvent} days`,
      action: 'race_week_mode'
    };
  }

  // Taper period
  if (daysToEvent !== null && daysToEvent <= 14) {
    return {
      gate: 'schedule',
      triggered: true,
      reason: `Race in ${daysToEvent} days - taper period`,
      action: 'taper_mode'
    };
  }

  // Very limited time
  if (availableTimeMinutes !== null && availableTimeMinutes < 20) {
    return {
      gate: 'schedule',
      triggered: true,
      reason: `Only ${availableTimeMinutes} minutes available`,
      action: 'skip_or_minimal'
    };
  }

  // Limited time
  if (availableTimeMinutes !== null && availableTimeMinutes < 30) {
    return {
      gate: 'schedule',
      triggered: true,
      reason: `Only ${availableTimeMinutes} minutes available`,
      action: 'compress_session'
    };
  }

  return {
    gate: 'schedule',
    triggered: false
  };
}

/**
 * Methodology Gate - Fourth priority
 * Ensures sessions align with training philosophy
 */
export function checkMethodologyGate(state: AthleteState, requestedSession?: string): GateResult {
  // For now, this gate doesn't trigger
  // It will be expanded when we add methodology-specific logic
  return {
    gate: 'methodology',
    triggered: false
  };
}

// ============================================
// MAIN GATE RUNNER
// ============================================

/**
 * Run all gates in priority order
 * Returns array of all gate results
 */
export function runDecisionGates(
  state: AthleteState,
  context?: { requestedType?: string }
): GateResult[] {
  const results: GateResult[] = [];

  // Run gates in order
  const safetyResult = checkSafetyGate(state);
  results.push(safetyResult);

  // If safety gate triggered with blocking action, we can still continue checking
  // but the blocking action should be respected
  const recoveryResult = checkRecoveryGate(state);
  results.push(recoveryResult);

  const scheduleResult = checkScheduleGate(state, context?.requestedType);
  results.push(scheduleResult);

  const methodologyResult = checkMethodologyGate(state, context?.requestedType);
  results.push(methodologyResult);

  return results;
}

/**
 * Get the highest priority action from gate results
 */
export function getHighestPriorityAction(gateResults: GateResult[]): {
  shouldProceed: boolean;
  modification?: string;
  reason?: string;
  blockingGate?: string;
} {
  // Check for blocking gates (prevent normal training)
  const blockingActions = ['injury_protocol', 'rest', 'mandatory_recovery'];
  
  for (const result of gateResults) {
    if (result.triggered && result.action && blockingActions.includes(result.action)) {
      return {
        shouldProceed: false,
        modification: result.action,
        reason: result.reason,
        blockingGate: result.gate
      };
    }
  }

  // Check for modification gates
  const triggeredGates = gateResults.filter(r => r.triggered);
  if (triggeredGates.length > 0) {
    const primary = triggeredGates[0]; // Highest priority triggered gate
    return {
      shouldProceed: true,
      modification: primary.action,
      reason: primary.reason
    };
  }

  // No gates triggered
  return { shouldProceed: true };
}

/**
 * Format gate results for injection into the AI prompt
 */
export function formatGateResultsForPrompt(gateResults: GateResult[]): string {
  const triggered = gateResults.filter(r => r.triggered);
  
  if (triggered.length === 0) {
    return ''; // No gates triggered, don't add anything
  }

  const lines: string[] = [];
  
  for (const gate of triggered) {
    lines.push(`GATE TRIGGERED: ${gate.gate.toUpperCase()}`);
    lines.push(`- Reason: ${gate.reason}`);
    lines.push(`- Required action: ${gate.action}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if any gates are triggered
 */
export function hasTriggeredGates(gateResults: GateResult[]): boolean {
  return gateResults.some(r => r.triggered);
}

/**
 * Get list of triggered gate names
 */
export function getTriggeredGateNames(gateResults: GateResult[]): string[] {
  return gateResults.filter(r => r.triggered).map(r => r.gate);
}