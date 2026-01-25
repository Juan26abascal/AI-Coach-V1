import { describe, expect, it } from 'vitest';
import { CoachResponseSchema } from '../lib/coach/schema';
import { deriveSafetyFlags, fallbackCoachResponse, finalizeCoachResponse } from '../lib/coach/guardrails';

const BASE_RESPONSE = {
  summary: 'Solid work today. Option A: keep it steady. Option B: push harder.',
  prescription: 'Run easy today.',
  integrationNote: 'How did it feel? Anything else? Any questions?',
};

const hasOptionLabels = (text: string) => /option\s*(a\/b|a|b)\b/i.test(text);
const countQuestions = (text: string) => (text.match(/\?/g) ?? []).length;
const hasSetsRepsRest = (text: string) => /\b\d+\s*x\s*\d+\b/i.test(text) && /\brest\b/i.test(text);

describe('coach guardrail scenarios', () => {
  it('validates schema for standard response', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    const parsed = CoachResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('removes Option A/B language', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(hasOptionLabels(result.summary)).toBe(false);
    expect(hasOptionLabels(result.prescription)).toBe(false);
  });

  it('limits followup questions to two', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    const totalQuestions =
      countQuestions(result.summary) +
      countQuestions(result.prescription) +
      countQuestions(result.integrationNote);
    expect(totalQuestions).toBeLessThanOrEqual(2);
  });

  it('ensures prescription includes sets, reps, and rest', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(hasSetsRepsRest(result.prescription)).toBe(true);
  });

  it('enforces rehab mode for pain >=5/10', () => {
    const safety = deriveSafetyFlags('Pain is 6/10 in my knee.', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.summary.toLowerCase()).toContain('rehab');
    expect(result.prescription.toLowerCase()).not.toContain('plyo');
    expect(result.prescription.toLowerCase()).not.toContain('eccentric');
  });

  it('adds medical escalation when pain is worsening', () => {
    const safety = deriveSafetyFlags('Pain is worsening after runs.', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.integrationNote).toContain('medical evaluation');
  });

  it('enforces recovery mode for readiness red', () => {
    const safety = deriveSafetyFlags('Daily check-in submitted', {
      checkIns: [{ readiness: 1, soreness: 3, sleep: 2, motivation: 2, createdAt: new Date().toISOString() }],
    });
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.summary.toLowerCase()).toContain('recovery');
    expect(result.prescription.toLowerCase()).toContain('easy walk');
  });

  it('rehab mode takes precedence when readiness is red and pain is high', () => {
    const safety = deriveSafetyFlags('Pain 8/10 today.', {
      checkIns: [{ readiness: 1, soreness: 4, sleep: 2, motivation: 1, createdAt: new Date().toISOString() }],
    });
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.summary.toLowerCase()).toContain('rehab');
  });

  it('detects pain from recent workouts', () => {
    const safety = deriveSafetyFlags('Check-in', {
      workouts: [
        {
          id: 'w1',
          date: '2024-05-01',
          title: 'Easy run',
          durationMinutes: 30,
          effort: 'Easy',
          pain: '5/10',
        },
      ],
    });
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.summary.toLowerCase()).toContain('rehab');
  });

  it('adds medical escalation for persistent note', () => {
    const safety = deriveSafetyFlags('Check-in', {
      checkIns: [
        {
          readiness: 3,
          soreness: 3,
          sleep: 3,
          motivation: 3,
          note: 'Persistent Achilles pain after runs.',
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.integrationNote).toContain('medical evaluation');
  });

  it('fallback responses still pass schema', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const fallback = fallbackCoachResponse(safety);
    const parsed = CoachResponseSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });

  it('preserves structured prescriptions when already valid', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const structured = {
      summary: 'Keep today controlled and precise.',
      prescription: '5 x 400m at 5k pace, 90s rest between reps.',
      integrationNote: 'Note how rep 4 feels relative to rep 1.',
    };
    const result = finalizeCoachResponse(structured, safety);
    expect(result.prescription).toContain('5 x 400m');
    expect(hasSetsRepsRest(result.prescription)).toBe(true);
  });
});
