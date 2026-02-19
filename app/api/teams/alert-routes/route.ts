import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { logAuditEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// GET — list team alert routes
export async function GET() {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', gate.userId)
    .single();

  if (!team) {
    // Check if member
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', gate.userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json({ routes: [] });
    }

    const { data } = await supabase
      .from('team_alert_routes')
      .select('*')
      .eq('team_id', membership.team_id)
      .eq('active', true)
      .order('created_at', { ascending: true });

    return NextResponse.json({ routes: data ?? [] });
  }

  const { data } = await supabase
    .from('team_alert_routes')
    .select('*')
    .eq('team_id', team.id)
    .eq('active', true)
    .order('created_at', { ascending: true });

  return NextResponse.json({ routes: data ?? [] });
}

// POST — add a new alert route
export async function POST(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { email, severity_filter, vendor_filter } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  // Must own a team
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', gate.userId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'Only the team owner can manage alert routes' }, { status: 403 });
  }

  // Check limit (max 5)
  const { count } = await supabase
    .from('team_alert_routes')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', team.id)
    .eq('active', true);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 shared alert routes allowed' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('team_alert_routes')
    .insert({
      team_id: team.id,
      email: email.toLowerCase(),
      severity_filter: severity_filter || 'all',
      vendor_filter: vendor_filter || 'all',
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'settings.update', `Added alert route: ${email}`);
  return NextResponse.json({ route: data });
}

// DELETE — remove an alert route
export async function DELETE(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { id } = await request.json();

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', gate.userId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'Only the team owner can manage alert routes' }, { status: 403 });
  }

  const { error } = await supabase
    .from('team_alert_routes')
    .update({ active: false })
    .eq('id', id)
    .eq('team_id', team.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'settings.update', `Removed alert route ${id}`);
  return NextResponse.json({ success: true });
}
