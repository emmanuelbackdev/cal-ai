import { and, desc, eq, lte } from 'drizzle-orm';
import { z } from 'zod';

import { withUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { meals } from '@/server/db/schema';
import { addDays, computeStreak } from '@/shared/streak';

const query = z.object({ today: z.iso.date() });

/** Enough history for any realistic streak; a longer one is shown as this many days. */
const MAX_DAYS = 366;

/**
 * GET /api/streak?today=YYYY-MM-DD — the signed-in user's current streak (shape: `StreakResponse`).
 * `today` is the device's local date, the same day bucketing used for `meals.local_date`.
 */
export const GET = withUser(async (request, user) => {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: 'Expected ?today=YYYY-MM-DD' }, { status: 400 });
  const { today } = parsed.data;

  const rows = await db
    .selectDistinct({ localDate: meals.localDate })
    .from(meals)
    .where(and(eq(meals.userId, user.id), eq(meals.status, 'complete'), lte(meals.localDate, today)))
    .orderBy(desc(meals.localDate))
    .limit(MAX_DAYS);

  const loggedDates = rows.map((r) => r.localDate);
  const weekStart = addDays(today, -6);
  return Response.json({
    ...computeStreak(loggedDates, today),
    /** Logged days within the last 7 days, for the week view. */
    recentDates: loggedDates.filter((d) => d >= weekStart),
  });
});
