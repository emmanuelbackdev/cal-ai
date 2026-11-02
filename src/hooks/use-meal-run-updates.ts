import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * iOS/Android: Trigger.dev's Realtime hooks can't be bundled for React Native (they import Node-only
 * modules), so results arrive through `useDayMeals` polling while a meal is analyzing (plan.md fallback).
 * When analysis stops (`active` goes false), refresh the streak too. Web uses Realtime (.web.ts).
 */
export function useMealRunUpdates(active: boolean) {
  const queryClient = useQueryClient();
  const wasActive = useRef(active);

  useEffect(() => {
    if (wasActive.current && !active) queryClient.invalidateQueries({ queryKey: ['streak'] });
    wasActive.current = active;
  }, [active, queryClient]);
}
