/**
 * Response Parser
 * 
 * Extracts structured data from the AI's raw text response.
 * Handles various edge cases where the AI doesn't return perfect JSON.
 */

import type { CoachResponse, SessionPrescription } from './types';

/**
 * Attempt to parse JSON from a string that may have extra text
 */
function tryExtractJSON(text: string): unknown | null {
  // First, try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue to other methods
  }

  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to fix common issues
      let fixed = jsonMatch[0];
      
      // Fix trailing commas
      fixed = fixed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      
      // Fix single quotes (risky but sometimes works)
      // Only do this if double quotes aren't present
      if (!fixed.includes('"') && fixed.includes("'")) {
        fixed = fixed.replace(/'/g, '"');
      }
      
      try {
        return JSON.parse(fixed);
      } catch {
        // Give up
      }
    }
  }

  return null;
}

/**
 * Check if an object looks like a SessionPrescription
 */
export function validateSessionPrescription(session: unknown): session is SessionPrescription {
  if (!session || typeof session !== 'object') return false;
  
  const s = session as Record<string, unknown>;
  
  // Required fields
  const requiredFields = ['type', 'title', 'warmup', 'main', 'cooldown', 'totalTime'];
  for (const field of requiredFields) {
    if (!(field in s)) {
      console.warn(`Session missing required field: ${field}`);
      return false;
    }
  }

  // Validate type
  const validTypes = ['threshold', 'easy', 'long', 'speed', 'recovery', 'race'];
  if (!validTypes.includes(s.type as string)) {
    console.warn(`Invalid session type: ${s.type}`);
    return false;
  }

  // Validate nested objects
  if (!s.warmup || typeof s.warmup !== 'object') return false;
  if (!s.main || typeof s.main !== 'object') return false;
  if (!s.cooldown || typeof s.cooldown !== 'object') return false;

  return true;
}

/**
 * Check if an object looks like a CoachResponse
 */
export function validateCoachResponse(response: unknown): response is CoachResponse {
  if (!response || typeof response !== 'object') return false;
  
  const r = response as Record<string, unknown>;
  
  // Must have message
  if (typeof r.message !== 'string') {
    console.warn('Response missing message field');
    return false;
  }

  // Validate session if present
  if (r.session && !validateSessionPrescription(r.session)) {
    console.warn('Response has invalid session');
    // Don't fail completely, just remove the invalid session
    delete r.session;
  }

  // Validate alert if present
  if (r.alert) {
    const alert = r.alert as Record<string, unknown>;
    if (!alert.severity || !alert.title || !alert.details) {
      console.warn('Response has invalid alert');
      delete r.alert;
    }
  }

  // Validate actions if present
  if (r.actions) {
    if (!Array.isArray(r.actions)) {
      console.warn('Response has invalid actions (not array)');
      delete r.actions;
    }
  }

  return true;
}

/**
 * Main parsing function - takes raw AI response and returns structured CoachResponse
 */
export function parseCoachResponse(rawResponse: string): CoachResponse {
  if (!rawResponse || typeof rawResponse !== 'string') {
    return {
      message: 'No response received.',
      confidence: 'low'
    };
  }

  // Try to extract JSON
  const parsed = tryExtractJSON(rawResponse);

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    
    // Check if it's a valid coach response
    if (validateCoachResponse(obj)) {
      return {
        message: obj.message as string,
        session: obj.session as SessionPrescription | undefined,
        alert: obj.alert as CoachResponse['alert'],
        actions: obj.actions as CoachResponse['actions'],
        confidence: (obj.confidence as CoachResponse['confidence']) || 'medium'
      };
    }

    // It's JSON but not the right structure - try to salvage
    if (typeof obj.message === 'string') {
      return {
        message: obj.message,
        confidence: 'low'
      };
    }

    // Check for reply field (old format)
    if (typeof obj.reply === 'string') {
      return {
        message: obj.reply,
        confidence: 'low'
      };
    }
  }

  // Couldn't parse JSON - use raw text as message
  return {
    message: rawResponse.trim(),
    confidence: 'low'
  };
}

/**
 * Remove emojis from text
 */
function removeEmojis(text: string): string {
  // Comprehensive emoji regex
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '');
}

/**
 * Sanitize the response - remove emojis, clean up formatting
 */
export function sanitizeResponse(response: CoachResponse): CoachResponse {
  return {
    ...response,
    message: removeEmojis(response.message).trim(),
    confidence: response.confidence || 'medium'
  };
}

/**
 * Extract just the message text
 */
export function extractMessage(response: CoachResponse): string {
  return response.message;
}

/**
 * Check if response has a workout card
 */
export function hasWorkoutCard(response: CoachResponse): boolean {
  return !!response.session && validateSessionPrescription(response.session);
}

/**
 * Check if response has an alert
 */
export function hasAlert(response: CoachResponse): boolean {
  return !!response.alert && !!response.alert.severity && !!response.alert.title;
}

/**
 * Check if response has quick actions
 */
export function hasActions(response: CoachResponse): boolean {
  return !!response.actions && Array.isArray(response.actions) && response.actions.length > 0;
}