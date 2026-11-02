import { and, eq } from 'drizzle-orm';

import { withUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { nutritionPlans, profiles } from '@/server/db/schema';
import { requestPlanGeneration } from '@/server/plans';

/** GET /api/me — the signed-in user's row, profile and active plan (shape: `MeResponse`). Creates the user row if needed. */
export const GET = withUser(async (_request, user) => {
  const [profile, plan] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.userId, user.id) }),
    db.query.nutritionPlans.findFirst({
      where: and(eq(nutritionPlans.userId, user.id), eq(nutritionPlans.isActive, true)),
    }),
  ]);

  // Onboarded but no plan yet (still generating, or a trigger that never ran): make sure a run is going.
  if (profile && !plan) await requestPlanGeneration(user.id);

  return Response.json({ user, profile: profile ?? null, plan: plan ?? null });
});
