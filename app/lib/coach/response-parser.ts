/**
 * COACH v2.0 - Response Parser
 * 
 * Extracts structured data from AI responses.
 * Handles various edge cases where AI doesn't return perfect JSON.
 */

import { CoachResponseSchema, type CoachResponse } from './schema';

// ============================================
// JSON EXTRACTION
// ============================================

/**
 * Extracts JSON from a potentially messy response
 */
function extractJSON(text: string): string | null {
  // Try to find JSON object in the text
  const jsonPatterns = [
    // Standard JSON object
    /\{[\s\S]*\}/,
    // JSON in code blocks
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
  ];
  
  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      // If it's a code block capture group, use group 1
      const jsonStr = match[1] || match[0];
      try {
        // Validate it's parseable
        JSON.parse(jsonStr);
        return jsonStr;
      } catch {
        // Continue to next pattern
      }
    }
  }
  
  return null;
}

/**
 * Cleans common JSON issues
 */
function cleanJSON(text: string): string {
  return text
    // Remove trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix unquoted keys
    .replace(/(\{|\,)\s*(\w+)\s*:/g, '$1"$2":')
    // Remove comments
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Normalize whitespace
    .trim();
}

// ============================================
// MAIN PARSER
// ============================================

export interface ParseResult {
  success: boolean;
  data?: CoachResponse;
  rawText: string;
  error?: string;
}

export function parseCoachResponse(text: string): ParseResult {
  if (!text || typeof text !== 'string') {
    return {
      success: false,
      rawText: text || '',
      error: 'Empty or invalid response',
    };
  }
  
  // Try to extract JSON
  let jsonStr = extractJSON(text);
  
  if (!jsonStr) {
    // No JSON found - treat entire text as message
    return {
      success: true,
      data: { message: text.trim() },
      rawText: text,
    };
  }
  
  // Clean and parse JSON
  try {
    jsonStr = cleanJSON(jsonStr);
    const parsed = JSON.parse(jsonStr);
    
    // Validate against schema
    const result = CoachResponseSchema.safeParse(parsed);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        rawText: text,
      };
    } else {
      // Schema validation failed - try to salvage
      // At minimum, we need a message
      if (typeof parsed.message === 'string') {
        return {
          success: true,
          data: { message: parsed.message },
          rawText: text,
        };
      }
      
      return {
        success: false,
        rawText: text,
        error: `Schema validation failed: ${result.error.message}`,
      };
    }
  } catch (e) {
    // JSON parse failed - treat as plain text
    return {
      success: true,
      data: { message: text.trim() },
      rawText: text,
    };
  }
}

// ============================================
// SANITIZATION
// ============================================

const FORBIDDEN_PATTERNS = [
  // Options language
  /you could (do )?(\w+) or/i,
  /option [1-9a-z]/i,
  /either .+ or/i,
  /up to you/i,
  /your (choice|call)/i,
  /choose between/i,
  /if you (want|feel|prefer).+(otherwise|or else)/i,
];

const EMOJI_PATTERN = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export interface SanitizeResult {
  sanitized: CoachResponse;
  warnings: string[];
  modified: boolean;
}

export function sanitizeResponse(response: CoachResponse): SanitizeResult {
  const warnings: string[] = [];
  let modified = false;
  let message = response.message;
  
  // Check for emojis
  if (EMOJI_PATTERN.test(message)) {
    message = message.replace(EMOJI_PATTERN, '').trim();
    warnings.push('Removed emoji from response');
    modified = true;
  }
  
  // Check for forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(message)) {
      warnings.push(`Found forbidden pattern: ${pattern.toString()}`);
      // Don't modify - just warn. The AI should be re-prompted.
    }
  }
  
  // Check response length
  const wordCount = message.split(/\s+/).length;
  if (wordCount > 150) {
    warnings.push(`Response too long: ${wordCount} words (max 150)`);
  }
  
  return {
    sanitized: { ...response, message },
    warnings,
    modified,
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function containsEmoji(text: string): boolean {
  return EMOJI_PATTERN.test(text);
}

export function containsOptions(text: string): boolean {
  return FORBIDDEN_PATTERNS.some(p => p.test(text));
}

export function getWordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// ============================================
// TIME CONSTRAINT VALIDATION
// ============================================

export function validateTimeConstraint(
  userTimeLimit: number | null,
  workoutTotalTime: string | undefined
): { valid: boolean; error?: string } {
  if (!userTimeLimit || !workoutTotalTime) {
    return { valid: true };
  }
  
  // Parse workout time (e.g., "45 min" or "40-45 min")
  const timeMatch = workoutTotalTime.match(/(\d+)(?:-(\d+))?\s*min/);
  if (!timeMatch) {
    return { valid: true }; // Can't validate, assume ok
  }
  
  const maxTime = timeMatch[2] ? parseInt(timeMatch[2]) : parseInt(timeMatch[1]);
  
  if (maxTime > userTimeLimit) {
    return {
      valid: false,
      error: `Workout time (${maxTime}min) exceeds user limit (${userTimeLimit}min)`,
    };
  }
  
  return { valid: true };
}

// ============================================
// EXTRACT TIME FROM USER MESSAGE
// ============================================

export function extractTimeConstraint(message: string): number | null {
  const patterns = [
    /(?:have|only|about|got)\s+(\d+)\s*(?:minutes?|min)/i,
    /(\d+)\s*(?:minutes?|min)\s+(?:today|available|max)/i,
    /(\d+)\s*min(?:utes?)?\s+(?:window|slot)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}