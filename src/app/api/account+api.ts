import { eq } from 'drizzle-orm';

import { withUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { clerkClient } from '@/server/users';

/**
 * DELETE /api/account — permanently deletes the signed-in user (App Store requirement).
 * Removes the Clerk user first, so a failure there leaves everything intact for a retry; the DB delete
 * cascades to profile, plans, meals and weight logs. The `user.deleted` webhook repeats it harmlessly.
 * TODO(M2): also delete the user's ImageKit folder once uploads exist.
 */
export const DELETE = withUser(async (_request, user) => {
  await clerkClient().users.deleteUser(user.clerkUserId);
  await db.delete(users).where(eq(users.id, user.id));
  return new Response(null, { status: 204 });
});
