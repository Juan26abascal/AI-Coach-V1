Premium AI running coach with a chat-first experience. Built with Next.js, TypeScript, and OpenAI.
Overview
COACH is an AI-powered running coach that makes decisive training recommendations based on your current state, training history, and goals. Unlike generic fitness apps, COACH doesn't give you options—it gives you answers.
Core Philosophy: The coach decides. The athlete executes.
Tech Stack

Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
State: Zustand with local persistence
AI: OpenAI GPT-4.1-mini with vector store (RAG)
Backend: Next.js API Routes (Node.js)

Project Structure
app/
├── api/
│   └── chat/
│       └── route.ts          # Chat API endpoint
├── components/               # UI components
│   ├── WorkoutCard.tsx       # Displays workout prescriptions
│   ├── AlertCard.tsx         # Displays warnings/alerts
│   ├── ActionButtons.tsx     # Quick action buttons
│   ├── CoachBlock.tsx        # Coach message wrapper
│   ├── MessageBubble.tsx     # Chat message display
│   └── ...
├── lib/
│   ├── coach/                # Coach brain system
│   │   ├── index.ts          # Main exports
│   │   ├── types.ts          # Type definitions
│   │   ├── system-prompt.ts  # AI instructions
│   │   ├── state-engine.ts   # Athlete state computation
│   │   ├── decision-engine.ts# Safety gate system
│   │   └── response-parser.ts# Parse AI responses
│   ├── openai.ts             # OpenAI client config
│   └── storage.ts            # Local storage utilities
├── store/
│   └── useAppStore.ts        # Zustand state
├── types/
│   └── index.ts              # Shared types
└── (routes)/                 # Page routes
    ├── page.tsx              # Home/Chat
    ├── plan/page.tsx         # Weekly plan
    ├── log/page.tsx          # Training log
    ├── profile/page.tsx      # Athlete profile
    └── onboarding/page.tsx   # First-time setup
How the Coach Brain Works
User Message
     │
     ▼
┌─────────────────┐
│ Compute Athlete │ → Training load, fatigue, injury status
│ State           │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Run Decision    │ → Safety, Recovery, Schedule, Methodology gates
│ Gates           │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Build Prompt    │ → System prompt + state + gates + knowledge
│                 │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Call OpenAI     │ → GPT-4.1-mini with vector store
│                 │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Parse Response  │ → Extract structured data (workouts, alerts)
│                 │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Render in UI    │ → Workout cards, messages, actions
│                 │
└─────────────────┘
Key Features
Decision Gates
The coach runs safety checks before every response:

Safety Gate: Stops training if injury or illness detected
Recovery Gate: Reduces load if overtraining signals present
Schedule Gate: Adapts sessions to time constraints
Methodology Gate: Ensures sessions match training philosophy

<<<<<<< HEAD
Structured Responses
The coach returns structured data, not just text:

Workout Cards: Complete session prescriptions with warmup, main set, cooldown
Alerts: Warnings for injury or overtraining concerns
Quick Actions: One-tap responses for common scenarios
=======
## Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (see "OpenAI Coach Brain Configuration" below).
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Visit `http://localhost:3000`.

## Troubleshooting npm install
If `npm install` fails with a 403 or proxy-related error, the environment is blocking access to the npm registry.
Follow these steps:
1. Ensure the registry is set to the public npm registry:
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```
2. Clear any proxy environment variables:
   ```bash
   unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
   ```
3. Re-run:
   ```bash
   npm install
   ```
>>>>>>> origin/main

Athlete State Engine
Continuously computes:

<<<<<<< HEAD
Acute/chronic training load ratio
Fatigue and readiness trends
Injury status tracking
Historical compliance patterns
=======
## Implementation Notes
- The onboarding flow is required before accessing the chat.
- Daily check-in is embedded at the top of the chat page.
- Plans and workouts are fully stored locally for now.
- The production coach brain lives in `app/api/coach/route.ts` and uses OpenAI Responses with file_search + structured outputs.

## OpenAI Coach Brain Configuration
Set the following values in `.env.local` (or your deployment environment):
```bash
OPENAI_API_KEY=your_api_key
OPENAI_VECTOR_STORE_ID=your_vector_store_id
OPENAI_MODEL=gpt-4.1-mini
```

### Vector Store Setup
1. Upload the 14 PDFs into your OpenAI Vector Store.
2. Copy the Vector Store ID.
3. Set `OPENAI_VECTOR_STORE_ID` in `.env.local`.

The `/api/coach` route always enables the `file_search` tool with your Vector Store and limits retrieval to 4 chunks per request.
>>>>>>> origin/main

Running Locally

Install dependencies:

bash   npm install

Set up environment variables:

bash   cp .env.example .env.local
   # Edit .env.local with your OpenAI API key and vector store ID

Run the dev server:

bash   npm run dev

Open http://localhost:3000

Environment Variables
bashOPENAI_API_KEY=sk-...          # Your OpenAI API key
OPENAI_MODEL=gpt-4.1-mini      # Model to use
OPENAI_VECTOR_STORE_ID=vs_...  # Vector store with training documents
Current Limitations

No database: Using localStorage (data doesn't persist across devices)
No authentication: Single user only
No watch integration: Manual session logging only
Prompt in development: Coach responses are being refined

Roadmap
Phase 1: Core Experience (Current)

 Chat interface
 Coach brain with decision gates
 Structured workout responses
 Daily check-in
 Basic plan view

Phase 2: Real Persistence

 Database integration (Supabase)
 User authentication
 Cloud data sync

Phase 3: Integrations

 Strava connection
 Garmin connection
 Apple Health sync

Phase 4: Advanced Features

 Training load analytics
 Race predictions
 Multi-goal support

Documentation

docs/COACH_BRAIN.md — How the AI coach works
docs/PROMPTS.md — Prompt changelog and current version
docs/AI_GUIDE.md — Guide for AI contributors

Contributing
This project is designed to be extended by both humans and AI assistants. See docs/AI_GUIDE.md for guidelines.
