import { CoachResponse } from './types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates coach response before sending to user
 * Returns validation result with errors that require regeneration
 */
export function validateCoachResponse(response: CoachResponse): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Check for emojis (CRITICAL)
  if (containsEmoji(response.message)) {
    errors.push('Response contains emoji');
  }
  
  // 2. Check for option language (CRITICAL)
  const optionPatterns = [
    /you could (do )?(\w+) or/i,
    /option [1-9a-z]/i,
    /either .+ or/i,
    /if you (want|feel|prefer).+(otherwise|or else)/i,
    /up to you/i,
    /your (choice|call)/i,
    /choose between/i
  ];
  
  for (const pattern of optionPatterns) {
    if (pattern.test(response.message)) {
      errors.push(`Response contains option language: ${pattern.toString()}`);
    }
  }
  
  // 3. Check word count
  const wordCount = response.message.split(/\s+/).length;
  if (wordCount > 150) {
    errors.push(`Response too long: ${wordCount} words (max 150)`);
  } else if (wordCount > 100) {
    warnings.push(`Response is verbose: ${wordCount} words`);
  }
  
  // 4. If workout card, validate format
  if (response.session) {
    const sessionType = response.session.type;
    const hasWarmup = 'warmup' in response.session;
    const hasCooldown = 'cooldown' in response.session;
    
    // Easy/recovery runs should NOT have warmup/cooldown
    if (['easy', 'recovery'].includes(sessionType) && (hasWarmup || hasCooldown)) {
      errors.push('Easy/recovery runs should use simple card format (no warmup/cooldown)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function containsEmoji(text: string): boolean {
  // Regex to detect emoji
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
}

/**
 * Validates time constraint compliance
 */
export function validateTimeConstraint(
  userTimeLimit: number | null,
  workoutTotalTime: string
): { valid: boolean; error?: string } {
  if (!userTimeLimit) {
    return { valid: true }; // No constraint to validate
  }
  
  // Parse workout time (e.g., "45 min" or "40-45 min")
  const timeMatch = workoutTotalTime.match(/(\d+)(?:-(\d+))?\s*min/);
  if (!timeMatch) {
    return { valid: false, error: 'Cannot parse workout time' };
  }
  
  const maxTime = timeMatch[2] ? parseInt(timeMatch[2]) : parseInt(timeMatch[1]);
  
  if (maxTime > userTimeLimit) {
    return {
      valid: false,
      error: `Workout time (${maxTime}min) exceeds user limit (${userTimeLimit}min)`
    };
  }
  
  return { valid: true };
}