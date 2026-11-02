import { useQuery } from '@tanstack/react-query';

import { useApiFetch } from '@/lib/api';
import { toLocalDate } from '@/lib/dates';
import type { StreakResponse } from '@/shared/api-types';

/** The signed-in user's logging streak, counted in the device's local days. */
export function useStreak() {
  const apiFetch = useApiFetch();
  const today = toLocalDate(new Date());
  return useQuery({
    queryKey: ['streak', today],
    queryFn: () => apiFetch<StreakResponse>(`/api/streak?today=${today}`),
  });
}
