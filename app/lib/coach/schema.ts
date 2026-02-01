/**
 * COACH v2.0 - Schema Definitions
 * Zod schemas for all coach responses
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

// Simple session (easy, recovery, long runs)
export const SimpleSessionSchema = z.object({
  type: z.enum(['easy', 'recovery', 'long']),
  title: z.string(),
  duration: z.string(),
  effort: z.string(),
  notes: z.string().optional(),
  totalTime: z.string(),
  totalDistance: z.string().optional(),
});

// Structured session (threshold, tempo, speed)
export const StructuredSessionSchema = z.object({
  type: z.enum(['threshold', 'tempo', 'speed', 'track', 'race']),
  title: z.string(),
  warmup: WarmupSchema,
  main: MainSetSchema,
  cooldown: CooldownSchema,
  totalTime: z.string(),
  totalDistance: z.string().optional(),
});

// Combined session type
export const SessionSchema = z.union([SimpleSessionSchema, StructuredSessionSchema]);

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
// SPECIALIZED RESPONSE SCHEMAS
// ============================================

export const GreetingResponseSchema = z.object({
  message: z.string(),
});

export const CheckInResponseSchema = z.object({
  message: z.string(),
  acknowledged: z.boolean().optional(),
  workoutLogged: z.object({
    distance: z.number().optional(),
    duration: z.number().optional(),
    effort: z.string().optional(),
  }).optional(),
});

export const InjuryResponseSchema = z.object({
  message: z.string(),
  alert: AlertSchema.optional(),
  severity: z.number().min(1).max(4).optional(),
  recommendation: z.string().optional(),
  followUpQuestions: z.array(z.string()).optional(),
});

export const PlanQueryResponseSchema = z.object({
  message: z.string(),
  weekOverview: z.array(z.object({
    day: z.string(),
    type: z.string(),
    summary: z.string(),
  })).optional(),
});

// ============================================
// MEMORY UPDATE SCHEMA
// ============================================

export const MemoryUpdateSchema = z.object({
  layer: z.enum(['metrics', 'patterns', 'threads', 'session']),
  updates: z.record(z.unknown()),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type Warmup = z.infer<typeof WarmupSchema>;
export type MainSet = z.infer<typeof MainSetSchema>;
export type Cooldown = z.infer<typeof CooldownSchema>;
export type SimpleSession = z.infer<typeof SimpleSessionSchema>;
export type StructuredSession = z.infer<typeof StructuredSessionSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type CoachResponse = z.infer<typeof CoachResponseSchema>;
export type GreetingResponse = z.infer<typeof GreetingResponseSchema>;
export type CheckInResponse = z.infer<typeof CheckInResponseSchema>;
export type InjuryResponse = z.infer<typeof InjuryResponseSchema>;
export type PlanQueryResponse = z.infer<typeof PlanQueryResponseSchema>;
export type MemoryUpdate = z.infer<typeof MemoryUpdateSchema>;

// ============================================
// VALIDATION HELPER
// ============================================

export function validateResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { 
    success: false, 
    error: result.error.errors.map(e => e.message).join(', ') 
  };
}

export function safeParseCoachResponse(data: unknown): CoachResponse | null {
  const result = CoachResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}
