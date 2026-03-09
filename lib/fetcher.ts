import * as cheerio from 'cheerio';

const DEFAULT_TIMEOUT_MS = 15000;
const MIN_CONTENT_LENGTH = 500;
const RETRY_DELAY_MS = 5000;
const MAX_ATTEMPTS = 3;

// --- Structured fetch result types ---

export type FetchFailureReason =
  | 'http_error'
  | 'timeout'
  | 'network_error'
  | 'content_too_short'
  | 'spa_not_supported';

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

// --- Shared HTML extraction & cleaning ---

async function extractAndClean(response: Response): Promise<string> {
  const html = await response.text();
  const $ = cheerio.load(html);

  // --- Phase 1: Remove non-content elements via Cheerio ---

  $('script, style, nav, footer, header, aside').remove();

  // Tracking pixels: 1x1 images, hidden iframes, noscript blocks
  $('noscript').remove();
  $('img').each((_, el) => {
    const $el = $(el);
    const w = $el.attr('width');
    const h = $el.attr('height');
    if ((w === '1' || w === '0') && (h === '1' || h === '0')) $el.remove();
  });
  $('iframe[width="0"], iframe[height="0"], iframe[style*="display:none"], iframe[style*="display: none"]').remove();

  // Elements with tracking/beacon/pixel in id, class, or src attributes
  $('[id*="tracking"], [id*="beacon"], [id*="pixel"]').remove();
  $('[class*="tracking"], [class*="beacon"], [class*="pixel"]').remove();
  $('[src*="tracking"], [src*="beacon"], [src*="pixel"]').remove();

  const content = $('main, article, .content, .legal, .terms, body')
    .first()
    .text();

  // --- Phase 2: Strip dynamic strings from extracted text ---

  const cleaned = content
    // UUIDs — Azure trace IDs, request IDs (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    // ISO timestamps — 2026-02-08T18:07:23.456Z or with offset
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})/g, '')
    // Long hex strings (20+ chars) — session tokens, CSRF tokens, content hashes
    .replace(/\b[0-9a-f]{20,}\b/gi, '')
    // URL query strings with session data (3+ params, likely tracking)
    .replace(/\?(?:[^?\s]*&){2,}[^?\s]*/g, '')
    // Collapse whitespace left behind by stripping
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  return cleaned;
}

// --- Original throwing fetch (preserved for backward compatibility) ---

export async function fetchTosContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TOSMonitor/1.0)',
      // Force English to prevent Google/Azure language rotation on each request
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return extractAndClean(response);
}

// --- Non-throwing structured fetch (single attempt) ---

export async function fetchTosContentSafe(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TOSMonitor/1.0)',
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

    const cleaned = await extractAndClean(response);

    if (cleaned.length < MIN_CONTENT_LENGTH) {
      return {
        ok: false,
        reason: 'content_too_short',
        httpStatus: 200,
        contentLength: cleaned.length,
        errorMessage: `Content too short (${cleaned.length} chars, minimum ${MIN_CONTENT_LENGTH})`,
      };
    }

    return { ok: true, content: cleaned, httpStatus: 200 };
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

// --- Fetch with retry (up to 3 attempts, 5s delay) ---

function isRetryableFailure(failure: FetchFailure): boolean {
  // Retry on transient failures only
  if (failure.reason === 'timeout' || failure.reason === 'network_error') return true;
  // Retry on rate limit (429) and server errors (5xx)
  if (failure.reason === 'http_error' && failure.httpStatus !== null) {
    return failure.httpStatus === 429 || failure.httpStatus >= 500;
  }
  // Don't retry content_too_short or 4xx (except 429) — deterministic
  return false;
}

export async function fetchWithRetry(url: string): Promise<FetchResult> {
  let lastResult: FetchResult | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await fetchTosContentSafe(url);

    if (result.ok) return result;

    lastResult = result;

    if (!isRetryableFailure(result) || attempt === MAX_ATTEMPTS) break;

    console.log(`[fetcher] Retry ${attempt}/${MAX_ATTEMPTS - 1} for ${url} (${result.reason}), waiting ${RETRY_DELAY_MS}ms...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }

  return lastResult!;
}

// --- Effective date extraction ---

/**
 * Extract document effective/update date from content header.
 * Looks for common patterns in the first 500 characters.
 */
export function extractEffectiveDate(content: string): string | null {
  const header = content.slice(0, 500);

  const patterns = [
    /(?:last\s+(?:updated|modified|revised))\s*[:–—-]?\s*([A-Za-z]+ \d{1,2},? \d{4})/i,
    /(?:effective\s+(?:date|as\s+of))\s*[:–—-]?\s*([A-Za-z]+ \d{1,2},? \d{4})/i,
    /(?:updated\s+on)\s*[:–—-]?\s*([A-Za-z]+ \d{1,2},? \d{4})/i,
    /(?:revised)\s*[:–—-]?\s*([A-Za-z]+ \d{1,2},? \d{4})/i,
    /(?:last\s+(?:updated|modified|revised))\s*[:–—-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(?:effective\s+(?:date|as\s+of))\s*[:–—-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = header.match(pattern);
    if (match?.[1]) {
      const dateStr = match[1].trim();
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return dateStr;
    }
  }

  return null;
}
