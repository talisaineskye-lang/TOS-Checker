import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { logAuditEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// GET - get user's Slack integration
export async function GET() {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { data } = await supabase
    .from('user_integrations')
    .select('id, config_json, active, created_at')
    .eq('user_id', gate.userId)
    .eq('type', 'slack')
    .single();

  return NextResponse.json({ integration: data ?? null });
}

// POST - create or update Slack integration
export async function POST(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { webhook_url, channel, severity_filter, active } = await request.json();

  if (!webhook_url || typeof webhook_url !== 'string') {
    return NextResponse.json({ error: 'webhook_url is required' }, { status: 400 });
  }

  const config = {
    webhook_url,
    channel: channel || '',
    severity_filter: severity_filter || ['critical', 'warning', 'notice'],
  };

  // Upsert — check if integration already exists
  const { data: existing } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', gate.userId)
    .eq('type', 'slack')
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('user_integrations')
      .update({ config_json: config, active: active ?? true })
      .eq('id', existing.id)
      .select('id, config_json, active, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ integration: data });
  }

  const { data, error } = await supabase
    .from('user_integrations')
    .insert({
      user_id: gate.userId,
      type: 'slack',
      config_json: config,
      active: active ?? true,
    })
    .select('id, config_json, active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'slack.connect', 'Connected Slack integration');
  return NextResponse.json({ integration: data });
}

// DELETE - remove Slack integration
export async function DELETE() {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', gate.userId)
    .eq('type', 'slack');

  await logAuditEvent(gate.userId, 'slack.disconnect', 'Disconnected Slack integration');
  return NextResponse.json({ success: true });
}
