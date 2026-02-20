// Intel store — adapted to Supabase (no Prisma needed)
//
// Supabase table: intel_items
//
// CREATE TABLE intel_items (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   title       TEXT NOT NULL,
//   link        TEXT UNIQUE NOT NULL,
//   description TEXT NOT NULL DEFAULT '',
//   pub_date    TIMESTAMPTZ NOT NULL,
//   source      TEXT NOT NULL,
//   pillar      TEXT NOT NULL,
//   severity    TEXT NOT NULL,
//   relevance   INT NOT NULL DEFAULT 0,
//   summary     TEXT NOT NULL DEFAULT '',
//   affected_vendors TEXT[] DEFAULT '{}',
//   tags        TEXT[] DEFAULT '{}',
//   suggested_post TEXT NOT NULL DEFAULT '',
//   created_at  TIMESTAMPTZ DEFAULT now()
// );
//
// CREATE INDEX idx_intel_items_pub_date ON intel_items(pub_date DESC);
// CREATE INDEX idx_intel_items_pillar ON intel_items(pillar);

import { supabase } from '@/lib/supabase';
import { ClassifiedItem } from './types';
import { calculateHeatScore } from './heat-scorer';

/**
 * Check which URLs already exist in the DB.
 * Returns a Set of known URLs — these get SKIPPED before classification.
 */
export async function getKnownUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();

  // Supabase `in` filter has a max of ~1000, batch if needed
  const batchSize = 500;
  const known = new Set<string>();

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const { data } = await supabase
      .from('intel_items')
      .select('link')
      .in('link', batch);

    if (data) {
      for (const row of data) {
        known.add(row.link);
      }
    }
  }

  return known;
}

/** Store new classified items. Returns count stored. */
export async function storeItems(items: ClassifiedItem[]): Promise<number> {
  if (items.length === 0) return 0;

  const rows = items.map((item) => ({
    title: item.title,
    link: item.link,
    description: item.description,
    pub_date: new Date(item.pubDate).toISOString(),
    source: item.source,
    pillar: item.pillar,
    severity: item.severity,
    relevance: item.relevance,
    summary: item.summary,
    affected_vendors: item.affectedVendors,
    tags: item.tags,
    suggested_post: item.suggestedPost,
    hn_points: item.hn_points || 0,
    hn_comments: item.hn_comments || 0,
    heat_score: calculateHeatScore({
      relevance: item.relevance,
      pubDate: item.pubDate,
      hn_points: item.hn_points,
      hn_comments: item.hn_comments,
    }),
  }));

  // Use upsert with onConflict to skip duplicates silently
  const { data, error } = await supabase
    .from('intel_items')
    .upsert(rows, { onConflict: 'link', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('[intel] Store error:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Update scanner-detected intel items.
 * Called after each TOS check cycle that detected changes.
 * Shows top 2 most severe non-noise changes from past 7 days.
 */
export async function updateScannerIntelItems(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const FALLBACK_SUMMARY = 'Policy change detected. Review the document for details.';

  const { data: changes } = await supabase
    .from('changes')
    .select('*, vendors(name), documents(doc_type, url)')
    .eq('is_noise', false)
    .neq('analysis_failed', true)
    .gte('detected_at', cutoff)
    .order('detected_at', { ascending: false });

  // Filter out any remaining fallback text (covers older records without analysis_failed flag)
  const analyzed = (changes || []).filter(
    (c) => c.summary && c.summary !== FALLBACK_SUMMARY
  );

  if (analyzed.length === 0) {
    // No properly analyzed changes this week — clear old scanner items
    await supabase.from('intel_items').delete().eq('source', 'scanner');
    return 0;
  }

  // Sort by severity (critical > high > medium > low) then recency
  const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...analyzed].sort((a, b) => {
    const aPri = priorityOrder[a.risk_priority || 'low'] || 0;
    const bPri = priorityOrder[b.risk_priority || 'low'] || 0;
    if (bPri !== aPri) return bPri - aPri;
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
  });

  const top2 = sorted.slice(0, 2);
  const totalCount = analyzed.length;

  // Map risk_priority to intel severity
  const severityMap: Record<string, string> = {
    critical: 'critical',
    high: 'warning',
    medium: 'notice',
    low: 'stable',
  };

  // Delete existing scanner items
  await supabase.from('intel_items').delete().eq('source', 'scanner');

  const rows = top2.map((change, idx) => ({
    title: change.summary || 'Policy change detected',
    link: `${change.documents?.url || 'https://stackdrift.app'}#stackdrift-${change.id}`,
    description: change.impact || '',
    pub_date: change.detected_at,
    source: 'scanner',
    pillar: 'policy_watch',
    severity: severityMap[change.risk_priority || 'low'] || 'notice',
    relevance: 95 - idx,
    summary: change.impact || change.summary || '',
    affected_vendors: [change.vendors?.name || 'Unknown'],
    tags: change.categories || [],
    suggested_post: String(totalCount),
    heat_score: 100 - idx,
  }));

  const { error } = await supabase.from('intel_items').insert(rows);

  if (error) {
    console.error('[intel] Scanner items store error:', error.message);
    return 0;
  }

  console.log(`[intel] Updated scanner intel items: ${rows.length} items (${totalCount} total changes this week)`);
  return rows.length;
}

/** Get the count of non-noise changes from the past 7 days. */
export async function getWeeklyChangeCount(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('changes')
    .select('*', { count: 'exact', head: true })
    .eq('is_noise', false)
    .gte('detected_at', cutoff);
  return count || 0;
}

/** Get feed items for the briefing page. */
export async function getFeed(options: {
  pillar?: string;
  limit?: number;
  hoursBack?: number;
}) {
  const { pillar, limit = 20, hoursBack = 72 } = options;
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('intel_items')
    .select('*')
    .gte('pub_date', cutoff)
    .order('relevance', { ascending: false })
    .order('pub_date', { ascending: false })
    .limit(limit);

  if (pillar && pillar !== 'all') {
    query = query.eq('pillar', pillar);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[intel] Feed query error:', error.message);
    return [];
  }

  return data || [];
}
