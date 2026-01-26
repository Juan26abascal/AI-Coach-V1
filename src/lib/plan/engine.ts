import type { Athlete, CheckIn, PlanDay, TrainingPlan, Workout } from '@/types';

export type PlanEngineInput = {
  athlete: Athlete;
  workouts: Workout[];
  checkIns: CheckIn[];
  currentPlan?: TrainingPlan | null;
};

const RUN_DAY_PATTERNS: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 3, 5, 6],
  5: [1, 2, 3, 5, 6],
  6: [0, 1, 2, 3, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function summarizeCheckIns(checkIns: CheckIn[]) {
  const recent = checkIns.slice(0, 3);
  if (!recent.length) {
    return { readiness: 3, soreness: 2 };
  }
  const totals = recent.reduce(
    (acc, checkIn) => {
      acc.readiness += checkIn.readiness;
      acc.soreness += checkIn.soreness;
      return acc;
    },
    { readiness: 0, soreness: 0 }
  );
  return {
    readiness: totals.readiness / recent.length,
    soreness: totals.soreness / recent.length,
  };
}

function buildRunDay(title: string, details: string, focus: string): PlanDay {
  return { title, details, focus };
}

function computeRationale({
  readiness,
  soreness,
  lastEffort,
  nextSession,
}: {
  readiness: number;
  soreness: number;
  lastEffort?: Workout['effort'];
  nextSession: PlanDay | null;
}) {
  if (!nextSession) {
    return 'We will add your next session once you log a workout or check-in.';
  }
  if (readiness < 2.5 || soreness > 3.5) {
    return `Lowered intensity to support recovery before "${nextSession.title}".`;
  }
  if (lastEffort === 'Hard') {
    return `Balanced your week with an easier follow-up to the last hard effort: "${nextSession.title}".`;
  }
  return `Built around your goal with "${nextSession.title}" leading the week’s focus.`;
}

export function recomputeWeeklyPlan({
  athlete,
  workouts,
  checkIns,
  currentPlan,
}: PlanEngineInput): TrainingPlan {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const daysPerWeek = Math.max(3, Math.min(7, athlete.daysPerWeek));
  const runDays = RUN_DAY_PATTERNS[daysPerWeek] ?? RUN_DAY_PATTERNS[5];

  const dayTemplates: PlanDay[] = Array.from({ length: 7 }, () =>
    buildRunDay('Recovery', 'Rest or 20–30 min easy', 'Recovery')
  );

  const { readiness, soreness } = summarizeCheckIns(checkIns);
  const lastWorkout = workouts[0];
  const intensityDown = readiness < 2.5 || soreness > 3.5;

  runDays.forEach((dayIndex, idx) => {
    const isLongRun = idx === runDays.length - 1;
    const isQuality = idx === Math.floor(runDays.length / 2);

    if (isLongRun) {
      dayTemplates[dayIndex] = buildRunDay(
        'Long Run',
        intensityDown ? '45–55 min easy, keep it gentle' : '60–75 min easy, relaxed effort',
        'Endurance'
      );
      return;
    }

    if (isQuality) {
      dayTemplates[dayIndex] = buildRunDay(
        intensityDown ? 'Steady Run' : 'Tempo Touch',
        intensityDown ? '30–40 min easy, smooth stride' : '3 x 6 min comfortably hard',
        intensityDown ? 'Aerobic' : 'Threshold'
      );
      return;
    }

    dayTemplates[dayIndex] = buildRunDay(
      'Easy Run',
      intensityDown ? '25–35 min easy, keep cadence light' : '35–45 min easy + 4 strides',
      'Aerobic'
    );
  });

  const todayIndex = Math.max(0, Math.min(6, Math.floor((today.getTime() - weekStart.getTime()) / 86400000)));
  const nextSession = dayTemplates.find((day, index) => index >= todayIndex && day.title !== 'Recovery') ?? dayTemplates[runDays[0]] ?? null;

  return {
    id: currentPlan?.id ?? crypto.randomUUID(),
    weekOf: weekStart.toISOString(),
    lastUpdated: new Date().toISOString(),
    days: dayTemplates,
    nextSession,
    nextSessionRationale: computeRationale({
      readiness,
      soreness,
      lastEffort: lastWorkout?.effort,
      nextSession,
    }),
  };
}
