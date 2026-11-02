import { idempotencyKeys, tasks } from '@trigger.dev/sdk';
import { eq } from 'drizzle-orm';

import type { analyzeMeal } from '@/trigger/analyze-meal';

import { db } from './db/client';
import { meals, type Meal, type MealItem } from './db/schema';
import { signedImageUrl } from './imagekit';

/** Max meal scans per user in any rolling 24 hours (plan.md: 20/day, env-configurable). */
export const DAILY_SCAN_LIMIT = Number(process.env.MEAL_SCAN_DAILY_LIMIT ?? 20);

/** Tag on every `analyze-meal` run, and the scope of the user's Realtime token. */
export const mealRunsTag = (userId: string) => `meals_${userId}`;

/** Adds a short-lived signed thumbnail URL for the meal's private photo. */
export async function withThumbnail<T extends Meal & { items: MealItem[] }>(meal: T) {
  return { ...meal, imageUrl: await signedImageUrl(meal.imagePath, { transformation: 'w-240,h-240,fo-auto' }) };
}

/**
 * Starts `analyze-meal` for a meal already saved as `pending`, and records the run id. `attemptKey`
 * makes each attempt its own run (first scan vs. retries) while deduplicating double submits.
 * Returns the updated meal, or null after marking it failed if Trigger.dev couldn't be reached.
 */
export async function startMealAnalysis(mealId: string, userId: string, attemptKey: string) {
  try {
    const handle = await tasks.trigger<typeof analyzeMeal>(
      'analyze-meal',
      { mealId },
      {
        idempotencyKey: await idempotencyKeys.create(`analyze-meal-${mealId}-${attemptKey}`, { scope: 'global' }),
        tags: [mealRunsTag(userId), `meal_${mealId}`],
      }
    );
    const [updated] = await db.update(meals).set({ triggerRunId: handle.id }).where(eq(meals.id, mealId)).returning();
    return updated;
  } catch (error) {
    console.error('Failed to trigger analyze-meal', error);
    await db.update(meals).set({ status: 'failed', failureReason: 'ai_error' }).where(eq(meals.id, mealId));
    return null;
  }
}
