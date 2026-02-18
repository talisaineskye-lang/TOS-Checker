import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { logAuditEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// GET - get the user's team (or null)
export async function GET() {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  // Check if user owns a team
  const { data: ownedTeam } = await supabase
    .from('teams')
    .select('id, name, created_at')
    .eq('owner_id', gate.userId)
    .single();

  if (ownedTeam) {
    const { data: members } = await supabase
      .from('team_members')
      .select('id, user_id, email, role, status, invited_at, joined_at')
      .eq('team_id', ownedTeam.id)
      .order('invited_at', { ascending: true });

    return NextResponse.json({
      team: ownedTeam,
      members: members ?? [],
      role: 'owner',
    });
  }

  // Check if user is a member of a team
  const { data: membership } = await supabase
    .from('team_members')
    .select('id, team_id, role, status, teams(id, name, owner_id, created_at)')
    .eq('user_id', gate.userId)
    .eq('status', 'active')
    .single();

  if (membership) {
    const { data: members } = await supabase
      .from('team_members')
      .select('id, user_id, email, role, status, invited_at, joined_at')
      .eq('team_id', membership.team_id)
      .order('invited_at', { ascending: true });

    return NextResponse.json({
      team: membership.teams,
      members: members ?? [],
      role: membership.role,
    });
  }

  return NextResponse.json({ team: null, members: [], role: null });
}

// POST - create a team
export async function POST(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { name } = await request.json();

  // Check if user already owns a team
  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', gate.userId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You already have a team' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('teams')
    .insert({
      owner_id: gate.userId,
      name: name || 'My Team',
    })
    .select('id, name, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'settings.update', `Created team "${name || 'My Team'}"`);
  return NextResponse.json({ team: data });
}
