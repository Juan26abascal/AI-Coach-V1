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
- Mock coach responses are centralized in `app/lib/coach.ts` for easy replacement.

## Future Expansion
The architecture is built to support:
- Replacing the mock coach service with a real API (streaming optional)
- Wearable integrations
- Advanced analytics views
- Expanded training modules

## Design System
Small, premium primitives: Button, Input, Card, Chip, Badge, MessageBubble, CoachBlock, WeekGrid. Tailwind tokens are defined in `tailwind.config.js`.
