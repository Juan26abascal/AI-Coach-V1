This document helps AI assistants (Claude, GPT, Codex, Cursor AI, etc.) work effectively on this codebase.
Project Context
This is a premium AI running coach app. The core differentiator is the coach brain — an AI system that makes decisive training recommendations rather than presenting options.
Core Philosophy: The coach decides. The athlete executes.
Architecture Overview
The Coach Brain (app/lib/coach/)
This is the heart of the app. Understand this before making changes:
state-engine.ts     → Computes athlete's current state from data
decision-engine.ts  → Runs safety/recovery gates before responding  
system-prompt.ts    → Instructions that define coach behavior
response-parser.ts  → Extracts structured data from AI responses
types.ts            → All type definitions
Key Types to Know
typescript// What we know about the athlete right now
AthleteState {
  physiological: { acuteLoad, chronicLoad, acRatio, ... }
  subjective: { readiness, soreness, sleepQuality, motivation }
  schedule: { availableTimeMinutes, currentPhase, daysToEvent }
  injury: { hasActiveInjury, injuryGrade, ... }
  history: { completionRate, pushbackRate, ... }
}

// What the coach returns
CoachResponse {
  message: string              // Always present
  session?: SessionPrescription // Workout card
  alert?: Alert                // Warning/critical notice
  actions?: QuickAction[]      // One-tap buttons
  confidence: 'high' | 'medium' | 'low'
}

// A workout prescription
SessionPrescription {
  type: 'threshold' | 'easy' | 'long' | 'speed' | 'recovery' | 'race'
  title: string
  warmup: { duration, description }
  main: { structure, target, recovery?, notes? }
  cooldown: { duration, description }
  totalTime: string
}
Data Flow
User sends message
     ↓
API route receives it (app/api/chat/route.ts)
     ↓
Compute athlete state (state-engine.ts)
     ↓
Run decision gates (decision-engine.ts)
     ↓
Build full prompt (system-prompt.ts)
     ↓
Call OpenAI with vector store search
     ↓
Parse response (response-parser.ts)
     ↓
Return CoachResponse to frontend
     ↓
UI renders structured content
Critical Constraints
The Coach MUST:

Make single decisions — Never present "Option A or B"
Never use emojis — Professional tone only
Stay within knowledge boundaries — Use vector store content only
Keep responses brief — Under 100 words unless detail requested
Prioritize safety — Injury and illness override all else
Return valid JSON — Structured output is essential

The Coach MUST NOT:

Say "you could", "either/or", "it's up to you"
Diagnose medical conditions
Recommend supplements or medications
Advise on non-running activities (CrossFit, swimming, etc.)
Be excessively enthusiastic or use corporate speak

How to Make Changes Safely
Changing the System Prompt
The prompt is in app/lib/coach/system-prompt.ts. This is the most sensitive file.
Before changing:

Understand what the current prompt does
Identify the specific issue you're fixing
Make minimal, targeted changes

After changing:

Test with these scenarios:

Simple session request: "What's my workout today?"
Pushback: "That's too much"
Injury: "My knee hurts"
Knowledge boundary: "Should I do CrossFit?"


Verify no emojis, no options, appropriate length
Document the change in docs/PROMPTS.md

Adding New Response Types
If you need a new type of structured output:

Add the type to types.ts
Add handling in response-parser.ts
Update the system prompt to document the new format
Create a UI component to render it
Test that the AI actually produces valid output

Modifying the State Engine
The state engine (state-engine.ts) computes athlete state. Changes here affect every response.
Safe changes:

Adding new computed fields
Improving trend calculations
Better null handling

Risky changes:

Changing load calculation formulas (affects AC ratio)
Changing fatigue thresholds
Removing fields (might break prompt injection)

Modifying Decision Gates
Gates are in decision-engine.ts. They protect athletes from harm.
Safe changes:

Adding new gates (add at appropriate priority level)
Improving trigger conditions
Better reason messages

Risky changes:

Removing safety gates
Loosening injury thresholds
Changing gate priority order

Code Style Guidelines
TypeScript

Use strict types, avoid any
Export types from types.ts, import from there
Use descriptive names (computeTrainingLoads not calcLoads)

Components

Functional components only
Use Tailwind for styling
Match the existing dark theme
Keep components small and focused

State

Use Zustand store for global state
Local component state for UI-only concerns
Don't duplicate state between store and localStorage

Testing Checklist
Before submitting changes, verify:
Basic Functionality

 App starts without errors (npm run dev)
 Chat sends and receives messages
 Workout cards render correctly
 No console errors

Coach Behavior

 Responses are single decisions (no options)
 No emojis in any response
 Responses under 100 words typically
 Injury reports pause training
 Out-of-scope questions get boundary response

Edge Cases

 Empty message handled
 Very long message handled
 API error handled gracefully
 No crash if localStorage empty

Common Issues and Solutions
"Coach gives multiple options"
Cause: System prompt not strict enough
Fix: Add explicit forbidden phrases to prompt, strengthen single-decision rule
"Response not valid JSON"
Cause: AI output has extra text before/after JSON
Fix: Improve parsing in response-parser.ts to extract JSON from surrounding text
"Workout card not showing"
Cause: Structured content not being passed to component
Fix: Check that structuredContent is stored on message and component checks for session
"Coach sounds robotic"
Cause: Prompt tone section too formal
Fix: Add natural language examples to prompt, emphasize conversational style
"AC ratio always 1.0"
Cause: No session data, or chronic load is zero
Fix: Ensure sessions are being stored, add default handling for zero chronic load
Files You Should NOT Modify Without Good Reason
FileWhytypes.tsChanges ripple through entire codebasesystem-prompt.tsCore behavior definitiondecision-engine.tsSafety-critical codetailwind.config.jsDesign system tokens
Files Safe to Modify
FileWhat's SafeComponentsUI improvements, new componentspage.tsx filesLayout changes, new UI elementsstorage.tsNew storage functionsuseAppStore.tsNew state fields (additive only)
Prompt Engineering Notes
The system prompt uses several techniques:

Role definition — "You are the running coach inside the COACH app"
Explicit constraints — "NEVER say 'you could'"
Output format specification — JSON schemas with examples
Tone examples — Good vs bad phrasing
Context injection — Athlete state as structured text
Gate results — What safety checks found

When modifying the prompt:

Keep the structure (sections are intentional)
Test each change in isolation
Document why you made the change

Vector Store Content
The knowledge base includes 14 PDFs covering:

Training methodology (periodization, load management)
Workout design (thresholds, speed, long runs)
Injury management (assessment, return protocols)
Nutrition (fueling framework)
Mental skills (race prep, motivation)

The AI should retrieve from these documents for any training advice. It should NOT use general knowledge for training recommendations.
Questions?
If you're an AI assistant and something is unclear:

Check existing code for patterns
Look at types.ts for data structures
Review system-prompt.ts for behavior expectations
Ask the human for clarification before making assumptions