import Anthropic from '@anthropic-ai/sdk';
import { RawFeedItem, ClassifiedItem, ContentPillar, Severity } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Classify items using Claude Haiku — the cheapest model.
 * Batches into chunks of 20 to keep prompts small.
 */
export async function classifyBatch(
  items: RawFeedItem[],
  trackedVendors: string[],
): Promise<ClassifiedItem[]> {
  if (items.length === 0) return [];

  const allClassified: ClassifiedItem[] = [];
  const batchSize = 20;

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const classified = await classifyChunk(chunk, trackedVendors);
    allClassified.push(...classified);
  }

  return allClassified.filter((item) => item.isRelevant);
}

async function classifyChunk(
  items: RawFeedItem[],
  trackedVendors: string[],
): Promise<ClassifiedItem[]> {
  const itemsList = items.map((item, idx) =>
    `[${idx}] "${item.title}" (${item.source}) — ${item.description.slice(0, 150)}`
  ).join('\n');

  const prompt = `Classify news items for a vendor monitoring tool.
Tracked vendors: ${trackedVendors.join(', ')}

For each item, respond with a JSON array. Each object:
{"idx":N,"pillar":"regulatory_intel"|"market_shift","severity":"critical"|"warning"|"notice","relevance":0-100,"summary":"1 sentence","vendors":["slug"],"tags":["tag"],"tweet":"under 250 chars with {{link}}","relevant":true|false}

Mark relevant:true only if relevance>=40. Be strict — skip general tech news.
JSON only, no markdown.

${itemsList}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const cleaned = text.replace(/```json\s?/g, '').replace(/```/g, '').trim();
    const results = JSON.parse(cleaned) as Array<{
      idx: number;
      pillar: ContentPillar;
      severity: Severity;
      relevance: number;
      summary: string;
      vendors: string[];
      tags: string[];
      tweet: string;
      relevant: boolean;
    }>;

    return results.map((r) => {
      const orig = items[r.idx];
      if (!orig) return null;
      return {
        title: orig.title,
        link: orig.link,
        description: orig.description,
        pubDate: orig.pubDate,
        source: orig.source,
        pillar: r.pillar,
        severity: r.severity,
        relevance: r.relevance,
        summary: r.summary,
        affectedVendors: r.vendors || [],
        tags: r.tags || [],
        suggestedPost: (r.tweet || '').replace('{{link}}', orig.link),
        isRelevant: r.relevant,
      };
    }).filter(Boolean) as ClassifiedItem[];
  } catch (err) {
    console.error('[intel] Classification failed:', err);
    return [];
  }
}
