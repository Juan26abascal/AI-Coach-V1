'use client';

import { useState } from 'react';
import { 
  saveCheckIn, 
  getRecentCheckIns, 
  saveSession, 
  getRecentSessions,
  saveAthleteProfile,
  getAthleteProfile,
  clearAll 
} from '@/lib/storage';
import { 
  computeAthleteState, 
  formatStateForPrompt,
  computeTrainingLoads,
  analyzeTrends
} from '@/lib/coach/state-engine';
import type { CheckInData, SessionLog, SessionPrescription, AthleteProfile } from '@/lib/coach/types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to get date string for N days ago
const daysAgo = (n: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString();
};

export default function TestPage() {
  const [output, setOutput] = useState<string>('Click a button to test...');
  const [error, setError] = useState<string | null>(null);

  const log = (label: string, data: any) => {
    const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    setOutput(prev => `${prev}\n\n--- ${label} ---\n${formatted}`);
  };

  const clearOutput = () => {
    setOutput('');
    setError(null);
  };

  // Test 1: Add Mock Check-Ins
  const addMockCheckIns = () => {
    try {
      clearOutput();
      log('Adding Mock Check-Ins', 'Creating 5 check-ins over past 5 days...');

      const checkIns: CheckInData[] = [
        { readiness: 75, soreness: 30, sleepQuality: 80, motivation: 70, notes: undefined, timestamp: daysAgo(4) },
        { readiness: 68, soreness: 40, sleepQuality: 60, motivation: 65, notes: 'Felt a bit tired', timestamp: daysAgo(3) },
        { readiness: 72, soreness: 35, sleepQuality: 75, motivation: 72, notes: undefined, timestamp: daysAgo(2) },
        { readiness: 65, soreness: 45, sleepQuality: 55, motivation: 60, notes: 'Work stress', timestamp: daysAgo(1) },
        { readiness: 70, soreness: 38, sleepQuality: 70, motivation: 68, notes: undefined, timestamp: daysAgo(0) },
      ];

      checkIns.forEach((checkIn, i) => {
        saveCheckIn(checkIn);
        log(`Check-in ${i + 1}`, checkIn);
      });

      // Verify storage
      const stored = getRecentCheckIns(7);
      log('Verification - Stored Check-Ins', `Found ${stored.length} check-ins in storage`);
      log('Stored Data', stored);

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Test 2: Add Mock Sessions
  const addMockSessions = () => {
    try {
      clearOutput();
      log('Adding Mock Sessions', 'Creating 8 sessions over past 14 days...');

      const createSession = (
        type: SessionPrescription['type'],
        title: string,
        totalTime: string,
        daysAgoNum: number,
        status: 'completed' | 'modified' | 'skipped' = 'completed',
        actualDuration?: number
      ): SessionLog => ({
        id: generateId(),
        date: daysAgo(daysAgoNum),
        plannedSession: {
          type,
          title,
          warmup: { duration: '10 min', description: 'Easy jog' },
          main: { structure: 'Main set', target: 'As planned', recovery: '90s' },
          cooldown: { duration: '5 min', description: 'Walk' },
          totalTime,
        },
        status,
        actualDuration: actualDuration || parseInt(totalTime),
        feedback: status === 'completed' ? 'Felt good' : undefined,
      });

      const sessions: SessionLog[] = [
        createSession('easy', 'Easy Run', '40 min', 13, 'completed', 42),
        createSession('threshold', 'Threshold Intervals', '50 min', 11, 'completed', 52),
        createSession('easy', 'Recovery Run', '30 min', 10, 'completed', 30),
        createSession('long', 'Long Run', '90 min', 8, 'completed', 95),
        createSession('easy', 'Easy Run', '40 min', 6, 'completed', 38),
        createSession('speed', 'Track Intervals', '45 min', 4, 'modified', 35),
        createSession('threshold', 'Tempo Run', '50 min', 2, 'completed', 48),
        createSession('recovery', 'Shakeout', '30 min', 1, 'completed', 25),
      ];

      sessions.forEach((session, i) => {
        saveSession(session);
        log(`Session ${i + 1}`, {
          type: session.plannedSession.type,
          title: session.plannedSession.title,
          date: session.date,
          duration: session.actualDuration,
          status: session.status
        });
      });

      // Verify storage
      const stored = getRecentSessions(28);
      log('Verification - Stored Sessions', `Found ${stored.length} sessions in storage`);

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Test 3: Add Mock Profile
  const addMockProfile = () => {
    try {
      clearOutput();
      log('Adding Mock Profile', 'Creating athlete profile...');

      const profile: AthleteProfile = {
        name: 'Test Runner',
        goalEvent: {
          name: 'Spring Half Marathon',
          date: '2026-04-15',
          distance: 'half-marathon',
          goalTime: '1:45:00'
        },
        methodology: 'balanced',
        currentPhase: 'build',
        weeklyRunDays: 4,
        experienceLevel: 'intermediate'
      };

      saveAthleteProfile(profile);
      log('Profile Saved', profile);

      // Verify
      const stored = getAthleteProfile();
      log('Verification - Stored Profile', stored);

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Test 4: Compute Athlete State
  const testComputeState = () => {
    try {
      clearOutput();
      log('Computing Athlete State', 'Gathering data and computing...');

      // First show what data we have
      const checkIns = getRecentCheckIns(7);
      const sessions = getRecentSessions(28);
      const profile = getAthleteProfile();

      log('Available Data', {
        checkInsCount: checkIns.length,
        sessionsCount: sessions.length,
        hasProfile: !!profile
      });

      if (checkIns.length === 0) {
        log('WARNING', 'No check-ins found! Run "Add Mock Check-Ins" first.');
      }

      if (sessions.length === 0) {
        log('WARNING', 'No sessions found! Run "Add Mock Sessions" first.');
      }

      // Compute training loads directly
      if (sessions.length > 0) {
        const loads = computeTrainingLoads(sessions);
        log('Training Loads', loads);
      }

      // Analyze trends directly
      if (checkIns.length > 0) {
        const trends = analyzeTrends(checkIns);
        log('Trends Analysis', trends);
      }

      // Compute full state
      const state = computeAthleteState();
      log('Full Athlete State', state);

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('State computation error:', err);
    }
  };

  // Test 5: Format State for Prompt
  const testFormatPrompt = () => {
    try {
      clearOutput();
      log('Formatting State for Prompt', 'Computing state and formatting...');

      const state = computeAthleteState();
      log('Computed State', state);

      const formatted = formatStateForPrompt(state);
      log('Formatted for Prompt', formatted);

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Format prompt error:', err);
    }
  };

  // Test 6: View Raw Storage
  const viewRawStorage = () => {
    try {
      clearOutput();
      log('Raw localStorage Contents', 'Reading all coach_ keys...');

      if (typeof window === 'undefined') {
        log('Error', 'localStorage not available (server-side)');
        return;
      }

      const keys = Object.keys(localStorage).filter(k => k.startsWith('coach_'));
      
      if (keys.length === 0) {
        log('Result', 'No coach_ keys found in localStorage');
        return;
      }

      keys.forEach(key => {
        const value = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(value || '');
          log(key, parsed);
        } catch {
          log(key, value);
        }
      });

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Test 7: Clear All Data
  const handleClearAll = () => {
    try {
      clearOutput();
      clearAll();
      log('Cleared', 'All coach data has been removed from localStorage');
      
      // Verify
      const keys = Object.keys(localStorage).filter(k => k.startsWith('coach_'));
      log('Verification', `Remaining coach_ keys: ${keys.length}`);

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E4DE] p-8">
      <h1 className="text-2xl font-bold mb-6">Coach Brain Test Page</h1>
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={addMockProfile}
          className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition"
        >
          1. Add Mock Profile
        </button>
        <button
          onClick={addMockCheckIns}
          className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition"
        >
          2. Add Mock Check-Ins
        </button>
        <button
          onClick={addMockSessions}
          className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition"
        >
          3. Add Mock Sessions
        </button>
        <button
          onClick={testComputeState}
          className="px-4 py-2 bg-[#4A5D4A] hover:bg-[#5A6D5A] rounded-lg transition"
        >
          4. Compute State
        </button>
        <button
          onClick={testFormatPrompt}
          className="px-4 py-2 bg-[#4A5D4A] hover:bg-[#5A6D5A] rounded-lg transition"
        >
          5. Format for Prompt
        </button>
        <button
          onClick={viewRawStorage}
          className="px-4 py-2 bg-[#5A5A3A] hover:bg-[#6A6A4A] rounded-lg transition"
        >
          View Raw Storage
        </button>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-[#5A3A3A] hover:bg-[#6A4A4A] rounded-lg transition"
        >
          Clear All Data
        </button>
        <button
          onClick={clearOutput}
          className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition"
        >
          Clear Output
        </button>
      </div>

      <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#333]">
        <h2 className="text-sm text-[#888] mb-2 uppercase tracking-wide">Output</h2>
        <pre className="whitespace-pre-wrap text-sm font-mono text-[#C8C4BE] overflow-auto max-h-[600px]">
          {output || 'No output yet...'}
        </pre>
      </div>

      <div className="mt-6 text-sm text-[#666]">
        <h3 className="text-[#888] mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Clear All Data" to start fresh</li>
          <li>Click "Add Mock Profile" to create athlete profile</li>
          <li>Click "Add Mock Check-Ins" to add 5 days of check-in data</li>
          <li>Click "Add Mock Sessions" to add 8 training sessions</li>
          <li>Click "Compute State" to see the computed athlete state</li>
          <li>Click "Format for Prompt" to see the formatted string for AI</li>
          <li>Use "View Raw Storage" to inspect what's actually stored</li>
        </ol>
      </div>
    </div>
  );
}