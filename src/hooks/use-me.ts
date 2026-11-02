import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useApiFetch } from '@/lib/api';
import type { MeResponse, OnboardingResponse, ProfileResponse } from '@/shared/api-types';
import { calculateBaselineTargets, type NutritionTargets } from '@/shared/nutrition';
import type { OnboardingRequest, ProfileUpdateRequest } from '@/shared/profile';
import { toProfileInput, useOnboarding, useOnboardingHydrated } from '@/stores/onboarding';

export const meQueryKey = ['me'] as const;

/** How often to check back while the `generate-plan` task is building the user's plan. */
const PLAN_POLL_MS = 2000;

/** The signed-in user's row, profile and active plan from `GET /api/me`. Polls while the plan is being generated. */
export function useMe() {
  const { isSignedIn } = useAuth();
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiFetch<MeResponse>('/api/me'),
    enabled: !!isSignedIn,
    refetchInterval: (query) => (query.state.data?.profile && !query.state.data.plan ? PLAN_POLL_MS : false),
  });
}

export function useSubmitOnboarding() {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OnboardingRequest) =>
      apiFetch<OnboardingResponse>('/api/onboarding', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

/** Where today's targets came from: a saved plan's source, or `estimate` while the plan is still being generated. */
export type TargetSource = NonNullable<MeResponse['plan']>['source'] | 'estimate';

/**
 * Today's targets: the active plan (from Claude, or the formula if that failed). While the plan is still
 * being generated, a formula estimate from the saved profile or local draft so the screen isn't empty.
 */
export function useDailyTargets(): { targets: NutritionTargets | null; source: TargetSource | null } {
  const { data: me } = useMe();
  const draftProfile = toProfileInput(useOnboarding());
  if (me?.plan) return { targets: me.plan, source: me.plan.source };
  const profile = me?.profile ?? draftProfile;
  return profile ? { targets: calculateBaselineTargets(profile), source: 'estimate' } : { targets: null, source: null };
}

/** `PATCH /api/profile`. Applies the change to the cached profile immediately, then refetches. */
export function useUpdateProfile() {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: ProfileUpdateRequest) =>
      apiFetch<ProfileResponse>('/api/profile', { method: 'PATCH', body: JSON.stringify(changes) }),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: meQueryKey });
      const previous = queryClient.getQueryData<MeResponse>(meQueryKey);
      if (previous?.profile) {
        queryClient.setQueryData<MeResponse>(meQueryKey, { ...previous, profile: { ...previous.profile, ...changes } });
      }
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(meQueryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

/** `DELETE /api/account`. The caller signs out afterwards. */
export function useDeleteAccount() {
  const apiFetch = useApiFetch();
  return useMutation({ mutationFn: () => apiFetch<void>('/api/account', { method: 'DELETE' }) });
}

/**
 * Where a signed-in user belongs:
 * - `onboarding`: no saved profile and no finished local draft — every user answers the questions first.
 * - `plan`: onboarded, but the plan is still being built or hasn't been shown yet (plan-reveal screen).
 * - `home`: everything else, including when `/api/me` failed (rather than trapping the user).
 * `resolved` is false while that's still unknown.
 */
export function useOnboardingGate() {
  const { isSignedIn } = useAuth();
  const me = useMe();
  const hydrated = useOnboardingHydrated();
  const finished = useOnboarding((s) => s.finished);
  const revealPending = useOnboarding((s) => s.revealPending);

  if (!isSignedIn) return { resolved: true, needsOnboarding: false, destination: null };
  if (!hydrated || me.isPending) return { resolved: false, needsOnboarding: false, destination: null };

  const data = me.data;
  const needsOnboarding = !!data && !data.profile && !finished;
  const destination = !data
    ? 'home'
    : needsOnboarding
      ? 'onboarding'
      : !data.profile || !data.plan || revealPending
        ? 'plan'
        : 'home';
  return { resolved: true, needsOnboarding, destination } as const;
}

/**
 * Once signed in, submits a finished onboarding draft as the user's profile (once), then clears it.
 * If the account already has a profile, that one wins and the draft is discarded.
 */
export function useSyncOnboardingDraft() {
  const me = useMe();
  const hydrated = useOnboardingHydrated();
  const draft = useOnboarding();
  const submit = useSubmitOnboarding();

  useEffect(() => {
    // `isIdle` makes this fire at most once per mount, even if the request fails.
    if (!hydrated || !me.data || !submit.isIdle) return;
    const input = toProfileInput(draft);
    if (me.data.profile) {
      if (input || draft.finished) draft.reset();
      return;
    }
    if (!draft.finished || !input) return;
    submit.mutate(
      { ...input, unitSystem: draft.unitSystem, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      {
        onSuccess: ({ created }) => {
          draft.reset();
          if (created) draft.setRevealPending(true);
        },
      }
    );
  }, [hydrated, me.data, draft, submit]);
}
