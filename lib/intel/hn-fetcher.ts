import { RawFeedItem } from './types';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

export async function fetchHackerNews(): Promise<RawFeedItem[]> {
  try {
    const res = await fetch(`${HN_API}/topstories.json`);
    const ids: number[] = await res.json();

    const stories = await Promise.all(
      ids.slice(0, 50).map(async (id) => {
        const r = await fetch(`${HN_API}/item/${id}.json`);
        return r.json();
      })
    );

    return stories
      .filter((s) => s?.url)
      .map((s) => ({
        title: s.title,
        link: s.url,
        description: `HN score: ${s.score} · ${s.descendants || 0} comments`,
        pubDate: new Date(s.time * 1000).toISOString(),
        source: 'Hacker News',
        sourceUrl: `https://news.ycombinator.com/item?id=${s.id}`,
        pillarHint: 'market_shift' as const,
      }));
  } catch {
    return [];
  }
}
