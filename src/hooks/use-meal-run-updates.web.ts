import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeRunsWithTag } from '@trigger.dev/react-hooks';
import { useEffect } from 'react';

import { useApiFetch } from '@/lib/api';
import type { RealtimeTokenResponse } from '@/shared/api-types';

/** Realtime tokens last an hour; refresh a little before that. */
const TOKEN_STALE_MS = 50 * 60 * 1000;

/**
 * Web: while `active`, subscribes to the user's `analyze-meal` runs through Trigger.dev Realtime and
 * refreshes meals and the streak the moment a run finishes. The source of truth stays `GET /api/meals`.
 * (iOS/Android use use-meal-run-updates.ts: @trigger.dev/react-hooks pulls in Node-only modules there.)
 */
export function useMealRunUpdates(active: boolean) {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  const token = useQuery({
    queryKey: ['realtime-token'],
    queryFn: () => apiFetch<RealtimeTokenResponse>('/api/realtime-token', { method: 'POST' }),
    enabled: active,
    staleTime: TOKEN_STALE_MS,
  });

  const { runs } = useRealtimeRunsWithTag(token.data?.tag ?? '', {
    accessToken: token.data?.token,
    enabled: active && !!token.data,
    createdAt: '1h',
    skipColumns: ['payload', 'output', 'metadata'],
  });

  const finishedRuns = runs
    .filter((run) => run.isCompleted)
    .map((run) => run.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (!finishedRuns) return;
    queryClient.invalidateQueries({ queryKey: ['meals'] });
    queryClient.invalidateQueries({ queryKey: ['streak'] });
  }, [finishedRuns, queryClient]);
}
