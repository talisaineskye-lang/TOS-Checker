/**
 * clean-content.ts — Two-stage HTML cleaning for vendor policy documents.
 *
 * Extracted from StackDrift production engine (lib/fetcher.ts → extractAndClean).
 *
 * This two-stage approach prevents false positives from dynamic page content:
 *
 * Stage 1 (Cheerio / DOM):
 *   Remove non-content elements: scripts, styles, nav, footer, header, aside,
 *   noscript, tracking pixels (1x1 images), hidden iframes, and elements with
 *   tracking/beacon/pixel in their id, class, or src attributes.
 *   Then extract text from the first match of: main, article, .content, .legal, .terms, body.
 *
 * Stage 2 (Regex):
 *   Strip dynamic strings that change between fetches but don't represent
 *   actual policy changes: UUIDs, ISO timestamps, long hex tokens (session IDs,
 *   CSRF tokens), and URL query strings with 3+ parameters (tracking params).
 *   Collapse leftover whitespace.
 *
 * Content floor: Returns failure if cleaned text is < 500 characters.
 */

import * as cheerio from 'cheerio';

const MIN_CONTENT_LENGTH = 500;

export interface CleanSuccess {
  ok: true;
  content: string;
  contentLength: number;
}

export interface CleanFailure {
  ok: false;
  reason: 'content_too_short';
  contentLength: number;
  errorMessage: string;
}

export type CleanResult = CleanSuccess | CleanFailure;

/**
 * Clean raw HTML and extract meaningful text content.
 *
 * @param html - Raw HTML string from fetchVendorDoc
 * @returns Cleaned text content or a content_too_short failure
 */
export function cleanContent(html: string): CleanResult {
  const $ = cheerio.load(html);

  // --- Stage 1: Remove non-content elements via Cheerio ---

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

  const rawText = $('main, article, [role="main"], .content, .legal, .legal-content, .policy-content, .terms, .terms-content, .prose, .page-content, body')
    .first()
    .text();

  // --- Stage 2: Strip dynamic strings from extracted text ---

  const cleaned = rawText
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

  // Content floor: minimum 500 characters required
  if (cleaned.length < MIN_CONTENT_LENGTH) {
    return {
      ok: false,
      reason: 'content_too_short',
      contentLength: cleaned.length,
      errorMessage: `Content too short (${cleaned.length} chars, minimum ${MIN_CONTENT_LENGTH})`,
    };
  }

  return {
    ok: true,
    content: cleaned,
    contentLength: cleaned.length,
  };
}
