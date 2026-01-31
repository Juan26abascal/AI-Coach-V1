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

Structured Responses
The coach returns structured data, not just text:

Workout Cards: Complete session prescriptions with warmup, main set, cooldown
Alerts: Warnings for injury or overtraining concerns
Quick Actions: One-tap responses for common scenarios

Athlete State Engine
Continuously computes:

Acute/chronic training load ratio
Fatigue and readiness trends
Injury status tracking
Historical compliance patterns

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
