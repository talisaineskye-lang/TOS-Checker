import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('service_id');
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

  let query = supabase
    .from('changes')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (serviceId) {
    query = query.eq('service_id', serviceId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ changes: data ?? [] });
}
