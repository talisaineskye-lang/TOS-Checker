import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_log')
    .select('id, user_id, action, detail, ip_address, created_at', { count: 'exact' })
    .eq('user_id', gate.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) {
    query = query.eq('action', action);
  }
  if (since) {
    query = query.gte('created_at', since);
  }
  if (until) {
    query = query.lte('created_at', until);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    entries: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
