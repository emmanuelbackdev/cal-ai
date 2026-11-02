import { idempotencyKeys, tasks } from '@trigger.dev/sdk';

import type { generatePlan } from '@/trigger/generate-plan';

/**
 * Starts the `generate-plan` task for a user who has a profile but no plan. Safe to call repeatedly
 * (e.g. on every `/api/me` poll while the plan is being built): calls within 10 minutes share one run.
 * Never throws — the app keeps working on formula targets if Trigger.dev is unreachable.
 */
export async function requestPlanGeneration(userId: string) {
  try {
    const idempotencyKey = await idempotencyKeys.create(`generate-plan-${userId}`, { scope: 'global' });
    await tasks.trigger<typeof generatePlan>(
      'generate-plan',
      { userId },
      { idempotencyKey, idempotencyKeyTTL: '10m', tags: [`user_${userId}`] }
    );
  } catch (error) {
    console.error('Failed to trigger generate-plan', error);
  }
}
