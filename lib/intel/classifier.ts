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

  const prompt = `Classify news items for "Drift Intel", a weekly newsletter for indie developers and SaaS builders who depend on third-party platforms and AI tools.

Tracked vendors: ${trackedVendors.join(', ')}

Content pillars — assign the BEST matching pillar:
- policy_watch: TOS changes, privacy updates, legal/regulatory actions, compliance news
- build: Dev tools, frameworks, launches, SDKs, platforms, DX improvements, new features
- business: Revenue, funding, pricing changes, market moves, acquisitions, layoffs
- ai_tools: AI models, APIs, agents, prompting techniques, AI companies, model releases
- growth: Marketing, SEO, distribution, community building, launch tactics, retention
- ideas_trends: Market gaps, SaaS ideas, niche opportunities, product teardowns, build-in-public stories, trend analysis
- regulatory_intel: Government regulation, enforcement actions, new laws, antitrust
- market_shift: General market/tech news that doesn't fit above categories

For each item, respond with a JSON array. Each object:
{"idx":N,"pillar":"<pillar>","severity":"critical"|"warning"|"notice","relevance":0-100,"summary":"1 sentence for newsletter readers","vendors":["slug"],"tags":["tag"],"tweet":"under 250 chars with {{link}}","relevant":true|false}

Relevance guide for indie devs:
- 70-100: Directly affects their stack, revenue, or business (vendor pricing change, tool launch, AI model release)
- 40-69: Useful context (industry trend, competitor move, growth tactic)
- 0-39: Too general or not actionable — mark relevant:false

Mark relevant:true only if relevance>=40. Be selective but broader than just TOS — anything an indie dev building on these platforms would want to know.

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
        hn_points: orig.hn_points,
        hn_comments: orig.hn_comments,
      };
    }).filter(Boolean) as ClassifiedItem[];
  } catch (err) {
    console.error('[intel] Classification failed:', err);
    return [];
  }
}
