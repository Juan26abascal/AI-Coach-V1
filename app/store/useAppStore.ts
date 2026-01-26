'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Athlete, TrainingPlan, Workout, ChatMessage, CheckIn } from '@/types';
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
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendMessageContent: (id: string, chunk: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  sendMessage: (content: string) => {
    offline: boolean;
    coachMessageId: string;
    context: {
      athlete: Athlete | null;
      plan: TrainingPlan | null;
      workouts: Workout[];
      checkIns: CheckIn[];
      recentMessages: ChatMessage[];
    };
  };
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
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
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
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === id ? { ...message, ...updates } : message
          ),
        })),
      appendMessageContent: (id, chunk) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === id ? { ...message, content: `${message.content}${chunk}` } : message
          ),
        })),
      sendMessage: (content) => {
        const { offline, athlete, plan, workouts, checkIns, messages } = get();
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
        };
        const coachMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'coach',
          content: '',
          createdAt: new Date().toISOString(),
          blocks: [],
        };
        set((state) => ({
          messages: [...state.messages, userMessage, coachMessage],
          loading: true,
        }));

        return {
          offline,
          coachMessageId: coachMessage.id,
          context: {
            athlete,
            plan,
            workouts,
            checkIns,
            recentMessages: messages.slice(-6),
          },
        };
      },
      addCheckIn: async (checkIn) => {
        const { offline, athlete, plan, workouts, checkIns, messages } = get();
        set((state) => ({ checkIns: [checkIn, ...state.checkIns], loading: true }));
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
