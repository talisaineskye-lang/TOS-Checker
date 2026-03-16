/**
 * Known SPA/JS-rendered document URLs that cannot be fetched with a standard HTTP client.
 * These pages return HTTP 200 but render content client-side, resulting in empty or
 * near-empty text extraction.
 *
 * When headless browser support is added, these documents can be migrated to use it.
 * Until then, they are skipped during scans and logged as 'spa_not_supported'.
 */

// Match by URL prefix — if a document URL starts with any of these, it's SPA
export const SPA_URL_PREFIXES: string[] = [
  'https://bolt.new/',
  'https://gumroad.com/',
  'https://bubble.io/',
];

/**
 * Known vendors that actively block automated HTTP fetches (403 on all URL paths).
 * These are skipped during scans and logged as 'spa_not_supported' until the vendor
 * opens up or an alternative fetch strategy is available.
 *
 * Last verified: 2026-03-16 — all perplexity.ai paths return 403 regardless of URL.
 */
export const BLOCKED_URL_PREFIXES: string[] = [
  'https://www.perplexity.ai/',
  'https://perplexity.ai/',
];

/**
 * Check if a document URL is a known SPA page.
 */
export function isSpaDocument(url: string): boolean {
  return (
    SPA_URL_PREFIXES.some((prefix) => url.startsWith(prefix)) ||
    BLOCKED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))
  );
}
