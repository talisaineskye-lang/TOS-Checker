import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchRecentItems } from '@/lib/intel/fetcher';
import { fetchHackerNews } from '@/lib/intel/hn-fetcher';
import { prefilterItems } from '@/lib/intel/prefilter';
import { classifyBatch } from '@/lib/intel/classifier';
import { getKnownUrls, storeItems } from '@/lib/intel/store';
import { calculateHeatScore } from '@/lib/intel/heat-scorer';
import { requireAdmin } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  const log: string[] = [];
  const t0 = Date.now();

  try {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('slug')
      .eq('is_active', true);

    const trackedVendors = (vendors || [])
      .map((v) => v.slug)
      .filter(Boolean) as string[];

    const [rssItems, hnItems] = await Promise.all([
      fetchRecentItems(8),
      fetchHackerNews(),
    ]);
    const allRaw = [...rssItems, ...hnItems];
    log.push(`Fetched: ${allRaw.length} raw items`);

    if (allRaw.length === 0) {
      return NextResponse.json({ log, cost: '$0.00', duration: `${Date.now() - t0}ms`, stored: 0 });
    }

    const urls = allRaw.map((i) => i.link);
    const knownUrls = await getKnownUrls(urls);
    const newItems = allRaw.filter((i) => !knownUrls.has(i.link));
    log.push(`New (not in DB): ${newItems.length}`);

    if (newItems.length === 0) {
      log.push('Nothing new — skipping classification');
      return NextResponse.json({ log, cost: '$0.00', duration: `${Date.now() - t0}ms`, stored: 0 });
    }

    const candidates = prefilterItems(newItems);
    log.push(`After keyword filter: ${candidates.length}`);

    if (candidates.length === 0) {
      log.push('No candidates passed keyword filter — skipping Claude');
      return NextResponse.json({ log, cost: '$0.00', duration: `${Date.now() - t0}ms`, stored: 0 });
    }

    const classified = await classifyBatch(candidates, trackedVendors);
    const apiCalls = Math.ceil(candidates.length / 20);
    const estimatedCost = (apiCalls * 0.002).toFixed(4);
    log.push(`Classified: ${classified.length} relevant (${apiCalls} API call${apiCalls > 1 ? 's' : ''}, ~$${estimatedCost})`);

    const stored = await storeItems(classified);
    log.push(`Stored: ${stored} new items`);

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentItems } = await supabase
      .from('intel_items')
      .select('id, relevance, pub_date, hn_points, hn_comments')
      .gte('pub_date', threeDaysAgo);

    if (recentItems && recentItems.length > 0) {
      for (const item of recentItems) {
        const heat = calculateHeatScore({
          relevance: item.relevance,
          pubDate: item.pub_date,
          hn_points: item.hn_points,
          hn_comments: item.hn_comments,
        });
        await supabase
          .from('intel_items')
          .update({ heat_score: heat })
          .eq('id', item.id);
      }
      log.push(`Recalculated heat scores for ${recentItems.length} recent items`);
    }

    return NextResponse.json({
      log,
      cost: `~$${estimatedCost}`,
      duration: `${Date.now() - t0}ms`,
      stored,
    });
  } catch (err) {
    console.error('[admin/trigger-ingest] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', log },
      { status: 500 }
    );
  }
}
