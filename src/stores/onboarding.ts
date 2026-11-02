import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ActivityLevel, Goal, Pace, ProfileInput, Sex } from '@/shared/nutrition';
import { PACE_RATES_KG } from '@/shared/nutrition';
import type { UnitSystem } from '@/shared/units';

export type OnboardingDraft = {
  sex: Sex | null;
  birthDate: string;
  unitSystem: UnitSystem;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  targetWeightKg: number | null;
  pace: Pace;
  /** Set when the user taps Continue on the last onboarding screen; only then is the draft submitted. */
  finished: boolean;
};

type OnboardingStore = OnboardingDraft & {
  /**
   * True from the moment the draft is saved as a profile until the user has seen their plan
   * (plan-reveal screen). Not part of the draft, so `reset()` leaves it alone.
   */
  revealPending: boolean;
  set: (patch: Partial<OnboardingDraft>) => void;
  setRevealPending: (revealPending: boolean) => void;
  reset: () => void;
};

const initialDraft: OnboardingDraft = {
  sex: null,
  birthDate: '2000-01-01',
  unitSystem: 'metric',
  heightCm: 175,
  weightKg: 64,
  activityLevel: null,
  goal: null,
  targetWeightKg: null,
  pace: 'recommended',
  finished: false,
};

/** Onboarding answers, persisted locally until the user signs in and the profile is created. */
export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialDraft,
      revealPending: false,
      set: (patch) => set(patch),
      setRevealPending: (revealPending) => set({ revealPending }),
      reset: () => set(initialDraft),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** False until the persisted draft has been read back from storage on launch. */
export function useOnboardingHydrated() {
  return useSyncExternalStore(
    useOnboarding.persist.onFinishHydration,
    useOnboarding.persist.hasHydrated,
    () => false // server render (web): storage isn't available there
  );
}

export const ONBOARDING_STEPS = [
  'sex',
  'birth-date',
  'units',
  'height',
  'weight',
  'activity',
  'goal',
  'target-weight',
  'pace',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Which of the 4 progress-bar segments a step belongs to (the plan preview is the 4th). */
export const STEP_PHASE: Record<OnboardingStep, 1 | 2 | 3> = {
  sex: 1,
  'birth-date': 1,
  units: 1,
  height: 2,
  weight: 2,
  activity: 3,
  goal: 3,
  'target-weight': 3,
  pace: 3,
};

/** Question steps for the current answers; target weight and pace are skipped when maintaining. */
export function stepsFor(goal: Goal | null): OnboardingStep[] {
  return goal === 'maintain'
    ? ONBOARDING_STEPS.filter((s) => s !== 'target-weight' && s !== 'pace')
    : [...ONBOARDING_STEPS];
}

export function toProfileInput(draft: OnboardingDraft): ProfileInput | null {
  if (!draft.sex || !draft.activityLevel || !draft.goal) return null;
  return {
    sex: draft.sex,
    birthDate: draft.birthDate,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    activityLevel: draft.activityLevel,
    goal: draft.goal,
    targetWeightKg: draft.goal === 'maintain' ? null : (draft.targetWeightKg ?? draft.weightKg),
    weeklyRateKg: draft.goal === 'maintain' ? null : PACE_RATES_KG[draft.goal][draft.pace],
  };
}
