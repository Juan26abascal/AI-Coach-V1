/**
 * COACH v2.0 - Schema Definitions
 * All Zod schemas for coach responses
 */

import { z } from 'zod';

// ============================================
// SESSION SCHEMAS
// ============================================

export const WarmupSchema = z.object({
  duration: z.string(),
  description: z.string(),
  drills: z.array(z.string()).optional(),
});

export const MainSetSchema = z.object({
  structure: z.string(),
  target: z.string(),
  recovery: z.string().optional(),
  notes: z.string().optional(),
});

export const CooldownSchema = z.object({
  duration: z.string(),
  description: z.string(),
  stretches: z.array(z.string()).optional(),
});

export const SessionSchema = z.object({
  type: z.enum(['easy', 'recovery', 'long', 'threshold', 'tempo', 'speed', 'track', 'race']),
  title: z.string(),
  duration: z.string().optional(),
  effort: z.string().optional(),
  warmup: WarmupSchema.optional(),
  main: MainSetSchema.optional(),
  cooldown: CooldownSchema.optional(),
  totalTime: z.string(),
  totalDistance: z.string().optional(),
  notes: z.string().optional(),
  calibration: z.string().optional(),
});

// ============================================
// ALERT SCHEMA
// ============================================

export const AlertSchema = z.object({
  severity: z.enum(['warning', 'critical']),
  title: z.string(),
  details: z.string(),
});

// ============================================
// ACTION SCHEMA
// ============================================

export const ActionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

// ============================================
// MAIN RESPONSE SCHEMA
// ============================================

export const CoachResponseSchema = z.object({
  message: z.string(),
  session: SessionSchema.optional(),
  alert: AlertSchema.optional(),
  actions: z.array(ActionSchema).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type Warmup = z.infer<typeof WarmupSchema>;
export type MainSet = z.infer<typeof MainSetSchema>;
export type Cooldown = z.infer<typeof CooldownSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type CoachResponse = z.infer<typeof CoachResponseSchema>;

// Legacy type aliases for compatibility
export type SessionPrescription = Session;

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateCoachResponse(data: unknown): CoachResponse | null {
  const result = CoachResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseCoachResponse(text: string): CoachResponse | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    return validateCoachResponse(parsed);
  } catch {
    return null;
  }
}