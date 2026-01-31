import { z } from 'zod';

export const CoachResponseSchema = z.object({
  summary: z.string().min(1),
  prescription: z.string().min(1),
  integrationNote: z.string().min(1),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;

export const coachResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', minLength: 1 },
    prescription: { type: 'string', minLength: 1 },
    integrationNote: { type: 'string', minLength: 1 },
  },
  required: ['summary', 'prescription', 'integrationNote'],
};
