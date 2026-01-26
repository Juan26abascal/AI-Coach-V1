'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Athlete, TrainingPlan, Workout, ChatMessage, CheckIn } from '@/types';
import { generateStarterPlan, generateWelcomeMessages } from '@/lib/demo';
import { recomputeWeeklyPlan } from '@/lib/plan/engine';

export type AppState = {
  athlete: Athlete | null;
  plan: TrainingPlan | null;
  workouts: Workout[];
  messages: ChatMessage[];
  checkIns: CheckIn[];
  loading: boolean;
  error: string | null;
  offline: boolean;
  setOffline: (offline: boolean) => void;
  setAthlete: (athlete: Athlete) => void;
  updateAthlete: (athlete: Athlete) => void;
  addWorkout: (workout: Workout) => void;
  updatePlan: (plan: TrainingPlan) => void;
  addMessage: (message: ChatMessage) => void;
  sendMessage: (content: string) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
  clearError: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      athlete: null,
      plan: null,
      workouts: [],
      messages: [],
      checkIns: [],
      loading: false,
      error: null,
      offline: false,
      setOffline: (offline) => set({ offline }),
      clearError: () => set({ error: null }),
      setAthlete: (athlete) => {
        const starterPlan = generateStarterPlan(athlete);
        set({ athlete, plan: starterPlan, messages: generateWelcomeMessages(athlete, starterPlan) });
      },
      updateAthlete: (athlete) => set({ athlete }),
      addWorkout: (workout) =>
        set((state) => {
          const updatedWorkouts = [workout, ...state.workouts];
          const updatedPlan = state.athlete
            ? recomputeWeeklyPlan({
                athlete: state.athlete,
                workouts: updatedWorkouts,
                checkIns: state.checkIns,
                currentPlan: state.plan,
              })
            : state.plan;
          return {
            workouts: updatedWorkouts,
            plan: updatedPlan,
          };
        }),
      updatePlan: (plan) => set({ plan }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      sendMessage: async (content) => {
        const { offline, athlete, plan, workouts, checkIns, messages } = get();
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ messages: [...state.messages, userMessage], loading: true }));

        if (offline) {
          set({ loading: false, error: 'You appear to be offline. Try again when connected.' });
          return;
        }

        try {
          const apiResponse = await fetch('/api/coach', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: content,
              context: {
                athlete,
                plan,
                workouts,
                checkIns,
                recentMessages: messages.slice(-6),
              },
            }),
          });

          if (!apiResponse.ok) {
            throw new Error('Coach response failed.');
          }

          const data = await apiResponse.json();
          const coachMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'coach',
            content: data.summary ?? 'Coach response ready.',
            createdAt: new Date().toISOString(),
            blocks: data.blocks ?? [],
          };

          set((state) => ({
            messages: [...state.messages, coachMessage],
            loading: false,
          }));
        } catch (err) {
          set({ loading: false, error: 'Coach response failed. Please retry.' });
        }
      },
      addCheckIn: async (checkIn) => {
        const { offline, athlete, plan, workouts, checkIns, messages } = get();
        const updatedCheckIns = [checkIn, ...checkIns];
        const updatedPlan =
          athlete &&
          recomputeWeeklyPlan({
            athlete,
            workouts,
            checkIns: updatedCheckIns,
            currentPlan: plan,
          });

        set(() => ({
          checkIns: updatedCheckIns,
          loading: true,
          plan: updatedPlan ?? plan,
        }));
        if (offline) {
          set({ loading: false, error: 'Check-in saved locally. Coach will sync later.' });
          return;
        }
        try {
          const apiResponse = await fetch('/api/coach', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Daily check-in submitted',
              context: {
                athlete,
                plan,
                workouts,
                checkIns: [checkIn, ...checkIns],
                recentMessages: messages.slice(-6),
              },
            }),
          });

          if (!apiResponse.ok) {
            throw new Error('Coach response failed.');
          }

          const data = await apiResponse.json();
          const coachMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'coach',
            content: data.summary ?? 'Coach response ready.',
            createdAt: new Date().toISOString(),
            blocks: data.blocks ?? [],
          };

          set((state) => ({ messages: [...state.messages, coachMessage], loading: false }));
        } catch (err) {
          set({ loading: false, error: 'Coach could not review the check-in.' });
        }
      },
    }),
    {
      name: 'ai-running-coach',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
