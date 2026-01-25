'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Athlete, TrainingPlan, Workout, ChatMessage, CheckIn } from '@/types';
import { getMockCoachResponse } from '@/lib/coach';
import { generateStarterPlan, generateWelcomeMessages } from '@/lib/demo';

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
        set((state) => ({
          workouts: [workout, ...state.workouts],
        })),
      updatePlan: (plan) => set({ plan }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      sendMessage: async (content) => {
        const { offline } = get();
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
          const response = await getMockCoachResponse(content, get());
          set((state) => ({
            messages: [...state.messages, response],
            loading: false,
          }));
        } catch (err) {
          set({ loading: false, error: 'Coach response failed. Please retry.' });
        }
      },
      addCheckIn: async (checkIn) => {
        const { offline } = get();
        set((state) => ({ checkIns: [checkIn, ...state.checkIns], loading: true }));
        if (offline) {
          set({ loading: false, error: 'Check-in saved locally. Coach will sync later.' });
          return;
        }
        try {
          const response = await getMockCoachResponse('Daily check-in submitted', get());
          set((state) => ({ messages: [...state.messages, response], loading: false }));
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
