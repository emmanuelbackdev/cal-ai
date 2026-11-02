import { and, count, desc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';

import { withUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { meals } from '@/server/db/schema';
import { mealPhotoFolder } from '@/server/imagekit';
import { DAILY_SCAN_LIMIT, startMealAnalysis, withThumbnail } from '@/server/meals';

const listQuery = z.object({ date: z.iso.date() });

/** GET /api/meals?date=YYYY-MM-DD — the signed-in user's meals for that local day, newest first (shape: `MealsResponse`). */
export const GET = withUser(async (request, user) => {
  const parsed = listQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: 'Expected ?date=YYYY-MM-DD' }, { status: 400 });

  const rows = await db.query.meals.findMany({
    where: and(eq(meals.userId, user.id), eq(meals.localDate, parsed.data.date)),
    orderBy: desc(meals.eatenAt),
    with: { items: { orderBy: (items, { asc }) => asc(items.position) } },
  });

  return Response.json({ meals: await Promise.all(rows.map(withThumbnail)) });
});

const createBody = z.object({
  /** From the ImageKit upload response. */
  fileId: z.string().min(1).max(100),
  filePath: z.string().min(1).max(500),
  /** The device's local day, used for day bucketing. */
  localDate: z.iso.date(),
  eatenAt: z.iso.datetime({ offset: true }).optional(),
});

/**
 * POST /api/meals — records a just-uploaded meal photo as a `pending` meal and starts `analyze-meal`
 * (shape: `CreateMealResponse`). 429 once the user hits the daily scan limit.
 */
export const POST = withUser(async (request, user) => {
  const parsed = createBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid meal', issues: parsed.error.issues }, { status: 400 });
  const { fileId, filePath, localDate, eatenAt } = parsed.data;

  // Upload credentials aren't folder-restricted, so only accept photos in this user's own folder.
  if (!filePath.startsWith(`${mealPhotoFolder(user.id)}/`)) {
    return Response.json({ error: 'Photo is not in your folder' }, { status: 403 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ scans }] = await db
    .select({ scans: count() })
    .from(meals)
    .where(and(eq(meals.userId, user.id), gt(meals.createdAt, since)));
  if (scans >= DAILY_SCAN_LIMIT) {
    return Response.json(
      { error: `You've reached ${DAILY_SCAN_LIMIT} scans in 24 hours. Try again later.` },
      { status: 429 }
    );
  }

  const [meal] = await db
    .insert(meals)
    .values({
      userId: user.id,
      status: 'pending',
      imageFileId: fileId,
      imagePath: filePath,
      localDate,
      ...(eatenAt && { eatenAt: new Date(eatenAt) }),
    })
    .returning();

  const started = await startMealAnalysis(meal.id, user.id, 'scan');
  if (!started) return Response.json({ error: 'Couldn’t start the analysis. Please try again.' }, { status: 502 });
  return Response.json({ meal: await withThumbnail({ ...started, items: [] }) }, { status: 201 });
});
