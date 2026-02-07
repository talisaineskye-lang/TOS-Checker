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
