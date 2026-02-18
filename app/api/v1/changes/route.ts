import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * Public JSON API — authenticated via API key (not session).
 * GET /api/v1/changes?vendor=Stripe&severity=critical&since=2026-01-01&limit=20
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'API key required. Use Authorization: Bearer <key>' }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Look up the API key
  const { data: keyRecord } = await supabase
    .from('user_api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .single();

  if (!keyRecord) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Update last_used_at
  await supabase
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id);

  // Get user's watched vendor IDs
  const { data: userVendors } = await supabase
    .from('user_vendors')
    .select('vendor_id')
    .eq('user_id', keyRecord.user_id);

  const vendorIds = (userVendors ?? []).map((uv) => uv.vendor_id);

  if (vendorIds.length === 0) {
    return NextResponse.json({ changes: [] });
  }

  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get('vendor');
  const severity = searchParams.get('severity');
  const since = searchParams.get('since');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  let query = supabase
    .from('changes')
    .select('id, summary, impact, action, risk_level, risk_priority, risk_bucket, categories, detected_at, vendors(name), documents(doc_type, url)')
    .in('vendor_id', vendorIds)
    .eq('is_noise', false)
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (severity) {
    query = query.eq('risk_priority', severity);
  }
  if (since) {
    query = query.gte('detected_at', since);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by vendor name if provided (case-insensitive)
  let results = data ?? [];
  if (vendor) {
    const vendorLower = vendor.toLowerCase();
    results = results.filter((c: Record<string, unknown>) => {
      const v = c.vendors as { name: string } | null;
      return v?.name?.toLowerCase().includes(vendorLower);
    });
  }

  // Map to clean API response
  const changes = results.map((c: Record<string, unknown>) => {
    const v = c.vendors as { name: string } | null;
    const d = c.documents as { doc_type: string; url: string } | null;
    return {
      id: c.id,
      vendor: v?.name || 'Unknown',
      document_type: d?.doc_type || 'unknown',
      document_url: d?.url || null,
      severity: c.risk_priority,
      risk_bucket: c.risk_bucket,
      summary: c.summary,
      impact: c.impact,
      action: c.action,
      tags: c.categories || [],
      detected_at: c.detected_at,
    };
  });

  return NextResponse.json({ changes });
}
