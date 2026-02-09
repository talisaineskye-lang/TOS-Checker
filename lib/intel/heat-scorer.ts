/**
 * Heat Scorer for Quick Hits
 *
 * Combines three signals into a single 0–100 score:
 *   - Relevance (40%): The existing Haiku relevance score
 *   - Freshness (30%): How recently the article was published
 *   - Engagement (30%): HN points + comments (if available)
 *
 * Only articles from the last 3 days are eligible.
 */

interface HeatInput {
  relevance: number;      // 0–100, from Haiku classifier
  pubDate: string;        // ISO date string
  hn_points?: number;     // from HN fetcher, if available
  hn_comments?: number;   // from HN fetcher, if available
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Calculate freshness score (0–100).
 * - Published in last 6 hours = 100
 * - Published 1 day ago = ~70
 * - Published 2 days ago = ~40
 * - Published 3 days ago = ~10
 * - Older than 3 days = 0
 */
function freshness(pubDate: string): number {
  const ageMs = Date.now() - new Date(pubDate).getTime();

  if (ageMs > THREE_DAYS_MS) return 0;

  const score = Math.round(100 * (1 - ageMs / THREE_DAYS_MS));
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate engagement score (0–100).
 * Based on HN points + comments. Articles without HN data
 * get a baseline score of 30 so they aren't penalized.
 *
 * Thresholds (roughly):
 * - 500+ points = 100
 * - 200 points = ~75
 * - 50 points = ~50
 * - 0 points (but has HN data) = 10
 * - No HN data at all = 30 (neutral baseline)
 */
function engagement(hnPoints?: number, hnComments?: number): number {
  if (hnPoints === undefined && hnComments === undefined) return 30;

  const points = hnPoints || 0;
  const comments = hnComments || 0;

  const combined = points + (comments * 2);

  if (combined <= 0) return 10;
  const score = Math.round(20 * Math.log10(combined + 1));
  return Math.max(10, Math.min(100, score));
}

/**
 * Calculate the final heat score (0–100).
 */
export function calculateHeatScore(input: HeatInput): number {
  const f = freshness(input.pubDate);
  const e = engagement(input.hn_points, input.hn_comments);
  const r = Math.min(100, Math.max(0, input.relevance));

  const heat = Math.round(
    (r * 0.4) + (f * 0.3) + (e * 0.3)
  );

  return Math.max(0, Math.min(100, heat));
}

/**
 * Batch calculate heat scores for an array of articles.
 * Returns the same array with heat_score added.
 */
export function scoreArticles<T extends HeatInput>(articles: T[]): (T & { heat_score: number })[] {
  return articles.map(article => ({
    ...article,
    heat_score: calculateHeatScore(article),
  }));
}
