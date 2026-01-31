# COACH Brain — Technical Documentation

This document explains how the AI coach brain works, its components, and how to modify it.

## Overview

The coach brain is a decision-making system that sits between the user and the AI model. It ensures the AI has complete context about the athlete and follows strict behavioral rules.

```
User Message
     │
     ▼
┌─────────────────────────────────────────┐
│            COACH BRAIN                  │
│                                         │
│  ┌──────────────┐   ┌────────────────┐  │
│  │ State Engine │   │ Decision Gates │  │
│  │              │   │                │  │
│  │ Computes who │   │ Safety checks  │  │
│  │ the athlete  │   │ before any     │  │
│  │ is right now │   │ response       │  │
│  └──────────────┘   └────────────────┘  │
│          │                   │          │
│          ▼                   ▼          │
│  ┌─────────────────────────────────┐    │
│  │        Prompt Builder           │    │
│  │                                 │    │
│  │  System prompt + State + Gates  │    │
│  │  + Knowledge + History          │    │
│  └─────────────────────────────────┘    │
│                   │                     │
└───────────────────│─────────────────────┘
                    ▼
            ┌──────────────┐
            │   OpenAI     │
            │   API Call   │
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │   Response   │
            │   Parser     │
            └──────────────┘
                    │
                    ▼
              Structured
               Response
```

## Components

### 1. State Engine (`state-engine.ts`)

The state engine computes the athlete's current state from stored data.

#### Data Sources
- **Check-ins**: Daily subjective reports (readiness, soreness, sleep, motivation)
- **Sessions**: Logged training sessions with duration, type, and feedback
- **Profile**: Athlete's goals, experience level, and preferences

#### Computed Metrics

**Training Loads:**
```
Acute Load = Sum of (session_duration × intensity_multiplier) over last 7 days
Chronic Load = Average weekly load over last 28 days
AC Ratio = Acute Load / Chronic Load
```

**Intensity Multipliers:**
| Session Type | Multiplier |
|-------------|------------|
| recovery | 0.8 |
| easy | 1.0 |
| long | 1.3 |
| threshold | 2.0 |
| speed | 2.5 |
| race | 3.0 |

**AC Ratio Interpretation:**
| Ratio | Status | Action |
|-------|--------|--------|
| < 0.8 | Undertraining | Consider increasing load |
| 0.8 - 1.3 | Optimal | Proceed normally |
| 1.3 - 1.5 | Elevated | Reduce load 20-30% |
| > 1.5 | High Risk | Recovery only |

#### Output: AthleteState

```typescript
{
  physiological: {
    acuteLoad: 425,
    chronicLoad: 380,
    acRatio: 1.12,
    fatigueTrend: 'stable',
    lastSessionDate: '2026-01-29',
    lastSessionType: 'threshold',
    lastSessionFeedback: 'Felt strong'
  },
  subjective: {
    readiness: 72,
    soreness: 35,
    sleepQuality: 70,
    motivation: 68,
    notes: null,
    checkInDate: '2026-01-31'
  },
  schedule: {
    availableTimeMinutes: null,
    currentPhase: 'build',
    daysToEvent: 47,
    eventName: 'Spring Half Marathon'
  },
  injury: {
    hasActiveInjury: false,
    injuryDescription: null,
    injuryGrade: null,
    injuryLocation: null
  },
  history: {
    totalSessions: 12,
    completionRate: 85,
    pushbackRate: 15,
    averageSessionsPerWeek: 4
  }
}
```

### 2. Decision Gates (`decision-engine.ts`)

Gates are safety checks that run before every response. They can modify or override what the coach would normally prescribe.

#### Gate Priority Order

Gates are checked in strict order. A triggered gate can block all subsequent processing.

```
Gate 0: Emergency    → Mental health crisis, medical emergency
Gate 1: Safety       → Injury, illness, severe sleep deprivation
Gate 2: Recovery     → Overtraining, fatigue accumulation
Gate 3: Schedule     → Time constraints, race proximity
Gate 4: Methodology  → Ensure session matches training philosophy
```

#### Gate Details

**Safety Gate**
| Condition | Threshold | Action |
|-----------|-----------|--------|
| Injury grade | ≥ 2 | Activate injury protocol |
| Sleep quality | < 30 | Recovery only |
| Illness symptoms | Any | Rest |

**Recovery Gate**
| Condition | Threshold | Action |
|-----------|-----------|--------|
| AC Ratio | > 1.5 | Mandatory recovery day |
| AC Ratio | > 1.3 | Reduce load 20-30% |
| Fatigue | very_fatigued | Reduce intensity |
| Readiness trend | declining 3+ days | Back off |

**Schedule Gate**
| Condition | Threshold | Action |
|-----------|-----------|--------|
| Available time | < 30 min | Compress session |
| Available time | < 20 min | Skip or minimal |
| Days to event | ≤ 3 | Race week mode |
| Days to event | ≤ 14 | Taper mode |

#### Gate Output

```typescript
{
  gate: 'recovery',
  triggered: true,
  reason: 'AC Ratio is 1.42, above the 1.3 threshold',
  action: 'reduce_load'
}
```

### 3. System Prompt (`system-prompt.ts`)

The system prompt defines the coach's personality, rules, and output format.

#### Core Sections

1. **Identity**: Who the coach is (elite, direct, decisive)
2. **Absolute Rules**: Never-break constraints (single decisions, no emojis, etc.)
3. **Output Format**: JSON schemas for responses
4. **Decision Process**: How to use gate results
5. **Tone Guidelines**: Communication style
6. **Scenario Guidance**: Common situation handling

#### The Single-Decision Rule

The most important constraint. The coach never presents options.

**Forbidden Phrases:**
- "You could do X or Y"
- "Option A... Option B..."
- "Either...or"
- "If you want...or if you prefer"
- "It's up to you"

**Correct Behavior:**
- Make one recommendation
- If user pushes back, make a NEW single recommendation
- Never offer a menu of choices

### 4. Response Parser (`response-parser.ts`)

Extracts structured data from the AI's text response.

#### Expected Output Format

The AI returns JSON in one of these formats:

**Workout Prescription:**
```json
{
  "message": "Brief context",
  "session": {
    "type": "threshold",
    "title": "Threshold Development",
    "warmup": { "duration": "15 min", "description": "Easy with strides" },
    "main": { "structure": "5 x 1000m", "target": "3:52-3:58/km", "recovery": "90s jog" },
    "cooldown": { "duration": "10 min", "description": "Easy jog" },
    "totalTime": "55-60 min"
  },
  "confidence": "high"
}
```

**Plain Response:**
```json
{
  "message": "Response text here",
  "confidence": "medium"
}
```

**With Alert:**
```json
{
  "message": "Explanation",
  "alert": {
    "severity": "warning",
    "title": "Training Paused",
    "details": "No running until we assess this."
  },
  "confidence": "high"
}
```

#### Parser Resilience

The parser handles common issues:
- JSON wrapped in markdown code blocks
- Text before/after the JSON
- Minor formatting errors

If parsing fails completely, it returns:
```json
{
  "message": "[raw AI response]",
  "confidence": "low"
}
```

## Data Flow

### Complete Request Flow

```
1. User sends message
   └─> Frontend sends POST to /api/chat

2. API receives request
   ├─> Extract message and conversation history
   └─> Begin coach brain processing

3. Compute athlete state
   ├─> Fetch recent check-ins (7 days)
   ├─> Fetch recent sessions (28 days)
   ├─> Fetch athlete profile
   ├─> Calculate training loads
   ├─> Analyze trends
   └─> Build AthleteState object

4. Run decision gates
   ├─> Check safety gate
   ├─> Check recovery gate
   ├─> Check schedule gate
   ├─> Check methodology gate
   └─> Collect triggered gates

5. Build full prompt
   ├─> Base system prompt
   ├─> Formatted athlete state
   ├─> Gate results (if any triggered)
   ├─> Retrieved knowledge (from vector store)
   └─> Conversation history

6. Call OpenAI
   ├─> Send assembled prompt
   ├─> Include file_search tool for knowledge retrieval
   └─> Receive response

7. Parse response
   ├─> Extract JSON from response
   ├─> Validate structure
   ├─> Sanitize (remove emojis, trim)
   └─> Build CoachResponse object

8. Return to frontend
   └─> Send CoachResponse as JSON

9. Frontend renders
   ├─> Display message text
   ├─> Render workout card (if present)
   ├─> Render alert (if present)
   └─> Render action buttons (if present)
```

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-...           # OpenAI API key
OPENAI_MODEL=gpt-4.1-mini       # Model to use
OPENAI_VECTOR_STORE_ID=vs_...   # Vector store with training documents
```

### Tunable Parameters

**In state-engine.ts:**
```typescript
// Intensity multipliers
const INTENSITY_MULTIPLIERS = {
  easy: 1.0,      // Adjust if too high/low
  threshold: 2.0, // Adjust based on athlete response
  // ...
};
```

**In decision-engine.ts:**
```typescript
// Gate thresholds
const THRESHOLDS = {
  AC_RATIO_ELEVATED: 1.3,    // When to start reducing load
  AC_RATIO_HIGH_RISK: 1.5,   // When to force recovery
  SLEEP_POOR: 30,            // Sleep quality below this triggers gate
  READINESS_DECLINING_DAYS: 3, // Days of decline before triggering
};
```

## Modifying the Brain

### Changing Coach Personality

Edit `system-prompt.ts`, Section 1 (Identity).

Example: Making the coach more encouraging:
```typescript
// Before:
"You're warm but not effusive"

// After:
"You're warm and encouraging, celebrating small wins while maintaining high standards"
```

### Adding a New Gate

1. Create the check function in `decision-engine.ts`:
```typescript
export const checkNewGate = (state: AthleteState): GateResult => {
  // Your logic here
  return {
    gate: 'new_gate',
    triggered: false,
    reason: undefined,
    action: undefined,
  };
};
```

2. Add to `runDecisionGates` in the appropriate position:
```typescript
const gates = [
  checkSafetyGate(state),
  checkRecoveryGate(state),
  checkNewGate(state),  // Add here
  checkScheduleGate(state, context?.requestedType),
  checkMethodologyGate(state, context?.requestedType),
];
```

3. Update the system prompt to explain the new gate's behavior.

### Adding a New Response Type

1. Add the type to `types.ts`:
```typescript
export interface ProgressReport {
  period: string;
  metrics: { name: string; value: string; trend: 'up' | 'down' | 'stable' }[];
  summary: string;
}
```

2. Add to CoachResponse:
```typescript
export interface CoachResponse {
  message: string;
  session?: SessionPrescription;
  progressReport?: ProgressReport;  // Add here
  // ...
}
```

3. Update the system prompt with the new JSON format.

4. Create a UI component to render it.

## Testing

### Manual Testing Checklist

1. **Basic flow:**
   - Send "What's my workout today?"
   - Verify response has workout card

2. **Safety gates:**
   - Add check-in with low sleep (25)
   - Send session request
   - Verify coach prescribes recovery only

3. **Pushback handling:**
   - Get a workout prescription
   - Say "That's too much"
   - Verify coach gives ONE modified option

4. **Knowledge boundary:**
   - Ask "Should I do CrossFit?"
   - Verify coach declines outside expertise

5. **Injury flow:**
   - Say "My knee hurts"
   - Verify coach pauses training, asks questions

### Automated Testing

See `app/test/page.tsx` for a test interface that validates:
- Storage functions work correctly
- State engine computes values
- Prompt formatting produces valid output

## Troubleshooting

### "State always shows zeros"

**Cause:** Storage not saving data or state engine not reading it

**Fix:** 
1. Check localStorage has `coach_*` keys
2. Verify storage functions are exported/imported correctly
3. Check for errors in browser console

### "Coach gives multiple options"

**Cause:** System prompt not strict enough

**Fix:** Add more explicit forbidden phrases to the prompt

### "Workout card not rendering"

**Cause:** Response parser not extracting session correctly

**Fix:**
1. Log the raw API response
2. Check if JSON is valid
3. Verify session object has all required fields

### "Gates not triggering"

**Cause:** Thresholds too strict or state data missing

**Fix:**
1. Log the computed state
2. Log each gate check result
3. Adjust thresholds if needed

## Knowledge Base

The coach's knowledge comes from 14 PDF documents stored in an OpenAI vector store:

| Document | Content |
|----------|---------|
| Progression_Log | Training history tracking |
| Master_Zone_Map_Crosswalk | Zone definitions |
| Decision_Gate_Calibration | When to modify sessions |
| Environment_Adjustments | Heat, altitude, terrain |
| Macrocycle_Design_Guide | Season planning |
| Meso_Micro_Design | Week/block structure |
| Intensity_5Zone | Effort zones |
| Aerobic_Foundation_Runs | Easy running |
| Lactate_Threshold_Training | Threshold workouts |
| Speed_Power_800-10k | Speed development |
| Global_Methodologies_Workout_Library | Specific workouts |
| Injury_Management_Guide | Injury protocols |
| Fueling_Framework | Nutrition |
| Mental_Skills_Playbook | Psychology |

The AI retrieves relevant chunks from these documents for each query using the `file_search` tool.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial implementation |

---

*Last updated: January 2026*