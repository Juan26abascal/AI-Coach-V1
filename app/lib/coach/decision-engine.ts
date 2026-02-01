/**
 * COACH v2.0 - Decision Engine
 * 
 * The Gate System - safety checks before every response.
 * Gates are checked in order. If triggered, they modify or override the response.
 */

import type { AthleteState } from './state-engine';

// ============================================
// GATE TYPES
// ============================================

export type GateSeverity = 'info' | 'warning' | 'critical';

export interface GateResult {
  gate: string;
  triggered: boolean;
  severity: GateSeverity;
  action: string;
  message?: string;
}

export interface DecisionContext {
  state: AthleteState;
  requestedSession?: string;
  timeAvailable?: number;
  userMessage: string;
}

// ============================================
// GATE 1: SAFETY
// ============================================

function runSafetyGate(context: DecisionContext): GateResult {
  const { state, userMessage } = context;
  
  // Check for injury keywords in message
  const injuryKeywords = ['pain', 'hurt', 'injury', 'sharp', 'shooting', 'swollen'];
  const hasInjuryMention = injuryKeywords.some(k => userMessage.toLowerCase().includes(k));
  
  // Grade 2+ injury (reported as high severity)
  if (state.hasActiveInjury || hasInjuryMention) {
    // Check severity from message
    const severityMatch = userMessage.match(/(\d+)\s*(out of|\/)\s*10/i);
    const painLevel = severityMatch ? parseInt(severityMatch[1]) : 0;
    
    if (painLevel >= 5 || (state.hasActiveInjury && !userMessage.toLowerCase().includes('better'))) {
      return {
        gate: 'SAFETY',
        triggered: true,
        severity: 'critical',
        action: 'STOP_TRAINING',
        message: 'Pause training and assess injury.',
      };
    }
    
    if (painLevel >= 3 || hasInjuryMention) {
      return {
        gate: 'SAFETY',
        triggered: true,
        severity: 'warning',
        action: 'ASSESS_INJURY',
        message: 'Gather more information about the pain.',
      };
    }
  }
  
  // Very poor sleep (< 4 hours mentioned)
  const sleepMatch = userMessage.match(/(\d+)\s*hours?\s*(of\s+)?sleep/i);
  if (sleepMatch && parseInt(sleepMatch[1]) < 4) {
    return {
      gate: 'SAFETY',
      triggered: true,
      severity: 'warning',
      action: 'NO_QUALITY_SESSION',
      message: 'Sleep too short for quality work.',
    };
  }
  
  // Illness mentioned
  const illnessKeywords = ['sick', 'fever', 'flu', 'cold', 'covid', 'ill', 'vomit', 'nausea'];
  if (illnessKeywords.some(k => userMessage.toLowerCase().includes(k))) {
    return {
      gate: 'SAFETY',
      triggered: true,
      severity: 'critical',
      action: 'REST_ONLY',
      message: 'Rest when ill. No training.',
    };
  }
  
  return {
    gate: 'SAFETY',
    triggered: false,
    severity: 'info',
    action: 'PROCEED',
  };
}

// ============================================
// GATE 2: RECOVERY
// ============================================

function runRecoveryGate(context: DecisionContext): GateResult {
  const { state } = context;
  
  // High AC ratio (overreaching)
  if (state.acRatio > 1.5) {
    return {
      gate: 'RECOVERY',
      triggered: true,
      severity: 'critical',
      action: 'RECOVERY_DAY',
      message: `AC ratio ${state.acRatio.toFixed(2)} is too high. Recovery day required.`,
    };
  }
  
  if (state.acRatio > 1.3) {
    return {
      gate: 'RECOVERY',
      triggered: true,
      severity: 'warning',
      action: 'REDUCE_LOAD',
      message: `AC ratio ${state.acRatio.toFixed(2)} is elevated. Reduce planned load by 20-30%.`,
    };
  }
  
  // Declining readiness trend
  if (state.readinessTrend === 'declining' && state.readiness < 60) {
    return {
      gate: 'RECOVERY',
      triggered: true,
      severity: 'warning',
      action: 'REDUCE_INTENSITY',
      message: 'Readiness declining. Scale back intensity.',
    };
  }
  
  // Low motivation (3+ days)
  if (state.motivation < 40) {
    return {
      gate: 'RECOVERY',
      triggered: true,
      severity: 'info',
      action: 'SIMPLIFY',
      message: 'Motivation is low. Consider simplifying today.',
    };
  }
  
  return {
    gate: 'RECOVERY',
    triggered: false,
    severity: 'info',
    action: 'PROCEED',
  };
}

// ============================================
// GATE 3: SCHEDULE
// ============================================

function runScheduleGate(context: DecisionContext): GateResult {
  const { timeAvailable, requestedSession } = context;
  
  // Time constraint
  if (timeAvailable && timeAvailable < 30) {
    return {
      gate: 'SCHEDULE',
      triggered: true,
      severity: 'info',
      action: 'COMPRESS_SESSION',
      message: `Only ${timeAvailable} minutes available. Compress session.`,
    };
  }
  
  // Check if requested session fits time
  if (timeAvailable && requestedSession) {
    const sessionMinTimes: Record<string, number> = {
      threshold: 45,
      tempo: 40,
      speed: 50,
      long: 60,
      easy: 20,
      recovery: 15,
    };
    
    const minTime = sessionMinTimes[requestedSession.toLowerCase()] || 30;
    if (timeAvailable < minTime) {
      return {
        gate: 'SCHEDULE',
        triggered: true,
        severity: 'info',
        action: 'MODIFY_SESSION',
        message: `${requestedSession} needs ${minTime}+ min. Adapting to ${timeAvailable} min.`,
      };
    }
  }
  
  return {
    gate: 'SCHEDULE',
    triggered: false,
    severity: 'info',
    action: 'PROCEED',
  };
}

// ============================================
// GATE 4: METHODOLOGY
// ============================================

function runMethodologyGate(context: DecisionContext): GateResult {
  // For now, always pass - will be enhanced with methodology checking
  return {
    gate: 'METHODOLOGY',
    triggered: false,
    severity: 'info',
    action: 'PROCEED',
  };
}

// ============================================
// MAIN FUNCTION
// ============================================

export interface DecisionGateResults {
  overallAction: 'PROCEED' | 'MODIFY' | 'STOP';
  highestSeverity: GateSeverity;
  gates: GateResult[];
  modifiers: string[];
}

export function runDecisionGates(context: DecisionContext): DecisionGateResults {
  const gates: GateResult[] = [];
  const modifiers: string[] = [];
  
  // Run gates in order
  const safetyResult = runSafetyGate(context);
  gates.push(safetyResult);
  if (safetyResult.triggered && safetyResult.message) {
    modifiers.push(safetyResult.message);
  }
  
  // If safety gate is critical, stop here
  if (safetyResult.triggered && safetyResult.severity === 'critical') {
    return {
      overallAction: 'STOP',
      highestSeverity: 'critical',
      gates,
      modifiers,
    };
  }
  
  const recoveryResult = runRecoveryGate(context);
  gates.push(recoveryResult);
  if (recoveryResult.triggered && recoveryResult.message) {
    modifiers.push(recoveryResult.message);
  }
  
  // If recovery gate is critical, stop here
  if (recoveryResult.triggered && recoveryResult.severity === 'critical') {
    return {
      overallAction: 'STOP',
      highestSeverity: 'critical',
      gates,
      modifiers,
    };
  }
  
  const scheduleResult = runScheduleGate(context);
  gates.push(scheduleResult);
  if (scheduleResult.triggered && scheduleResult.message) {
    modifiers.push(scheduleResult.message);
  }
  
  const methodologyResult = runMethodologyGate(context);
  gates.push(methodologyResult);
  
  // Determine overall action
  const anyTriggered = gates.some(g => g.triggered);
  const highestSeverity = gates.reduce((max, g) => {
    const severityOrder: GateSeverity[] = ['info', 'warning', 'critical'];
    return severityOrder.indexOf(g.severity) > severityOrder.indexOf(max) ? g.severity : max;
  }, 'info' as GateSeverity);
  
  return {
    overallAction: anyTriggered ? 'MODIFY' : 'PROCEED',
    highestSeverity,
    gates,
    modifiers,
  };
}

// ============================================
// FORMAT FOR PROMPT
// ============================================

export function formatGateResultsForPrompt(results: DecisionGateResults): string {
  if (results.modifiers.length === 0) {
    return 'GATES: All clear. Proceed normally.';
  }
  
  const lines = ['GATE MODIFIERS:'];
  for (const modifier of results.modifiers) {
    lines.push(`- ${modifier}`);
  }
  
  if (results.overallAction === 'STOP') {
    lines.push('ACTION: STOP training. Address safety concern first.');
  } else if (results.overallAction === 'MODIFY') {
    lines.push('ACTION: MODIFY session based on above.');
  }
  
  return lines.join('\n');
}