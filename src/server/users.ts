import { createClerkClient } from '@clerk/backend';
import { eq, isNull, lt, or } from 'drizzle-orm';

import { db } from './db/client';
import { users, type User } from './db/schema';

export type ClerkUserFields = {
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  /** Clerk's `updated_at`, in epoch milliseconds. */
  clerkUpdatedAt: number;
};

/**
 * Inserts the user, or updates the existing row. Clerk data can arrive late, retried, or out of order
 * (webhooks, or the API creating the row first), so only data newer than what's stored is applied.
 * Returns null when the stored row is already newer.
 */
export async function upsertClerkUser({ clerkUserId, clerkUpdatedAt, ...profile }: ClerkUserFields) {
  const updatedAt = new Date(clerkUpdatedAt);
  const [row] = await db
    .insert(users)
    .values({ clerkUserId, ...profile, clerkUpdatedAt: updatedAt })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { ...profile, clerkUpdatedAt: updatedAt, updatedAt: new Date() },
      setWhere: or(isNull(users.clerkUpdatedAt), lt(users.clerkUpdatedAt, updatedAt)),
    })
    .returning();
  return row ?? null;
}

let clerk: ReturnType<typeof createClerkClient> | undefined;

/**
 * Returns the `users` row for a Clerk user, creating it from Clerk's Backend API if the
 * `user.created` webhook hasn't landed yet. The webhook stays the normal path; this is the fallback.
 */
export async function ensureUser(clerkUserId: string): Promise<User> {
  const existing = await db.query.users.findFirst({ where: eq(users.clerkUserId, clerkUserId) });
  if (existing) return existing;

  clerk ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId);

  const row = await upsertClerkUser({
    clerkUserId,
    email: primaryEmail?.emailAddress ?? null,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.hasImage ? clerkUser.imageUrl : null,
    clerkUpdatedAt: clerkUser.updatedAt,
  });
  // A concurrent webhook can win the race with newer data; read whatever is stored now.
  return row ?? (await db.query.users.findFirst({ where: eq(users.clerkUserId, clerkUserId) }))!;
}
