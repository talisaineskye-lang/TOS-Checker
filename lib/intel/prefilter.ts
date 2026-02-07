import { RawFeedItem } from './types';

// Keywords that signal relevance — if title or description contains
// ANY of these, the item passes through to classification.
const RELEVANCE_KEYWORDS = [
  // Vendor names (tracked stack)
  'stripe', 'paypal', 'openai', 'anthropic', 'aws', 'amazon web services',
  'google cloud', 'cloudflare', 'vercel', 'netlify', 'azure', 'github',
  'hugging face', 'square', 'wise', 'gumroad', 'paddle',

  // TOS / legal signals
  'terms of service', 'privacy policy', 'acceptable use', 'tos update',
  'terms update', 'policy change', 'policy update', 'legal update',
  'data processing', 'data sharing', 'data retention', 'liability',
  'indemnif',

  // Regulatory signals
  'gdpr', 'ai act', 'eu ai', 'ftc', 'section 230', 'ccpa', 'cpra',
  'data protection', 'data sovereignty', 'privacy regulation',
  'regulatory', 'compliance', 'antitrust', 'dma', 'dsa',
  'consent', 'enforcement', 'fine', 'penalty',

  // Market signals
  'acqui', 'merger', 'outage', 'downtime', 'incident',
  'pricing change', 'price increase', 'price hike',
  'deprecat', 'api change', 'breaking change', 'rate limit',
  'funding round', 'series a', 'series b', 'series c',
  'ipo', 'layoff', 'restructur',
];

// Keywords that signal IRRELEVANCE — if a title contains these
// AND no relevance keywords, skip it.
const NOISE_KEYWORDS = [
  'tutorial', 'how to build', 'beginner guide', 'css trick',
  'review:', 'unboxing', 'best laptop', 'smartphone',
  'recipe', 'fitness', 'celebrity',
];

/**
 * Fast local keyword filter. Returns only items likely to be relevant.
 * Runs BEFORE Claude — saving money on every irrelevant item.
 */
export function prefilterItems(items: RawFeedItem[]): RawFeedItem[] {
  return items.filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();

    const hasRelevance = RELEVANCE_KEYWORDS.some((kw) => text.includes(kw));
    const hasNoise = NOISE_KEYWORDS.some((kw) => text.includes(kw));

    // Pass if: has relevance keyword, or is from a regulatory feed
    if (hasRelevance) return true;
    if (item.pillarHint === 'regulatory_intel') return true;

    // Block if: noise keyword and no relevance
    if (hasNoise) return false;

    // For vendor blog feeds, always pass (infrequent posts, usually signal)
    if (item.source.includes('Blog') || item.source.includes('Changelog')) return true;

    // Default: skip
    return false;
  });
}
