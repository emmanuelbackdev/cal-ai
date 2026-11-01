import { eq } from 'drizzle-orm';

import { withUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { profiles, users } from '@/server/db/schema';
import { onboardingSchema } from '@/shared/profile';

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/**
 * POST /api/onboarding — saves the onboarding answers as the user's profile.
 * If a profile already exists (e.g. signing in on a second device), it wins and the draft is ignored.
 */
export const POST = withUser(async (request, user) => {
  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid onboarding data', issues: parsed.error.issues }, { status: 400 });
  }
  const { timezone, ...answers } = parsed.data;

  const [inserted] = await db
    .insert(profiles)
    .values({
      userId: user.id,
      ...answers,
      heightCm: oneDecimal(answers.heightCm),
      weightKg: oneDecimal(answers.weightKg),
      targetWeightKg: answers.targetWeightKg === null ? null : oneDecimal(answers.targetWeightKg),
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoNothing({ target: profiles.userId })
    .returning();

  if (timezone && timezone !== user.timezone) {
    await db.update(users).set({ timezone }).where(eq(users.id, user.id));
  }

  // TODO(M1): trigger the `generate-plan` task here once it exists. Until then the app derives
  // targets from the profile with the formula in src/shared/nutrition.ts.

  const profile = inserted ?? (await db.query.profiles.findFirst({ where: eq(profiles.userId, user.id) }));
  return Response.json({ profile, created: Boolean(inserted) }, { status: inserted ? 201 : 200 });
});
