import * as cheerio from 'cheerio';

const DEFAULT_TIMEOUT_MS = 15000;

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
