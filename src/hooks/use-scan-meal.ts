import { useMutation, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { ApiError, useApiFetch } from '@/lib/api';
import { toLocalDate } from '@/lib/dates';
import type { CreateMealResponse, MealsResponse, UploadAuthResponse } from '@/shared/api-types';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export type ScanStep = 'preparing' | 'uploading' | 'saving';

/** ImageKit rejected or didn't complete the upload; `message` is ImageKit's own explanation. */
class ImageKitUploadError extends Error {}

/**
 * Downscales to at most 1280px wide (never upscales) and re-encodes as JPEG to keep uploads small.
 * If that fails for some photo, the original is uploaded instead rather than failing the scan.
 */
async function compress(uri: string) {
  try {
    const image = await ImageManipulator.manipulate(uri, { maxWidth: 1280 }).renderAsync();
    return (await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 })).uri;
  } catch (error) {
    console.warn('[scan] Couldn’t compress the photo; uploading the original', error);
    return uri;
  }
}

async function uploadToImageKit(uri: string, auth: UploadAuthResponse) {
  const fileName = `meal-${Date.now()}.jpg`;
  const form = new FormData();
  if (Platform.OS === 'web') {
    // On web the image is a blob/data URI rather than a file path.
    form.append('file', await (await fetch(uri)).blob(), fileName);
  } else {
    // Expo's fetch (the global `fetch` on iOS/Android in this SDK) can't send React Native's `{ uri, name, type }`
    // form parts ("Unsupported FormDataPart implementation"); an expo-file-system File streams its bytes.
    form.append('file', new File(uri) as unknown as Blob);
  }
  form.append('fileName', fileName);
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  form.append('folder', auth.folder);
  form.append('useUniqueFileName', 'true');
  form.append('isPrivateFile', 'true');

  const response = await fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', body: form });
  const body = (await response.json().catch(() => null)) as { fileId?: string; filePath?: string; message?: string } | null;
  if (!response.ok || !body?.fileId || !body.filePath) {
    throw new ImageKitUploadError(body?.message ?? `ImageKit returned ${response.status}`);
  }
  return { fileId: body.fileId, filePath: body.filePath };
}

/** A specific, user-facing message for whatever went wrong while submitting a scan. */
export function scanErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    try {
      const { error: message } = JSON.parse(error.message) as { error?: string };
      if (message) return message; // e.g. the daily scan limit
    } catch {}
    return `Our server had a problem (${error.status}). Please try again.`;
  }
  if (error instanceof ImageKitUploadError) return `Photo upload failed: ${error.message}`;
  // fetch() rejects with a TypeError ("Network request failed") when the request never got a response.
  if (error instanceof TypeError) return 'Can’t reach the server. Check your connection and try again.';
  return 'Something went wrong while sending your photo. Please try again.';
}

/**
 * Photo → compressed JPEG → private ImageKit upload → `POST /api/meals` (pending meal + `analyze-meal` run).
 * The new meal is added to today's list straight away so Home shows the "Analyzing…" card.
 */
export function useScanMeal(onStep?: (step: ScanStep) => void) {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoUri: string) => {
      let step: ScanStep = 'preparing';
      const advance = (next: ScanStep) => {
        step = next;
        onStep?.(next);
      };
      try {
        advance('preparing');
        const now = new Date();
        const [compressedUri, auth] = await Promise.all([
          compress(photoUri),
          apiFetch<UploadAuthResponse>('/api/uploads/imagekit-auth', { method: 'POST' }),
        ]);
        advance('uploading');
        const uploaded = await uploadToImageKit(compressedUri, auth);
        advance('saving');
        return await apiFetch<CreateMealResponse>('/api/meals', {
          method: 'POST',
          body: JSON.stringify({ ...uploaded, localDate: toLocalDate(now), eatenAt: now.toISOString() }),
        });
      } catch (error) {
        // Shows up in the Metro terminal with the step it failed at.
        console.error(`[scan] Failed while ${step}:`, error);
        throw error;
      }
    },
    onSuccess: ({ meal }) => {
      queryClient.setQueryData<MealsResponse>(['meals', meal.localDate], (old) => ({
        meals: [meal, ...(old?.meals ?? []).filter((m) => m.id !== meal.id)],
      }));
    },
  });
}
