import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Spotlight topics — add/remove as needed
// Each entry: { label, keywords (checked against title + summary), accentColor }
const SPOTLIGHT_TOPICS = [
  {
    label: 'OpenClaw Watch',
    keywords: ['openclaw', 'clawdbot', 'moltbot', 'open claw', 'claw bot'],
    accentColor: 'purple',
  },
];

export async function GET() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch articles from last 3 days, ordered by heat_score
  const { data: articles, error } = await supabase
    .from('intel_items')
    .select('*')
    .gte('pub_date', threeDaysAgo)
    .order('heat_score', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[quick-hits] Query error:', error);
    return NextResponse.json({ spotlight: null, quickHits: [] });
  }

  const items = articles || [];

  // --- Spotlight: find the best match for each spotlight topic ---
  let spotlight = null;

  for (const topic of SPOTLIGHT_TOPICS) {
    const match = items.find(item => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      return topic.keywords.some(kw => text.includes(kw));
    });

    if (match) {
      spotlight = {
        label: topic.label,
        accentColor: topic.accentColor,
        article: match,
      };
      break; // only one spotlight at a time
    }
  }

  // --- Quick Hits: top 7, excluding the spotlight article ---
  const spotlightId = spotlight?.article?.id;
  const quickHits = items
    .filter(item => item.id !== spotlightId)
    .slice(0, 7);

  return NextResponse.json({ spotlight, quickHits });
}
