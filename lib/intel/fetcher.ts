import Parser from 'rss-parser';
import { ALL_FEEDS, FeedSource } from './sources';
import { RawFeedItem } from './types';

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Watchdog/1.0' },
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchSingleFeed(source: FeedSource): Promise<RawFeedItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).map((item) => ({
      title: item.title?.trim() || '',
      link: item.link || '',
      description: stripHtml(item.contentSnippet || item.content || '').slice(0, 400),
      pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
      source: source.name,
      sourceUrl: source.url,
      pillarHint: source.pillar,
    }));
  } catch {
    console.warn(`[intel] Feed failed: ${source.name}`);
    return [];
  }
}

export async function fetchRecentItems(hours: number = 8): Promise<RawFeedItem[]> {
  const results = await Promise.allSettled(
    ALL_FEEDS.map((s) => fetchSingleFeed(s))
  );

  const seenUrls = new Set<string>();
  const items: RawFeedItem[] = [];
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      if (!item.link || seenUrls.has(item.link)) continue;
      if (new Date(item.pubDate).getTime() < cutoff) continue;
      seenUrls.add(item.link);
      items.push(item);
    }
  }

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return items;
}
