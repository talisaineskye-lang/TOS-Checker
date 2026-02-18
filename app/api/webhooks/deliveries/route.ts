import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const webhookId = new URL(request.url).searchParams.get('webhook_id');
  if (!webhookId) {
    return NextResponse.json({ error: 'webhook_id is required' }, { status: 400 });
  }

  // Verify ownership
  const { data: webhook } = await supabase
    .from('user_webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('user_id', gate.userId)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const { data } = await supabase
    .from('webhook_deliveries')
    .select('id, status_code, response_body, attempted_at')
    .eq('webhook_id', webhookId)
    .order('attempted_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ deliveries: data ?? [] });
}
