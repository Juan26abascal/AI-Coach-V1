'use client';

import { create } from 'zustand';
import type { Athlete, TrainingPlan, Workout, ChatMessage, CheckIn } from '@/types';

type OnboardingPayload = Omit<Athlete, 'id'>;

type AppState = {
  athlete: Athlete | null;
  plan: TrainingPlan | null;
  workouts: Workout[];
  messages: ChatMessage[];
  checkIns: CheckIn[];
  loading: boolean;
  error: string | null;
  offline: boolean;
  hydrated: boolean;
  setOffline: (offline: boolean) => void;
  hydrate: () => Promise<void>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
  updateAthlete: (athlete: Athlete) => Promise<void>;
  addWorkout: (workout: Omit<Workout, 'id'>) => Promise<void>;
  updatePlan: (plan: TrainingPlan) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id'>) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
  clearError: () => void;
};

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { error?: string })?.error || 'Request failed.');
  }
  return response.json();
}

export const useAppStore = create<AppState>((set, get) => ({
  athlete: null,
  plan: null,
  workouts: [],
  messages: [],
  checkIns: [],
  loading: false,
  error: null,
  offline: false,
  hydrated: false,
  setOffline: (offline) => set({ offline }),
  clearError: () => set({ error: null }),
  hydrate: async () => {
    if (get().hydrated) return;
    set({ loading: true });
    try {
      const data = await fetchJson<{
        athlete: Athlete | null;
        plan: TrainingPlan | null;
        workouts: Workout[];
        messages: ChatMessage[];
        checkIns: CheckIn[];
      }>('/api/bootstrap');
      set({
        athlete: data.athlete,
        plan: data.plan,
        workouts: data.workouts,
        messages: data.messages,
        checkIns: data.checkIns,
        loading: false,
        error: null,
        hydrated: true,
      });
    } catch {
      set({ loading: false, error: 'Unable to load athlete data.', hydrated: true });
    }
  },
  completeOnboarding: async (payload) => {
    set({ loading: true });
    try {
      const data = await fetchJson<{
        athlete: Athlete;
        plan: TrainingPlan;
        workouts: Workout[];
        messages: ChatMessage[];
        checkIns: CheckIn[];
      }>('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      set({
        athlete: data.athlete,
        plan: data.plan,
        workouts: data.workouts,
        messages: data.messages,
        checkIns: data.checkIns,
        loading: false,
        error: null,
        hydrated: true,
      });
    } catch {
      set({ loading: false, error: 'Unable to save onboarding profile.' });
    }
  },
  updateAthlete: async (athlete) => {
    set({ loading: true });
    try {
      const data = await fetchJson<{ athlete: Athlete }>('/api/athlete', {
        method: 'PUT',
        body: JSON.stringify(athlete),
      });
      set({ athlete: data.athlete, loading: false, error: null });
    } catch {
      set({ loading: false, error: 'Could not update athlete profile.' });
    }
  },
  addWorkout: async (workout) => {
    set({ loading: true });
    try {
      const data = await fetchJson<{ workout: Workout }>('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(workout),
      });
      set((state) => ({ workouts: [data.workout, ...state.workouts], loading: false, error: null }));
    } catch {
      set({ loading: false, error: 'Workout could not be saved.' });
    }
  },
  updatePlan: async (plan) => {
    set({ loading: true });
    try {
      const data = await fetchJson<{ plan: TrainingPlan }>('/api/plan', {
        method: 'PUT',
        body: JSON.stringify(plan),
      });
      set({ plan: data.plan, loading: false, error: null });
    } catch {
      set({ loading: false, error: 'Plan update failed.' });
    }
  },
  addMessage: async (message) => {
    try {
      const data = await fetchJson<{ message: ChatMessage }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify(message),
      });
      set((state) => ({ messages: [...state.messages, data.message] }));
    } catch {
      set({ error: 'Message could not be saved.' });
    }
  },
  sendMessage: async (content) => {
    const { offline, athlete, plan, workouts, checkIns, messages } = get();
    if (offline) {
      set({ error: 'You appear to be offline. Try again when connected.' });
      return;
    }

    set({ loading: true });

    try {
      const userMessage = await fetchJson<{ message: ChatMessage }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ role: 'user', content }),
      });
      const updatedMessages = [...messages, userMessage.message];
      set({ messages: updatedMessages });

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
            recentMessages: updatedMessages.slice(-6),
          },
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Coach response failed.');
      }

      const data = await apiResponse.json();
      const coachMessage = await fetchJson<{ message: ChatMessage }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          role: 'coach',
          content: (data as { summary?: string }).summary ?? 'Coach response ready.',
          blocks: (data as { blocks?: unknown[] }).blocks ?? [],
        }),
      });

      set({
        messages: [...updatedMessages, coachMessage.message],
        loading: false,
        error: null,
      });
    } catch {
      set({ loading: false, error: 'Coach response failed. Please retry.' });
    }
  },
  addCheckIn: async (checkIn) => {
    const { offline, athlete, plan, workouts, checkIns, messages } = get();
    if (offline) {
      set({ error: 'Check-in saved locally. Coach will sync later.' });
      return;
    }
    set({ loading: true });
    try {
      const data = await fetchJson<{ checkIn: CheckIn }>('/api/check-ins', {
        method: 'POST',
        body: JSON.stringify(checkIn),
      });
      const updatedCheckIns = [data.checkIn, ...checkIns];
      set({ checkIns: updatedCheckIns });

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
            checkIns: updatedCheckIns,
            recentMessages: messages.slice(-6),
          },
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Coach response failed.');
      }

      const response = await apiResponse.json();
      const coachMessage = await fetchJson<{ message: ChatMessage }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          role: 'coach',
          content: (response as { summary?: string }).summary ?? 'Coach response ready.',
          blocks: (response as { blocks?: unknown[] }).blocks ?? [],
        }),
      });

      set((state) => ({
        messages: [...state.messages, coachMessage.message],
        loading: false,
        error: null,
      }));
    } catch {
      set({ loading: false, error: 'Coach could not review the check-in.' });
    }
  },
}));
