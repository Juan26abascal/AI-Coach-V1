'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Athlete, TrainingPlan, Workout, Message, CheckIn } from '@/types';
import { getMockCoachResponse } from '@/lib/coach';
import { generateStarterPlan, generateWelcomeMessages } from '@/lib/demo';
import type { CoachResponse } from '@/lib/coach/types';

export type AppState = {
  athlete: Athlete | null;
  plan: TrainingPlan | null;
  workouts: Workout[];
  messages: Message[];
  checkIns: CheckIn[];
  loading: boolean;
  error: string | null;
  offline: boolean;
  setOffline: (offline: boolean) => void;
  setAthlete: (athlete: Athlete) => void;
  updateAthlete: (athlete: Athlete) => void;
  addWorkout: (workout: Workout) => void;
  updatePlan: (plan: TrainingPlan) => void;
  addMessage: (message: Message) => void;
  sendMessage: (text: string) => Promise<void>;
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
      sendMessage: async (text) => {
        const { offline } = get();
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
        };
        let conversationHistory: Message[] = [];
        set((state) => {
          const nextMessages = [...state.messages, userMessage];
          conversationHistory = nextMessages;
          return { messages: nextMessages, loading: true };
        });

        if (offline) {
          set({ loading: false, error: 'You appear to be offline. Try again when connected.' });
          return;
        }

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              conversationHistory,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get coach response');
          }

          const coachResponse: CoachResponse = await response.json();
          const coachMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: coachResponse.message,
            timestamp: new Date().toISOString(),
            structuredContent: coachResponse,
          };

          set((state) => ({
            messages: [...state.messages, coachMessage],
            loading: false,
          }));
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Coach response failed. Please retry.';
          set({ loading: false, error: errorMessage });
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
