import type { UserJSON } from '@clerk/backend';
import { verifyWebhook, type WebhookEvent } from '@clerk/backend/webhooks';
import { idempotencyKeys, tasks } from '@trigger.dev/sdk';

import type {
  ClerkUserPayload,
  clerkUserCreated,
  clerkUserDeleted,
  clerkUserUpdated,
} from '@/trigger/clerk-users';

/** Only the fields we store, so the full Clerk user object (metadata etc.) never reaches task logs. */
function toUserPayload(user: UserJSON): ClerkUserPayload {
  const primaryEmail = user.email_addresses.find((e) => e.id === user.primary_email_address_id);
  return {
    clerkUserId: user.id,
    email: primaryEmail?.email_address ?? null,
    firstName: user.first_name,
    lastName: user.last_name,
    imageUrl: user.has_image ? user.image_url : null,
    clerkUpdatedAt: user.updated_at,
  };
}

/**
 * Clerk webhook endpoint: POST /api/webhooks/clerk.
 * Verifies the Svix signature, hands the event to the matching Trigger.dev task, and acknowledges right away.
 */
export async function POST(request: Request) {
  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(request); // reads CLERK_WEBHOOK_SIGNING_SECRET
  } catch (err) {
    console.error('Clerk webhook verification failed', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Clerk retries with the same svix-id; a global key keeps each delivery to a single run.
  const svixId = request.headers.get('svix-id');
  const idempotencyKey = svixId ? await idempotencyKeys.create(svixId, { scope: 'global' }) : undefined;

  try {
    switch (evt.type) {
      case 'user.created': {
        const payload = toUserPayload(evt.data);
        await tasks.trigger<typeof clerkUserCreated>('clerk-user-created', payload, {
          idempotencyKey,
          tags: [`clerk_${payload.clerkUserId}`],
        });
        break;
      }
      case 'user.updated': {
        const payload = toUserPayload(evt.data);
        await tasks.trigger<typeof clerkUserUpdated>('clerk-user-updated', payload, {
          idempotencyKey,
          tags: [`clerk_${payload.clerkUserId}`],
        });
        break;
      }
      case 'user.deleted': {
        const clerkUserId = evt.data.id;
        if (!clerkUserId) return Response.json({ ignored: 'user.deleted without id' });
        await tasks.trigger<typeof clerkUserDeleted>(
          'clerk-user-deleted',
          { clerkUserId },
          { idempotencyKey, tags: [`clerk_${clerkUserId}`] }
        );
        break;
      }
      default:
        return Response.json({ ignored: evt.type });
    }
  } catch (err) {
    // A non-2xx makes Clerk retry the delivery later.
    console.error(`Failed to trigger task for ${evt.type}`, err);
    return Response.json({ error: 'Failed to enqueue' }, { status: 500 });
  }

  return Response.json({ received: true });
}
