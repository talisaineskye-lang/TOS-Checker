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
  const since = searchParams.get('since');
  const until = searchParams.get('until');

  let query = supabase
    .from('audit_log')
    .select('id, action, detail, ip_address, created_at')
    .eq('user_id', gate.userId)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (since) {
    query = query.gte('created_at', since);
  }
  if (until) {
    query = query.lte('created_at', until);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const csvHeader = 'Timestamp,Action,Detail,IP Address';
  const csvRows = rows.map((r) => {
    const ts = new Date(r.created_at).toISOString();
    const detail = (r.detail || '').replace(/"/g, '""');
    const ip = r.ip_address || '';
    return `${ts},"${r.action}","${detail}","${ip}"`;
  });

  const csv = [csvHeader, ...csvRows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="stackdrift-audit-log-${Date.now()}.csv"`,
    },
  });
}
