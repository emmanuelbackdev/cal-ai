import { eq } from 'drizzle-orm';

import { withUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { profiles } from '@/server/db/schema';
import { profileUpdateSchema } from '@/shared/profile';

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** PATCH /api/profile — updates any subset of the signed-in user's profile (shape: `ProfileResponse`). */
export const PATCH = withUser(async (request, user) => {
  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid profile data', issues: parsed.error.issues }, { status: 400 });
  }
  const changes = parsed.data;

  const [profile] = await db
    .update(profiles)
    .set({
      ...changes,
      ...(changes.heightCm !== undefined && { heightCm: oneDecimal(changes.heightCm) }),
      ...(changes.weightKg !== undefined && { weightKg: oneDecimal(changes.weightKg) }),
      ...(changes.targetWeightKg != null && { targetWeightKg: oneDecimal(changes.targetWeightKg) }),
    })
    .where(eq(profiles.userId, user.id))
    .returning();

  if (!profile) return Response.json({ error: 'Complete onboarding first' }, { status: 404 });
  return Response.json({ profile });
});
