import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { withUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { meals } from '@/server/db/schema';
import { startMealAnalysis, withThumbnail } from '@/server/meals';

/**
 * POST /api/meals/:id/retry — runs the analysis again for one of the user's failed meals, reusing the
 * uploaded photo (shape: `CreateMealResponse`). 409 if the meal isn't failed (e.g. a double tap).
 */
export const POST = withUser(async (_request, user, { id }) => {
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Meal not found' }, { status: 404 });

  // Only a failed meal of this user moves back to pending; the WHERE makes concurrent retries no-ops.
  const [meal] = await db
    .update(meals)
    .set({ status: 'pending', failureReason: null })
    .where(and(eq(meals.id, id), eq(meals.userId, user.id), eq(meals.status, 'failed')))
    .returning();
  if (!meal) return Response.json({ error: 'This meal can’t be retried' }, { status: 409 });

  const started = await startMealAnalysis(meal.id, user.id, `retry-${Date.now()}`);
  if (!started) return Response.json({ error: 'Couldn’t start the analysis. Please try again.' }, { status: 502 });
  return Response.json({ meal: await withThumbnail({ ...started, items: [] }) });
});
