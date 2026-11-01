import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useApiFetch } from '@/lib/api';
import type { MeResponse, OnboardingResponse } from '@/shared/api-types';
import type { OnboardingRequest } from '@/shared/profile';
import { toProfileInput, useOnboarding } from '@/stores/onboarding';

export const meQueryKey = ['me'] as const;

/** The signed-in user's row, profile and active plan from `GET /api/me`. */
export function useMe() {
  const { isSignedIn } = useAuth();
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiFetch<MeResponse>('/api/me'),
    enabled: !!isSignedIn,
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

/**
 * After sign-in, saves the locally persisted onboarding draft as the user's profile (once), then clears it.
 * If the account already has a profile, that one wins and the draft is discarded.
 */
export function useSyncOnboardingDraft() {
  const me = useMe();
  const draft = useOnboarding();
  const submit = useSubmitOnboarding();

  useEffect(() => {
    // `isIdle` makes this fire at most once per mount, even if the request fails.
    if (!me.data || !submit.isIdle) return;
    const input = toProfileInput(draft);
    if (!input) return;
    if (me.data.profile) {
      draft.reset();
      return;
    }
    submit.mutate(
      { ...input, unitSystem: draft.unitSystem, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { onSuccess: () => draft.reset() }
    );
  }, [me.data, draft, submit]);
}
