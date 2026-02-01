/**
 * COACH v2.0 - Main Exports
 * 
 * This file exports everything that other parts of the app need.
 */

// ============================================
// SCHEMA (Response formats)
// ============================================

export {
    CoachResponseSchema,
    SessionSchema,
    AlertSchema,
    validateCoachResponse,
    parseCoachResponse as parseCoachResponseFromSchema,
    type CoachResponse,
    type Session,
    type Alert,
    type SessionPrescription,
  } from './schema';
  
  // ============================================
  // TYPES
  // ============================================
  
  export {
    Intent,
    type AthleteProfile,
    type TrainingZones,
    type FitnessMetrics,
    type WorkoutLog,
    type DailyCheckIn,
    type ConversationMessage,
    type ClassificationResult,
    type CoachMemory,
    type MemoryContext,
    type HandlerContext,
    type HandlerResult,
    type SessionType,
  } from './types';
  
  // ============================================
  // STATE ENGINE
  // ============================================
  
  export {
    computeAthleteState,
    formatStateForPrompt,
    type AthleteState,
    type ComputeStateInput,
  } from './state-engine';
  
  // ============================================
  // DECISION ENGINE
  // ============================================
  
  export {
    runDecisionGates,
    formatGateResultsForPrompt,
    type GateResult,
    type DecisionContext,
    type DecisionGateResults,
  } from './decision-engine';
  
  // ============================================
  // SYSTEM PROMPT
  // ============================================
  
  export {
    SYSTEM_PROMPT,
    COACH_SYSTEM_PROMPT,
    COACH_DEVELOPER_PROMPT,
    buildFullPrompt,
    buildPrompt,
  } from './system-prompt';
  
  // ============================================
  // RESPONSE PARSER
  // ============================================
  
  export {
    parseCoachResponse,
    sanitizeResponse,
    containsEmoji,
    containsOptions,
    getWordCount,
    validateTimeConstraint,
    extractTimeConstraint,
    type ParseResult,
    type SanitizeResult,
  } from './response-parser';
  
  // ============================================
  // INTENT CLASSIFIER
  // ============================================
  
  export {
    classifyIntent,
    INTENT_METADATA,
  } from './intent-classifier';
  
  // ============================================
  // BRAIN (Main orchestrator)
  // ============================================
  
  export {
    processMessage,
    createDefaultMemory,
    type BrainInput,
    type BrainOutput,
  } from './brain';