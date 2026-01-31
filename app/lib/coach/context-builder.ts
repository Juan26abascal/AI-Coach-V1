// BEFORE: Verbose athlete state
function buildAthleteState(athlete: Athlete): string {
    return `
  === ATHLETE STATE ===
  ATHLETE: ${athlete.name}
  GOAL: ${athlete.goal.name} on ${athlete.goal.date} - Target: ${athlete.goal.targetTime}
  METHODOLOGY: ${athlete.methodology}
  TRAINING PHASE:
  - Current: ${athlete.phase.name}
  - Week: ${athlete.phase.week} of ${athlete.phase.totalWeeks} in phase
  - Focus: ${athlete.phase.focus}
  ... [continues for ~500 tokens]
  `;
  }
  
  // AFTER: Compressed athlete state
  function buildAthleteState(athlete: Athlete): string {
    const goalDate = daysUntil(athlete.goal.date);
    const recentSessions = athlete.sessions.slice(-5).map(s => 
      `${dayName(s.date)}:${s.type}${s.completed ? '✓' : '○'}`
    ).join(' | ');
    
    return `STATE: ${athlete.phase.name} Week ${athlete.phase.week}/${athlete.phase.totalWeeks} | ${athlete.goal.name} in ${goalDate}d
  LOAD: AC=${athlete.acRatio.toFixed(2)}${athlete.acRatio < 1.3 ? '✓' : '⚠'} | Trend ${athlete.loadTrend}
  RECENT: ${recentSessions}
  TODAY: ${athlete.scheduledToday || 'Rest'}
  READINESS: ${athlete.readiness.last3.join('→')} | Sleep ${athlete.sleep.last3.join('→')}
  INJURY: ${athlete.activeInjury || 'None'} | Watch: ${athlete.riskFactors}
  PATTERN: ${athlete.patterns.fatigueReliability}`;
  }