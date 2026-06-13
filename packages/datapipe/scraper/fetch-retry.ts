import { scheduler } from "node:timers/promises";

export interface FetchRetryOptions {
  /** Total attempts including the first one. Default: 3. */
  attempts?: number;
  /** Delay before the first retry; doubles per retry. Default: 500 ms. */
  baseDelayMs?: number;
  /** Injectable fetch for tests. */
  fetchFn?: typeof fetch;
  /** Injectable sleep for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const isRetryableStatus = (status: number): boolean =>
  status >= 500 || status === 429;

/**
 * fetch with retry + exponential backoff for transient failures (network
 * errors, 5xx, 429). Non-retryable responses (2xx–4xx except 429) are
 * returned as-is so callers keep their existing `response.ok` handling.
 * After exhausting attempts the last response is returned, or the last
 * network error is thrown.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const fetchFn = options.fetchFn ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => scheduler.wait(ms));

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetchFn(url, init);
    } catch (error) {
      lastError = error;
    }

    if (response && !isRetryableStatus(response.status)) {
      return response;
    }

    if (attempt === attempts) {
      if (response) return response;
      throw lastError;
    }

    const reason = response
      ? `HTTP ${response.status}`
      : String((lastError as Error)?.message ?? lastError);
    console.warn(
      `⚠️  Fetch failed (${reason}), retrying ${attempt}/${attempts - 1}: ${url}`,
    );
    await sleep(baseDelayMs * 2 ** (attempt - 1));
  }

  throw lastError;
}
