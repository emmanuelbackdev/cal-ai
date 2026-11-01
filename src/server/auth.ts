import { verifyToken } from '@clerk/backend';

import type { User } from './db/schema';
import { ensureUser } from './users';

/** Returns the Clerk user id from a `Authorization: Bearer <session token>` header, or null if it's missing/invalid. */
async function clerkUserIdFrom(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return null;
  try {
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return claims.sub;
  } catch {
    return null;
  }
}

/**
 * Wraps an API route handler so it only runs for a signed-in user, and receives that user's `users` row.
 * Every query in the handler must filter by `user.id` — never trust ids sent by the client.
 */
export function withUser(handler: (request: Request, user: User) => Promise<Response>) {
  return async (request: Request) => {
    const clerkUserId = await clerkUserIdFrom(request);
    if (!clerkUserId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await ensureUser(clerkUserId);
    return handler(request, user);
  };
}
