import { describe, expect, it } from 'vitest';
import { CoachResponseSchema, type CoachResponse } from '../lib/coach/schema';
import { deriveSafetyFlags, fallbackCoachResponse, finalizeCoachResponse } from '../lib/coach/guardrails';

const BASE_RESPONSE: CoachResponse = {
  message: 'Solid work today. Keep it steady.',
  session: {
    type: 'easy',
    title: 'Easy Run',
    duration: '35 min',
    effort: 'Conversational pace',
    totalTime: '35 min',
  },
  confidence: 'high',
};

const hasOptionLabels = (text: string) => /option\s*(a\/b|a|b)\b/i.test(text);
const countQuestions = (text: string) => (text.match(/\?/g) ?? []).length;

describe('coach guardrail scenarios', () => {
  it('validates schema for standard response', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    const parsed = CoachResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('removes Option A/B language from message', () => {
    const withOptions: CoachResponse = {
      ...BASE_RESPONSE,
      message: 'Option A: keep it steady. Option B: push harder.',
    };
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(withOptions, safety);
    expect(hasOptionLabels(result.message)).toBe(false);
  });

  it('limits followup questions to two', () => {
    const withQuestions: CoachResponse = {
      ...BASE_RESPONSE,
      message: 'How did it feel? Anything else? Any questions? More questions?',
    };
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(withQuestions, safety);
    const totalQuestions = countQuestions(result.message);
    expect(totalQuestions).toBeLessThanOrEqual(2);
  });

  it('enforces rehab mode for pain >=5/10', () => {
    const safety = deriveSafetyFlags('Pain is 6/10 in my knee.', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    // Should contain either "rehab" or "protect" language
    expect(result.message.toLowerCase()).toMatch(/rehab|protect/);
    expect(result.session?.type).toBe('recovery');
  });

  it('adds medical escalation when pain is worsening', () => {
    const safety = deriveSafetyFlags('Pain is worsening after runs.', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.message).toContain('medical evaluation');
  });

  it('enforces recovery mode for readiness red', () => {
    const safety = deriveSafetyFlags('Daily check-in submitted', {
      checkIns: [{ readiness: 1, soreness: 3, sleep: 2, motivation: 2, createdAt: new Date().toISOString() }],
    });
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.message.toLowerCase()).toContain('recovery');
    expect(result.session?.type).toBe('recovery');
  });

  it('rehab mode takes precedence when readiness is red and pain is high', () => {
    const safety = deriveSafetyFlags('Pain 8/10 today.', {
      checkIns: [{ readiness: 1, soreness: 4, sleep: 2, motivation: 1, createdAt: new Date().toISOString() }],
    });
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.message.toLowerCase()).toMatch(/rehab|protect/);
    expect(result.alert?.severity).toBe('warning');
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
    expect(result.message.toLowerCase()).toMatch(/rehab|protect/);
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
    expect(result.message).toContain('medical evaluation');
  });

  it('fallback responses still pass schema', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const fallback = fallbackCoachResponse(safety);
    const parsed = CoachResponseSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });

  it('has valid confidence level', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(['high', 'medium', 'low']).toContain(result.confidence);
  });

  it('includes session when prescribing workout', () => {
    const safety = deriveSafetyFlags('Normal check-in', undefined);
    const result = finalizeCoachResponse(BASE_RESPONSE, safety);
    expect(result.session).toBeDefined();
    expect(result.session?.type).toBeDefined();
    expect(result.session?.title).toBeDefined();
    expect(result.session?.totalTime).toBeDefined();
  });
});
