<<<<<<< HEAD
// Coach Brain - Main Exports
// This file exports everything other parts of the app need from the coach system

export * from './types';
export * from './state-engine';
export * from './decision-engine';
export * from './response-parser';
// TODO: add system prompt helpers once implemented.
=======
export type { ConversationMessage } from './brain';
export {
  buildFullPrompt,
  computeAthleteState,
  formatDecisionGatesForPrompt,
  formatStateForPrompt,
  parseCoachResponse,
  runDecisionGates,
} from './brain';
export { deriveSafetyFlags, fallbackCoachResponse, finalizeCoachResponse } from './guardrails';
export type { CoachResponse } from './schema';
>>>>>>> origin/main
