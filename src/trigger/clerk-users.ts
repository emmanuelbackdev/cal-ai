import { logger, schemaTask } from '@trigger.dev/sdk';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../server/db/client';
import { users } from '../server/db/schema';
import { upsertClerkUser } from '../server/users';

// Tasks that mirror Clerk users into the `users` table. Triggered by the Clerk webhook route
// (src/app/api/webhooks/clerk+api.ts), one task per event type.

export const clerkUserSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  /** Clerk's `updated_at`, in epoch milliseconds. */
  clerkUpdatedAt: z.number().int(),
});

export const clerkUserDeletedSchema = z.object({
  clerkUserId: z.string().min(1),
});

export type ClerkUserPayload = z.infer<typeof clerkUserSchema>;
export type ClerkUserDeletedPayload = z.infer<typeof clerkUserDeletedSchema>;

/** `user.created` */
export const clerkUserCreated = schemaTask({
  id: 'clerk-user-created',
  schema: clerkUserSchema,
  maxDuration: 60,
  run: async (payload) => {
    const row = await upsertClerkUser(payload);
    if (!row) {
      logger.info('User already stored with newer data', { clerkUserId: payload.clerkUserId });
      return { status: 'skipped_stale' as const };
    }
    logger.info('Created user', { clerkUserId: payload.clerkUserId, userId: row.id });
    return { status: 'created' as const, userId: row.id };
  },
});

/** `user.updated` */
export const clerkUserUpdated = schemaTask({
  id: 'clerk-user-updated',
  schema: clerkUserSchema,
  maxDuration: 60,
  run: async (payload) => {
    const row = await upsertClerkUser(payload);
    if (!row) {
      logger.info('Skipped stale update', { clerkUserId: payload.clerkUserId });
      return { status: 'skipped_stale' as const };
    }
    logger.info('Updated user', { clerkUserId: payload.clerkUserId, userId: row.id });
    return { status: 'updated' as const, userId: row.id };
  },
});

/** `user.deleted`. Cascades to the user's profile, plans, meals and weight logs. */
export const clerkUserDeleted = schemaTask({
  id: 'clerk-user-deleted',
  schema: clerkUserDeletedSchema,
  maxDuration: 60,
  run: async ({ clerkUserId }) => {
    const deleted = await db.delete(users).where(eq(users.clerkUserId, clerkUserId)).returning({ id: users.id });
    if (deleted.length === 0) {
      logger.info('No stored user to delete', { clerkUserId });
      return { status: 'not_found' as const };
    }
    logger.info('Deleted user', { clerkUserId, userId: deleted[0].id });
    return { status: 'deleted' as const, userId: deleted[0].id };
  },
});
