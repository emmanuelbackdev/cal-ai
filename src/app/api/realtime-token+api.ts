import { auth } from '@trigger.dev/sdk';

import { withUser } from '@/server/auth';
import { mealRunsTag } from '@/server/meals';

/**
 * POST /api/realtime-token — a read-only Trigger.dev token for the signed-in user's meal-analysis runs
 * (tag `meals_<userId>`), so the app can show results as soon as they're ready (shape: `RealtimeTokenResponse`).
 */
export const POST = withUser(async (_request, user) => {
  const token = await auth.createPublicToken({
    scopes: { read: { tags: [mealRunsTag(user.id)] } },
    expirationTime: '1h',
  });
  return Response.json({ token, tag: mealRunsTag(user.id) });
});
