import { z } from 'zod';

// Session prescription schema for workout cards
export const SessionPrescriptionSchema = z.object({
  type: z.enum(['easy', 'recovery', 'threshold', 'tempo', 'speed', 'long', 'race']),
  title: z.string().min(1),
  duration: z.string().optional(),
  effort: z.string().optional(),
  notes: z.string().optional(),
  warmup: z.object({
    duration: z.string(),
    description: z.string(),
    drills: z.array(z.string()).optional(),
  }).optional(),
  main: z.object({
    structure: z.string(),
    target: z.string(),
    recovery: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  cooldown: z.object({
    duration: z.string(),
    description: z.string(),
    stretches: z.array(z.string()).optional(),
  }).optional(),
  totalTime: z.string(),
  totalDistance: z.string().optional(),
  calibration: z.string().optional(),
});

export type SessionPrescription = z.infer<typeof SessionPrescriptionSchema>;

// Alert schema
export const AlertSchema = z.object({
  severity: z.enum(['warning', 'critical']),
  title: z.string().min(1),
  details: z.string().min(1),
});

export type CoachAlert = z.infer<typeof AlertSchema>;

// Action schema
export const ActionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

// New coach response format - what the AI returns
export const CoachResponseSchema = z.object({
  message: z.string().min(1),
  session: SessionPrescriptionSchema.optional(),
  alert: AlertSchema.optional(),
  actions: z.array(ActionSchema).optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;

// Legacy format for backward compatibility with existing guardrails
export const LegacyCoachResponseSchema = z.object({
  summary: z.string().min(1),
  prescription: z.string().min(1),
  integrationNote: z.string().min(1),
});

export type LegacyCoachResponse = z.infer<typeof LegacyCoachResponseSchema>;

// Parse a response that could be either format
export function parseCoachResponseFlexible(data: unknown): CoachResponse | null {
  // Try new format first
  const newResult = CoachResponseSchema.safeParse(data);
  if (newResult.success) {
    return newResult.data;
  }

  // Try legacy format and convert
  const legacyResult = LegacyCoachResponseSchema.safeParse(data);
  if (legacyResult.success) {
    return {
      message: legacyResult.data.summary,
      confidence: 'medium',
    };
  }

  return null;
}

// JSON schema for OpenAI structured output
export const coachResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    message: { type: 'string', minLength: 1 },
    session: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['easy', 'recovery', 'threshold', 'tempo', 'speed', 'long', 'race'] },
        title: { type: 'string' },
        duration: { type: 'string' },
        effort: { type: 'string' },
        notes: { type: 'string' },
        warmup: {
          type: 'object',
          properties: {
            duration: { type: 'string' },
            description: { type: 'string' },
          },
        },
        main: {
          type: 'object',
          properties: {
            structure: { type: 'string' },
            target: { type: 'string' },
            recovery: { type: 'string' },
            notes: { type: 'string' },
          },
        },
        cooldown: {
          type: 'object',
          properties: {
            duration: { type: 'string' },
            description: { type: 'string' },
          },
        },
        totalTime: { type: 'string' },
        totalDistance: { type: 'string' },
      },
      required: ['type', 'title', 'totalTime'],
    },
    alert: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['warning', 'critical'] },
        title: { type: 'string' },
        details: { type: 'string' },
      },
      required: ['severity', 'title', 'details'],
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['message'],
};
