import { withUser } from '@/server/auth';
import { createUploadAuth } from '@/server/imagekit';

/**
 * POST /api/uploads/imagekit-auth — one-time parameters for uploading a meal photo straight to ImageKit
 * (shape: `UploadAuthResponse`). The app must upload into the returned `folder`; `POST /api/meals` checks it.
 */
export const POST = withUser(async (_request, user) => Response.json(await createUploadAuth(user.id)));
