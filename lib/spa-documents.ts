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
 * Check if a document URL is a known SPA page.
 */
export function isSpaDocument(url: string): boolean {
  return SPA_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}
