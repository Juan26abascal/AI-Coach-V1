# AI Running Coach — MVP

Premium, minimal AI running coach MVP built with Next.js App Router, TypeScript, TailwindCSS, and Zustand.

## Overview
This repository bootstraps the MVP for a premium AI running coach experience. It includes:
- Onboarding flow with profile persistence
- Coach chat surface with daily check-in
- Weekly plan overview with interactive grid
- Workout logging and history
- Athlete profile editing
- Mock coach service boundary
- Local persistence (localStorage)
- Offline and error-aware UI states

## Project Structure
- `app/` — Next.js app router pages and UI components
- `app/components/` — Design system primitives
- `app/lib/` — Mock coach service + demo data generation
- `app/store/` — Zustand state and persistence
- `app/types/` — Typed domain models

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

We include a `.npmrc` with safe retry defaults to make installs more resilient.

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

## Future Expansion
The architecture is built to support:
- Replacing the mock coach service with a real API (streaming optional)
- Wearable integrations
- Advanced analytics views
- Expanded training modules

## Design System
Small, premium primitives: Button, Input, Card, Chip, Badge, MessageBubble, CoachBlock, WeekGrid. Tailwind tokens are defined in `tailwind.config.js`.
