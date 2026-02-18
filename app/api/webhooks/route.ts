import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { getPlanLimits } from '@/lib/plan-gates';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

export const runtime = 'nodejs';

// GET - list user's webhooks
export async function GET() {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { data } = await supabase
    .from('user_webhooks')
    .select('id, url, events_filter, active, created_at')
    .eq('user_id', gate.userId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ webhooks: data ?? [] });
}

// POST - create a new webhook
export async function POST(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { url, events_filter } = await request.json();

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Check limit
  const limits = getPlanLimits(gate.plan);
  const { count } = await supabase
    .from('user_webhooks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', gate.userId);

  if ((count ?? 0) >= limits.webhooks) {
    return NextResponse.json(
      { error: `You can have up to ${limits.webhooks} webhooks on the ${gate.plan} plan` },
      { status: 403 }
    );
  }

  const secret = crypto.randomBytes(32).toString('hex');

  const { data, error } = await supabase
    .from('user_webhooks')
    .insert({
      user_id: gate.userId,
      url,
      events_filter: events_filter || 'all',
      secret,
      active: true,
    })
    .select('id, url, events_filter, secret, active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'webhook.create', `Created webhook for ${url}`);
  return NextResponse.json({ webhook: data });
}

// DELETE - remove a webhook
export async function DELETE(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { id } = await request.json();

  const { error } = await supabase
    .from('user_webhooks')
    .delete()
    .eq('id', id)
    .eq('user_id', gate.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'webhook.delete', `Deleted webhook ${id}`);
  return NextResponse.json({ success: true });
}
