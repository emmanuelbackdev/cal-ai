import { type Href, router } from 'expo-router';

import { type OnboardingStep, STEP_PHASE, stepsFor, useOnboarding } from '@/stores/onboarding';

/** Progress (0–1) for a question step and a `next()` that routes to the following step. */
export function useOnboardingStep(step: OnboardingStep) {
  const goal = useOnboarding((s) => s.goal);
  const steps = stepsFor(goal);
  const following = steps[steps.indexOf(step) + 1];

  return {
    progress: STEP_PHASE[step] / 4,
    next: () => router.push((following ? `/onboarding/${following}` : '/onboarding/result') as Href),
  };
}
