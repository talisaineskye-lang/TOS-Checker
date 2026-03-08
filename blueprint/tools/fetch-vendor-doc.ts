/**
 * fetch-vendor-doc.ts — Fetch a vendor's document URL with retry logic.
 *
 * Extracted from StackDrift production engine (lib/fetcher.ts).
 *
 * Safeguards implemented:
 * - 15-second timeout per request
 * - Up to 3 retry attempts with 5-second delay
 * - Only retries on transient errors: timeout, network errors, 429, 5xx
 * - Does NOT retry on content_too_short or client errors (4xx except 429)
 * - Returns structured result (never throws)
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 5_000;
const MAX_ATTEMPTS = 3;

export type FetchFailureReason =
  | 'http_error'
  | 'timeout'
  | 'network_error'
  | 'content_too_short';

export interface FetchSuccess {
  ok: true;
  content: string;
  httpStatus: 200;
}

export interface FetchFailure {
  ok: false;
  reason: FetchFailureReason;
  httpStatus: number | null;
  contentLength: number | null;
  errorMessage: string;
}

export type FetchResult = FetchSuccess | FetchFailure;

/**
 * Fetch a single URL with timeout. Returns structured result, never throws.
 */
async function fetchSafe(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StackDriftAgent/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        ok: false,
        reason: 'http_error',
        httpStatus: response.status,
        contentLength: null,
        errorMessage: `HTTP ${response.status} from ${url}`,
      };
    }

    // Return raw HTML — cleaning happens in clean-content.ts
    const html = await response.text();

    return { ok: true, content: html, httpStatus: 200 };
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        reason: 'timeout',
        httpStatus: null,
        contentLength: null,
        errorMessage: `Timeout after ${DEFAULT_TIMEOUT_MS}ms fetching ${url}`,
      };
    }

    return {
      ok: false,
      reason: 'network_error',
      httpStatus: null,
      contentLength: null,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

function isRetryableFailure(failure: FetchFailure): boolean {
  if (failure.reason === 'timeout' || failure.reason === 'network_error') return true;
  if (failure.reason === 'http_error' && failure.httpStatus !== null) {
    return failure.httpStatus === 429 || failure.httpStatus >= 500;
  }
  return false;
}

/**
 * Fetch a vendor document URL with retry logic.
 *
 * - Up to 3 attempts, 5-second delay between retries
 * - Only retries on transient errors (429, 5xx, timeout, network)
 * - Returns raw HTML on success — pass to cleanContent() next
 */
export async function fetchVendorDoc(url: string): Promise<FetchResult> {
  let lastResult: FetchResult | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await fetchSafe(url);

    if (result.ok) return result;

    lastResult = result;

    if (!isRetryableFailure(result) || attempt === MAX_ATTEMPTS) break;

    console.log(`[fetch] Retry ${attempt}/${MAX_ATTEMPTS - 1} for ${url} (${result.reason}), waiting ${RETRY_DELAY_MS}ms...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }

  return lastResult!;
}
