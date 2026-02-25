import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const PILLAR_LABELS: Record<string, string> = {
  policy_watch: 'Policy Watch',
  build: 'Build',
  business: 'Business',
  ai_tools: 'AI & Tools',
  growth: 'Growth',
  ideas_trends: 'Ideas & Trends',
  regulatory_intel: 'Regulatory',
  market_shift: 'Market',
};

export async function GET(request: NextRequest) {
  // Auth — same pattern as /api/intel/ingest
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since = sevenDaysAgo.toISOString();

  // ── Fetch intel items from the last 7 days ──
  const { data: intelItems, error: intelError } = await supabase
    .from('intel_items')
    .select('*')
    .gte('pub_date', since)
    .order('heat_score', { ascending: false });

  if (intelError) {
    return NextResponse.json(
      { error: 'Failed to fetch intel items', detail: intelError.message },
      { status: 500 }
    );
  }

  const items = intelItems || [];

  // Separate scanner detections from feed items
  const scannerDetections = items.filter((i) => i.source === 'scanner');
  const feedItems = items.filter((i) => i.source !== 'scanner');

  // Top 10 stories by heat_score (already sorted)
  const topStories = feedItems.slice(0, 10);

  // Group by pillar
  const byPillar: Record<string, typeof feedItems> = {};
  for (const item of feedItems) {
    const pillar = item.pillar || 'uncategorized';
    if (!byPillar[pillar]) byPillar[pillar] = [];
    byPillar[pillar].push(item);
  }

  // Add pillar labels for readability
  const byPillarLabeled: Record<string, { label: string; items: typeof feedItems }> = {};
  for (const [key, pillarItems] of Object.entries(byPillar)) {
    byPillarLabeled[key] = {
      label: PILLAR_LABELS[key] || key,
      items: pillarItems,
    };
  }

  // ── Fetch vendor changes from the last 7 days ──
  const { data: changes, error: changesError } = await supabase
    .from('changes')
    .select(`
      id,
      summary,
      impact,
      action,
      risk_level,
      risk_priority,
      risk_bucket,
      categories,
      detected_at,
      is_noise,
      vendors ( name, slug ),
      documents ( doc_type, url )
    `)
    .gte('detected_at', since)
    .eq('is_noise', false)
    .order('detected_at', { ascending: false });

  if (changesError) {
    return NextResponse.json(
      { error: 'Failed to fetch vendor changes', detail: changesError.message },
      { status: 500 }
    );
  }

  // Flatten joined vendor/document data
  const vendorChanges = (changes || []).map((c: any) => ({
    id: c.id,
    vendor_name: c.vendors?.name || null,
    vendor_slug: c.vendors?.slug || null,
    doc_type: c.documents?.doc_type || null,
    doc_url: c.documents?.url || null,
    summary: c.summary,
    impact: c.impact,
    action: c.action,
    risk_level: c.risk_level,
    risk_priority: c.risk_priority,
    risk_bucket: c.risk_bucket,
    categories: c.categories,
    detected_at: c.detected_at,
  }));

  return NextResponse.json({
    generated_at: now.toISOString(),
    window: { from: since, to: now.toISOString() },
    intel: {
      total_items: feedItems.length,
      top_stories: topStories,
      by_pillar: byPillarLabeled,
      scanner_detections: scannerDetections,
    },
    vendor_changes: vendorChanges,
  });
}
