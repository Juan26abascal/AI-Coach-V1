import { clearAll, saveAthleteProfile, saveCheckIn, saveSession } from "../storage";
import { computeAthleteState, formatStateForPrompt } from "./state-engine";

const now = new Date();
const isoDaysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const testCheckIns = [
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

const nowBack = new Date();
const sessionDates = [2, 4, 6, 9, 12].map((d) => isoDaysAgo(d));

const testSessions = [
  {
    id: "session-1",
    date: sessionDates[0],
    plannedSession: {
      type: "easy",
      title: "Recovery jog",
      warmup: {
        duration: "10 min",
        description: "Easy pace warmup",
      },
      main: {
        structure: "30 min easy run",
        target: "Conversational pace",
      },
      cooldown: {
        duration: "5 min",
        description: "Walk and stretch",
      },
      totalTime: "45 min",
    },
    status: "completed",
    actualDuration: 42,
  },
  {
    id: "session-2",
    date: sessionDates[1],
    plannedSession: {
      type: "threshold",
      title: "Tempo mix",
      warmup: {
        duration: "15 min",
        description: "Easy jog",
      },
      main: {
        structure: "3x8min @ tempo",
        target: "8:00/mile with 2 min jog recoveries",
      },
      cooldown: {
        duration: "10 min",
        description: "Jog and strides",
      },
      totalTime: "50 min",
    },
    status: "completed",
    actualDuration: 51,
  },
  {
    id: "session-3",
    date: sessionDates[2],
    plannedSession: {
      type: "long",
      title: "Endurance builder",
      warmup: {
        duration: "15 min",
        description: "Easy warmup",
      },
      main: {
        structure: "90 min long run",
        target: "Zone 2 effort",
      },
      cooldown: {
        duration: "10 min",
        description: "Walk plus core",
      },
      totalTime: "115 min",
    },
    status: "completed",
    actualDuration: 110,
  },
  {
    id: "session-4",
    date: sessionDates[3],
    plannedSession: {
      type: "speed",
      title: "Track ladders",
      warmup: {
        duration: "20 min",
        description: "Dynamic warmup + strides",
      },
      main: {
        structure: "8x400m w/ 400m jog",
        target: "5k pace with 90s jog",
      },
      cooldown: {
        duration: "10 min",
        description: "Easy jog",
      },
      totalTime: "40 min",
    },
    status: "completed",
    actualDuration: 38,
  },
  {
    id: "session-5",
    date: sessionDates[4],
    plannedSession: {
      type: "easy",
      title: "Recovery shakeout",
      warmup: {
        duration: "10 min",
        description: "Easy stride",
      },
      main: {
        structure: "25 min easy run",
        target: "Keep HR low",
      },
      cooldown: {
        duration: "5 min",
        description: "Stretch",
      },
      totalTime: "40 min",
    },
    status: "completed",
    actualDuration: 37,
  },
];

const profile = {
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
