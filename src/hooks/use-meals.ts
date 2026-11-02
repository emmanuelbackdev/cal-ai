import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiFetch } from '@/lib/api';
import type { CreateMealResponse, MealWithItems, MealsResponse } from '@/shared/api-types';

/**
 * Refresh interval while a meal is being analyzed. This is how iOS/Android get results; on web it
 * backs up Trigger.dev Realtime (see use-meal-run-updates).
 */
const PENDING_POLL_MS = 3000;

export const isAnalyzing = (meal: Pick<MealWithItems, 'status'>) => meal.status === 'pending' || meal.status === 'analyzing';

/** The signed-in user's meals for a local day (`YYYY-MM-DD`). Polls while any of them is still being analyzed. */
export function useDayMeals(date: string) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ['meals', date],
    queryFn: () => apiFetch<MealsResponse>(`/api/meals?date=${date}`),
    select: (data) => data.meals,
    refetchInterval: (query) => (query.state.data?.meals.some(isAnalyzing) ? PENDING_POLL_MS : false),
  });
}

/** `POST /api/meals/:id/retry`. Shows the meal as analyzing right away; polling picks up the result. */
export function useRetryMeal() {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  const setMeal = (meal: Pick<MealWithItems, 'id' | 'localDate'>, patch: Partial<MealWithItems>) =>
    queryClient.setQueryData<MealsResponse>(['meals', meal.localDate], (old) =>
      old ? { meals: old.meals.map((m) => (m.id === meal.id ? { ...m, ...patch } : m)) } : old
    );

  return useMutation({
    mutationFn: (meal: MealWithItems) =>
      apiFetch<CreateMealResponse>(`/api/meals/${meal.id}/retry`, { method: 'POST' }),
    onMutate: (meal) => setMeal(meal, { status: 'pending', failureReason: null }),
    onError: (_error, meal) => queryClient.invalidateQueries({ queryKey: ['meals', meal.localDate] }),
    onSuccess: ({ meal }) => setMeal(meal, meal),
  });
}

/** Calories and macros eaten, counting only meals whose analysis has finished. */
export function sumEaten(meals: MealWithItems[] | undefined) {
  const eaten = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const meal of meals ?? []) {
    if (meal.status !== 'complete') continue;
    eaten.calories += meal.calories ?? 0;
    eaten.proteinG += meal.proteinG ?? 0;
    eaten.carbsG += meal.carbsG ?? 0;
    eaten.fatG += meal.fatG ?? 0;
  }
  return eaten;
}
