import { SessionType, WorkoutCardType } from './types';

/**
 * Determines which workout card format to use based on session type
 */
export function selectCardType(sessionType: SessionType): WorkoutCardType {
  switch (sessionType) {
    case 'easy':
    case 'recovery':
      return 'simple';
    
    case 'long':
      // Long runs are simple unless they have specific structure
      // This decision can be refined based on workout details
      return 'simple';
    
    case 'threshold':
    case 'tempo':
      return 'standard';
    
    case 'speed':
    case 'track':
    case 'race':
      return 'complex';
    
    default:
      // Default to simple when uncertain
      return 'simple';
  }
}

/**
 * Validates that workout card matches expected format
 */
export function validateCardFormat(
  card: WorkoutCard,
  expectedType: WorkoutCardType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (expectedType === 'simple') {
    // Simple cards should NOT have warmup/cooldown
    if ('warmup' in card) {
      errors.push('Simple cards should not have warmup section');
    }
    if ('cooldown' in card) {
      errors.push('Simple cards should not have cooldown section');
    }
    // Simple cards MUST have duration and effort
    if (!card.duration) {
      errors.push('Simple cards must have duration');
    }
    if (!('effort' in card)) {
      errors.push('Simple cards must have effort description');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}