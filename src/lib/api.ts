import { useAuth } from '@clerk/expo';
import { useCallback } from 'react';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * `fetch` for our own API routes with the Clerk session token attached. Relative paths resolve to the
 * dev server in development and to the expo-router `origin` in production builds.
 */
export function useApiFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken();
      const response = await fetch(path, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init?.headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new ApiError(response.status, await response.text());
      return (await response.json()) as T;
    },
    [getToken]
  );
}
