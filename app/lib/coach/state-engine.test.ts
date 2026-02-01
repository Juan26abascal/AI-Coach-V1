import { clearAll, saveAthleteProfile, saveCheckIn, saveSession } from "../storage";
import { computeAthleteState, formatStateForPrompt } from "./state-engine";
import type { AthleteProfile, CheckInData, SessionLog, SessionPrescription } from "./types";

const now = new Date();
const isoDaysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const testCheckIns: CheckInData[] = [
  {
    readiness: 72,
    soreness: 27,
    sleepQuality: 78,
    motivation: 82,
    timestamp: isoDaysAgo(0),
  },
  {
    readiness: 68,
    soreness: 33,
    sleepQuality: 70,
    motivation: 76,
    timestamp: isoDaysAgo(1),
  },
  {
    readiness: 65,
    soreness: 38,
    sleepQuality: 68,
    motivation: 74,
    notes: "Noticed a little tightness in the left calf after the long run.",
    timestamp: isoDaysAgo(2),
  },
];

const sessionDates = [2, 4, 6, 9, 12].map((d) => isoDaysAgo(d));

const createSession = (
  id: string,
  date: string,
  type: SessionPrescription['type'],
  title: string,
  warmupDuration: string,
  warmupDesc: string,
  mainStructure: string,
  mainTarget: string,
  cooldownDuration: string,
  cooldownDesc: string,
  totalTime: string,
  actualDuration: number
): SessionLog => ({
  id,
  date,
  plannedSession: {
    type,
    title,
    warmup: { duration: warmupDuration, description: warmupDesc },
    main: { structure: mainStructure, target: mainTarget },
    cooldown: { duration: cooldownDuration, description: cooldownDesc },
    totalTime,
  },
  status: 'completed',
  actualDuration,
});

const testSessions: SessionLog[] = [
  createSession("session-1", sessionDates[0], "easy", "Recovery jog", "10 min", "Easy pace warmup", "30 min easy run", "Conversational pace", "5 min", "Walk and stretch", "45 min", 42),
  createSession("session-2", sessionDates[1], "threshold", "Tempo mix", "15 min", "Easy jog", "3x8min @ tempo", "8:00/mile with 2 min jog recoveries", "10 min", "Jog and strides", "50 min", 51),
  createSession("session-3", sessionDates[2], "long", "Endurance builder", "15 min", "Easy warmup", "90 min long run", "Zone 2 effort", "10 min", "Walk plus core", "115 min", 110),
  createSession("session-4", sessionDates[3], "speed", "Track ladders", "20 min", "Dynamic warmup + strides", "8x400m w/ 400m jog", "5k pace with 90s jog", "10 min", "Easy jog", "40 min", 38),
  createSession("session-5", sessionDates[4], "easy", "Recovery shakeout", "10 min", "Easy stride", "25 min easy run", "Keep HR low", "5 min", "Stretch", "40 min", 37),
];

const profile: AthleteProfile = {
  name: "Manual Test Athlete",
  goalEvent: {
    name: "Mock Marathon",
    date: isoDaysAgo(-60),
    distance: "Marathon",
    goalTime: "3:45",
  },
  methodology: "polarized",
  currentPhase: "build",
  weeklyRunDays: 5,
  experienceLevel: "intermediate",
};

function populateStorage() {
  clearAll();
  saveAthleteProfile(profile);
  testCheckIns.forEach(saveCheckIn);
  testSessions.forEach(saveSession);
}

function runTest() {
  populateStorage();
  const state = computeAthleteState();
  console.log("Computed athlete state:", state);
  const formatted = formatStateForPrompt(state);
  console.log("Formatted state for prompt:\n", formatted);
}

runTest();
