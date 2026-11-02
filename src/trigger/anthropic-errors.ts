import Anthropic from '@anthropic-ai/sdk';

/**
 * True when Anthropic rejected the request itself — invalid key, no credit, unknown model, bad request
 * (any 4xx except 429). Retrying can't help; rate limits, 5xx and network errors are transient and are
 * retried by the SDK and Trigger.dev instead.
 */
export function isAnthropicSetupError(error: unknown): error is InstanceType<typeof Anthropic.APIError> {
  return (
    error instanceof Anthropic.APIError &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 429
  );
}
