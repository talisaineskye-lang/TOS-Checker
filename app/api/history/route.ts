import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get('vendor');
  const severity = searchParams.get('severity');
  const docType = searchParams.get('doc_type');
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  const search = searchParams.get('q');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('changes')
    .select('id, vendor_id, document_id, summary, impact, action, risk_level, risk_priority, risk_bucket, categories, detected_at, notified, is_noise, old_snapshot_id, new_snapshot_id, vendors(name, logo_url), documents(doc_type, url)', { count: 'exact' })
    .eq('is_noise', false)
    .order('detected_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (vendor) {
    query = query.eq('vendor_id', vendor);
  }
  if (severity) {
    query = query.eq('risk_priority', severity);
  }
  if (docType) {
    query = query.eq('documents.doc_type', docType);
  }
  if (since) {
    query = query.gte('detected_at', since);
  }
  if (until) {
    query = query.lte('detected_at', until);
  }
  if (search) {
    query = query.or(`summary.ilike.%${search}%,impact.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    changes: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
