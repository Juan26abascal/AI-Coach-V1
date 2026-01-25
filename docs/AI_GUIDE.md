# AI Running Coach — Collaboration Guide

This project is designed to be extended by human and AI contributors.

## What Exists Today
- **MVP screens**: Onboarding, Chat, Plan, Log, Profile
- **State management**: Zustand store with local persistence
- **Mock coach boundary**: `app/lib/coach.ts`
- **Typed models**: `app/types/index.ts`
- **Design system**: small primitive component set in `app/components/`

## How to Extend Safely
1. **Preserve the minimal premium aesthetic**
   - Use the existing color tokens and typography hierarchy.
   - Avoid introducing gradients, heavy shadows, or clutter.
2. **Keep chat primary**
   - Any new feature should be a support surface to the chat experience.
3. **State additions**
   - Add new fields to `app/types/index.ts` first.
   - Extend the Zustand store in `app/store/useAppStore.ts`.
4. **API work**
   - Replace `getMockCoachResponse` with real API requests.
   - Keep the function signature consistent where possible.
5. **Persistence**
   - Maintain backward compatibility with existing localStorage keys.

## What Not To Do
- Do not add heavy UI frameworks or templates.
- Do not move to a different navigation pattern.
- Do not introduce global state libraries beyond Zustand.
- Do not alter the chat top bar hierarchy or add extra icons.

## Suggested Next Tasks
- Implement streaming coach responses.
- Add richer workout details in the log view.
- Add timezone handling for travel adjustments.
- Add analytics summaries without heavy charts.
