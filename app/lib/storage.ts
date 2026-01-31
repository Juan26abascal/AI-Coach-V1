/**
 * Storage utilities for the Coach app
 * Uses localStorage for persistence (temporary solution until database is added)
 * 
 * All keys are prefixed with 'coach_' to avoid conflicts
 */

import type { CheckInData, SessionLog, AthleteProfile, ConversationMessage } from './coach/types';

// Storage keys
const KEYS = {
  CHECK_INS: 'coach_checkins',
  SESSIONS: 'coach_sessions',
  PROFILE: 'coach_profile',
  CONVERSATION: 'coach_conversation',
} as const;

// Helper to check if we're in browser
const isBrowser = (): boolean => typeof window !== 'undefined';

// Helper to safely parse JSON
const safeJsonParse = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('Failed to parse JSON from storage');
    return fallback;
  }
};

// Helper to safely stringify and store
const safeStore = (key: string, data: unknown): boolean => {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to store data:', err);
    return false;
  }
};

// Helper to get stored data
const safeGet = <T>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;
  const stored = localStorage.getItem(key);
  return safeJsonParse(stored, fallback);
};

// ============================================
// CHECK-INS
// ============================================

/**
 * Save a daily check-in
 * Stores check-ins in an array, most recent first
 */
export const saveCheckIn = (data: CheckInData): void => {
  const existing = getRecentCheckIns(365); // Get all
  const updated = [data, ...existing];
  safeStore(KEYS.CHECK_INS, updated);
};

/**
 * Get check-ins from the last N days
 */
export const getRecentCheckIns = (days: number): CheckInData[] => {
  const all = safeGet<CheckInData[]>(KEYS.CHECK_INS, []);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return all.filter(checkIn => {
    const checkInDate = new Date(checkIn.timestamp);
    return checkInDate >= cutoff;
  });
};

/**
 * Get today's check-in if it exists
 */
export const getTodayCheckIn = (): CheckInData | null => {
  const today = new Date().toDateString();
  const all = safeGet<CheckInData[]>(KEYS.CHECK_INS, []);
  
  return all.find(checkIn => {
    const checkInDate = new Date(checkIn.timestamp).toDateString();
    return checkInDate === today;
  }) || null;
};

// ============================================
// SESSIONS
// ============================================

/**
 * Save a training session log
 */
export const saveSession = (session: SessionLog): void => {
  const existing = getRecentSessions(365); // Get all
  // Check if session with this ID already exists
  const filtered = existing.filter(s => s.id !== session.id);
  const updated = [session, ...filtered];
  safeStore(KEYS.SESSIONS, updated);
};

/**
 * Get sessions from the last N days
 */
export const getRecentSessions = (days: number): SessionLog[] => {
  const all = safeGet<SessionLog[]>(KEYS.SESSIONS, []);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return all.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate >= cutoff;
  });
};

/**
 * Update an existing session (e.g., mark as completed)
 */
export const updateSession = (sessionId: string, updates: Partial<SessionLog>): void => {
  const all = safeGet<SessionLog[]>(KEYS.SESSIONS, []);
  const updated = all.map(session => 
    session.id === sessionId ? { ...session, ...updates } : session
  );
  safeStore(KEYS.SESSIONS, updated);
};

/**
 * Get a specific session by ID
 */
export const getSession = (sessionId: string): SessionLog | null => {
  const all = safeGet<SessionLog[]>(KEYS.SESSIONS, []);
  return all.find(s => s.id === sessionId) || null;
};

// ============================================
// ATHLETE PROFILE
// ============================================

/**
 * Save or update the athlete profile
 */
export const saveAthleteProfile = (profile: AthleteProfile): void => {
  safeStore(KEYS.PROFILE, profile);
};

/**
 * Get the athlete profile
 */
export const getAthleteProfile = (): AthleteProfile | null => {
  return safeGet<AthleteProfile | null>(KEYS.PROFILE, null);
};

// ============================================
// CONVERSATION
// ============================================

/**
 * Save the conversation history
 */
export const saveConversation = (messages: ConversationMessage[]): void => {
  // Keep only last 50 messages to avoid storage limits
  const trimmed = messages.slice(-50);
  safeStore(KEYS.CONVERSATION, trimmed);
};

/**
 * Get the conversation history
 */
export const getConversation = (): ConversationMessage[] => {
  return safeGet<ConversationMessage[]>(KEYS.CONVERSATION, []);
};

/**
 * Add a single message to conversation
 */
export const addMessage = (message: ConversationMessage): void => {
  const existing = getConversation();
  saveConversation([...existing, message]);
};

// ============================================
// UTILITIES
// ============================================

/**
 * Clear all coach data from localStorage
 */
export const clearAll = (): void => {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Export all data (for backup)
 */
export const exportAllData = (): {
  checkIns: CheckInData[];
  sessions: SessionLog[];
  profile: AthleteProfile | null;
  conversation: ConversationMessage[];
} => {
  return {
    checkIns: safeGet<CheckInData[]>(KEYS.CHECK_INS, []),
    sessions: safeGet<SessionLog[]>(KEYS.SESSIONS, []),
    profile: getAthleteProfile(),
    conversation: getConversation(),
  };
};

/**
 * Import data (for restore)
 */
export const importAllData = (data: {
  checkIns?: CheckInData[];
  sessions?: SessionLog[];
  profile?: AthleteProfile;
  conversation?: ConversationMessage[];
}): void => {
  if (data.checkIns) safeStore(KEYS.CHECK_INS, data.checkIns);
  if (data.sessions) safeStore(KEYS.SESSIONS, data.sessions);
  if (data.profile) safeStore(KEYS.PROFILE, data.profile);
  if (data.conversation) safeStore(KEYS.CONVERSATION, data.conversation);
};