// ImageKit helpers for API routes and Trigger.dev tasks. Signing uses Web Crypto so it runs the same
// in Node, Trigger.dev and EAS Hosting. Meal photos are uploaded as private files, so every read goes
// through a signed URL.

const UPLOAD_AUTH_TTL_SECONDS = 30 * 60; // ImageKit rejects `expire` more than 1 hour ahead

function config() {
  const privateKey = process.env.IMAGEKIT_SECRET_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.replace(/\/+$/, '');
  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error('Set IMAGEKIT_SECRET_KEY (private key), IMAGEKIT_PUBLIC_KEY and IMAGEKIT_URL_ENDPOINT');
  }
  return { privateKey, publicKey, urlEndpoint };
}

async function hmacSha1Hex(key: string, message: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, [
    'sign',
  ]);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Folder a user's meal photos live in, e.g. `/dev/users/<uuid>/meals`. Separates environments in one account. */
export function mealPhotoFolder(userId: string) {
  return `/${process.env.IMAGEKIT_ENV ?? 'dev'}/users/${userId}/meals`;
}

/** Short-lived parameters that let the app upload one file straight to ImageKit. */
export async function createUploadAuth(userId: string) {
  const { privateKey, publicKey } = config();
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + UPLOAD_AUTH_TTL_SECONDS;
  const signature = await hmacSha1Hex(privateKey, token + expire);
  return { token, expire, signature, publicKey, folder: mealPhotoFolder(userId) };
}

/**
 * Signed URL for a private file. `transformation` uses ImageKit's path syntax without the `tr:` prefix,
 * e.g. `w-200,h-200,fo-auto`. The transformation is part of the signed path, so it can't be altered.
 */
export async function signedImageUrl(filePath: string, { transformation, expiresInSeconds = 3600 }: { transformation?: string; expiresInSeconds?: number } = {}) {
  const { privateKey, urlEndpoint } = config();
  const path = `${transformation ? `tr:${transformation}/` : ''}${filePath.replace(/^\/+/, '')}`;
  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = await hmacSha1Hex(privateKey, path + expiry);
  return `${urlEndpoint}/${path}?ik-t=${expiry}&ik-s=${signature}`;
}
